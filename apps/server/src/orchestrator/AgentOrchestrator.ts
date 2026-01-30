/**
 * マルチエージェント・オーケストレーター
 * リクエストを分析して適切なエージェントにタスクを振り分ける
 */

import { LiteLLMService, type LLMMessage, type LLMTool } from '../services/LiteLLMService';
import { DynamicAgentManager } from '../dynamic/managers/DynamicAgentManager';
import { logger } from '../dynamic/utils/logger';
import type { DynamicAgent } from '../dynamic/agents/DynamicAgentCreator';
import { ConversationStateManager } from './ConversationStateManager';
import { AgentProposalService } from '../services/AgentProposalService';
import type { AgentGeneratorAgent } from '../agents/AgentGeneratorAgent';
import type {
  AgentProposal,
  ExtendedOrchestrationResult,
  DEFAULT_PROPOSAL_CONFIG,
} from '../dynamic/types/proposal.types';

/**
 * ルーティング結果
 */
export interface RoutingDecision {
  targetAgentId: string;
  reason: string;
  confidence: number;
  reformulatedTask?: string;
}

/**
 * オーケストレーション結果
 */
export interface OrchestrationResult {
  success: boolean;
  response: string;
  routing: RoutingDecision;
  agentResult?: any;
  error?: string;
  awaitingApproval?: boolean;
  proposalId?: string;
  createdAgent?: {
    agentId: string;
    displayName: string;
  };
}

/**
 * エージェント情報
 */
interface AgentInfo {
  id: string;
  displayName: string;
  description: string;
  capabilities: string[];
  model: string;
}

/**
 * オーケストレーター設定
 */
export interface OrchestratorConfig {
  confidenceThreshold: number;
  autoExecuteAfterCreate: boolean;
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  confidenceThreshold: parseFloat(process.env.PROPOSAL_CONFIDENCE_THRESHOLD || '0.7'),
  autoExecuteAfterCreate: process.env.AUTO_EXECUTE_AFTER_CREATE !== 'false',
};

/**
 * マルチエージェント・オーケストレーター
 */
export class AgentOrchestrator {
  private llmService: LiteLLMService;
  private agentManager: DynamicAgentManager;
  private staticAgents: Map<string, any> = new Map();
  private routerModel: string;
  private conversationHistory: LLMMessage[] = [];

  // 動的エージェント生成関連
  private stateManager: ConversationStateManager;
  private proposalService: AgentProposalService;
  private agentGenerator: AgentGeneratorAgent | null = null;
  private config: OrchestratorConfig;

  constructor(
    agentManager: DynamicAgentManager,
    llmService?: LiteLLMService,
    routerModel?: string,
    config?: Partial<OrchestratorConfig>
  ) {
    this.agentManager = agentManager;
    this.llmService = llmService || LiteLLMService.getInstance();
    this.routerModel = routerModel || process.env.ORCHESTRATOR_MODEL || 'gpt-4o';
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 状態管理と提案サービスの初期化
    this.stateManager = new ConversationStateManager();
    this.proposalService = new AgentProposalService(this.llmService, {
      confidenceThreshold: this.config.confidenceThreshold,
      autoExecuteAfterCreate: this.config.autoExecuteAfterCreate,
    });
  }

  /**
   * AgentGeneratorAgentを設定
   */
  setAgentGenerator(generator: AgentGeneratorAgent): void {
    this.agentGenerator = generator;
    logger.info('AgentGenerator set for orchestrator');
  }

  /**
   * 静的エージェントを登録
   */
  registerStaticAgent(id: string, agent: any): void {
    this.staticAgents.set(id, agent);
    logger.info('Static agent registered', { agentId: id });
  }

  /**
   * ユーザーリクエストを処理
   */
  async processRequest(userMessage: string, sessionId?: string): Promise<OrchestrationResult> {
    const effectiveSessionId = sessionId || 'default';
    logger.info('Processing request', {
      message: userMessage.substring(0, 100),
      sessionId: effectiveSessionId,
    });

    try {
      // 1. 承認待ち状態かチェック
      const pendingProposal = this.stateManager.getPendingProposal(effectiveSessionId);

      if (pendingProposal) {
        return await this.handleProposalResponse(userMessage, pendingProposal, effectiveSessionId);
      }

      // 2. 利用可能なエージェント一覧を取得
      const availableAgents = await this.getAvailableAgents();

      if (availableAgents.length === 0) {
        // エージェントがない場合は提案フローへ
        return await this.handleNoAgentsAvailable(userMessage, effectiveSessionId);
      }

      // 3. ルーティング決定
      const routing = await this.decideRouting(userMessage, availableAgents);

      logger.info('Routing decision', {
        targetAgent: routing.targetAgentId,
        confidence: routing.confidence,
        reason: routing.reason,
      });

      // 4. confidence が閾値未満の場合は提案フローへ
      // （orchestrator指定でもconfidenceが低い場合は提案フローに入る）
      if (routing.confidence < this.config.confidenceThreshold) {
        return await this.handleLowConfidence(userMessage, routing, effectiveSessionId);
      }

      // 5. 自己処理（orchestrator自身で回答）の場合
      // （confidence >= threshold の一般的な質問のみ）
      if (routing.targetAgentId === 'orchestrator') {
        const directResponse = await this.handleDirectResponse(userMessage, availableAgents);
        return {
          success: true,
          response: directResponse,
          routing,
        };
      }

      // 6. 対象エージェントを取得
      const targetAgent = await this.getAgent(routing.targetAgentId);

      if (!targetAgent) {
        return {
          success: false,
          response: `エージェント「${routing.targetAgentId}」が見つかりませんでした。`,
          routing,
          error: 'Agent not found',
        };
      }

      // 7. エージェントを実行
      const task = routing.reformulatedTask || userMessage;
      const agentResult = await targetAgent.run(task);

      // 8. 結果を返す
      return {
        success: true,
        response: agentResult.output,
        routing,
        agentResult,
      };
    } catch (error: any) {
      logger.error('Orchestration failed', { error: error.message });
      return {
        success: false,
        response: `処理中にエラーが発生しました: ${error.message}`,
        routing: {
          targetAgentId: 'error',
          reason: error.message,
          confidence: 0,
        },
        error: error.message,
      };
    }
  }

  /**
   * 提案応答を処理
   */
  private async handleProposalResponse(
    userMessage: string,
    proposal: AgentProposal,
    sessionId: string
  ): Promise<OrchestrationResult> {
    // 承認判定
    if (this.proposalService.isApprovalMessage(userMessage)) {
      return await this.executeProposal(proposal, sessionId);
    }

    // 拒否判定
    if (this.proposalService.isRejectionMessage(userMessage)) {
      this.stateManager.clearPendingProposal(sessionId);
      return {
        success: true,
        response: 'わかりました。他にお手伝いできることはありますか？',
        routing: {
          targetAgentId: 'orchestrator',
          reason: 'User rejected proposal',
          confidence: 1.0,
        },
      };
    }

    // それ以外は提案を再表示
    const proposalMessage = this.proposalService.formatProposalMessage(proposal);
    return {
      success: true,
      response: `まだ提案に回答いただいていません。\n\n${proposalMessage}`,
      routing: {
        targetAgentId: 'orchestrator',
        reason: 'Awaiting proposal response',
        confidence: 1.0,
      },
      awaitingApproval: true,
      proposalId: proposal.id,
    };
  }

  /**
   * 提案を実行（エージェント作成）
   */
  private async executeProposal(
    proposal: AgentProposal,
    sessionId: string
  ): Promise<OrchestrationResult> {
    logger.info('Executing proposal', {
      proposalId: proposal.id,
      agentId: proposal.suggestedAgent.agentId,
    });

    try {
      // AgentGeneratorAgentを使用してエージェントを作成
      let agent: any;

      if (this.agentGenerator) {
        agent = await this.agentGenerator.generateFromProposal(proposal);
      } else {
        // AgentGeneratorがない場合は直接DynamicAgentManagerを使用
        agent = await this.agentManager.createAgent({
          agentId: proposal.suggestedAgent.agentId,
          displayName: proposal.suggestedAgent.displayName,
          description: proposal.suggestedAgent.description,
          instructions: proposal.suggestedAgent.instructions,
          model: 'gpt-4o-mini',
          tools: [],
        });
      }

      // 提案状態をクリア
      this.stateManager.clearPendingProposal(sessionId);

      let response = `✅ **${proposal.suggestedAgent.displayName}** を作成しました。\n\n`;

      // 元のリクエストを新エージェントで処理
      if (this.config.autoExecuteAfterCreate && agent) {
        logger.info('Auto-executing original request with new agent', {
          agentId: proposal.suggestedAgent.agentId,
          originalRequest: proposal.originalRequest.substring(0, 100),
        });

        try {
          const result = await agent.run(proposal.originalRequest);
          response += `📝 **元のリクエストの処理結果:**\n\n${result.output}`;
        } catch (execError: any) {
          logger.error('Failed to execute with new agent', { error: execError.message });
          response += `⚠️ 元のリクエストの処理中にエラーが発生しました: ${execError.message}\n`;
          response += `新しいリクエストをお試しください。`;
        }
      } else {
        response += `このエージェントで何をお手伝いしましょうか？`;
      }

      return {
        success: true,
        response,
        routing: {
          targetAgentId: proposal.suggestedAgent.agentId,
          reason: 'Agent created from proposal',
          confidence: 1.0,
        },
        createdAgent: {
          agentId: proposal.suggestedAgent.agentId,
          displayName: proposal.suggestedAgent.displayName,
        },
      };
    } catch (error: any) {
      logger.error('Failed to execute proposal', { error: error.message });
      this.stateManager.clearPendingProposal(sessionId);

      return {
        success: false,
        response: `エージェントの作成に失敗しました: ${error.message}`,
        routing: {
          targetAgentId: 'error',
          reason: error.message,
          confidence: 0,
        },
        error: error.message,
      };
    }
  }

  /**
   * エージェントがない場合の処理
   */
  private async handleNoAgentsAvailable(
    userMessage: string,
    sessionId: string
  ): Promise<OrchestrationResult> {
    const proposal = await this.proposalService.createProposal({
      userMessage,
      availableAgents: [],
    });

    this.stateManager.setPendingProposal(sessionId, proposal);

    const proposalMessage = this.proposalService.formatProposalMessage(proposal);

    return {
      success: true,
      response: `利用可能なエージェントがありません。\n\n${proposalMessage}`,
      routing: {
        targetAgentId: 'orchestrator',
        reason: 'No agents available, proposing new agent',
        confidence: 0,
      },
      awaitingApproval: true,
      proposalId: proposal.id,
    };
  }

  /**
   * 低confidence時の処理（提案フロー）
   */
  private async handleLowConfidence(
    userMessage: string,
    routing: RoutingDecision,
    sessionId: string
  ): Promise<OrchestrationResult> {
    logger.info('Low confidence routing, proposing new agent', {
      confidence: routing.confidence,
      threshold: this.config.confidenceThreshold,
    });

    const availableAgents = await this.getAvailableAgents();

    const proposal = await this.proposalService.createProposal({
      userMessage,
      availableAgents: availableAgents.map((a) => ({
        id: a.id,
        displayName: a.displayName,
        description: a.description,
      })),
    });

    this.stateManager.setPendingProposal(sessionId, proposal);

    const proposalMessage = this.proposalService.formatProposalMessage(proposal);

    return {
      success: true,
      response: proposalMessage,
      routing: {
        ...routing,
        reason: `Low confidence (${routing.confidence.toFixed(2)} < ${this.config.confidenceThreshold})`,
      },
      awaitingApproval: true,
      proposalId: proposal.id,
    };
  }

  /**
   * ルーティング決定（LLMを使用）
   */
  private async decideRouting(
    userMessage: string,
    agents: AgentInfo[]
  ): Promise<RoutingDecision> {
    const agentDescriptions = agents
      .map((a) => `- **${a.id}** (${a.displayName}): ${a.description}`)
      .join('\n');

    const systemPrompt = `あなたはマルチエージェントシステムのルーターです。
ユーザーのリクエストを分析し、最適なエージェントを選択してください。

## 利用可能なエージェント
${agentDescriptions}

## 特別なルーティング
- "orchestrator": 一般的な質問やエージェント一覧の確認など、特定のエージェントが不要な場合

## 出力形式（JSONで出力）
{
  "targetAgentId": "選択したエージェントのID",
  "reason": "選択理由",
  "confidence": 0.0-1.0の信頼度,
  "reformulatedTask": "エージェントに渡すタスク（必要に応じて再構成）"
}

## confidence（信頼度）の基準
- 1.0: リクエストがエージェントの能力に完全に一致
- 0.8-0.9: リクエストがエージェントの能力にほぼ一致
- 0.6-0.7: リクエストがエージェントの能力に部分的に一致
- 0.3-0.5: リクエストがエージェントの能力に関連はあるが不十分
- 0.0-0.2: 適切なエージェントがない

JSONのみを出力してください。`;

    const response = await this.llmService.generateText(
      userMessage,
      systemPrompt,
      { model: this.routerModel, temperature: 0.3 }
    );

    try {
      // JSONを抽出（コードブロックがある場合も対応）
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const decision = JSON.parse(jsonMatch[0]);

      return {
        targetAgentId: decision.targetAgentId || 'orchestrator',
        reason: decision.reason || 'Unknown',
        confidence: decision.confidence || 0.5,
        reformulatedTask: decision.reformulatedTask,
      };
    } catch (error) {
      logger.warn('Failed to parse routing decision, using default', {
        response: response.substring(0, 200),
      });

      // デフォルト: orchestrator自身で処理
      return {
        targetAgentId: 'orchestrator',
        reason: 'Failed to parse routing decision',
        confidence: 0.3,
      };
    }
  }

  /**
   * オーケストレーター自身で直接回答
   */
  private async handleDirectResponse(
    userMessage: string,
    agents: AgentInfo[]
  ): Promise<string> {
    const agentList = agents
      .map((a) => `- **${a.displayName}** (${a.id}): ${a.description}`)
      .join('\n');

    const systemPrompt = `あなたはマルチエージェントシステムのオーケストレーターです。
ユーザーの質問に答えてください。

## 利用可能なエージェント
${agentList}

ユーザーの質問が特定のタスク実行を求めている場合は、適切なエージェントを推薦してください。`;

    return await this.llmService.generateText(
      userMessage,
      systemPrompt,
      { model: this.routerModel }
    );
  }

  /**
   * 利用可能なエージェント一覧を取得
   */
  private async getAvailableAgents(): Promise<AgentInfo[]> {
    const agents: AgentInfo[] = [];

    // 静的エージェント
    for (const [id, agent] of this.staticAgents) {
      const info = agent.getInfo?.() || {};
      agents.push({
        id,
        displayName: info.displayName || id,
        description: info.description || '',
        capabilities: info.tools?.map((t: any) => t.name) || [],
        model: info.model || 'unknown',
      });
    }

    // 動的エージェント
    const dynamicAgents = this.agentManager.getAllAgents();
    for (const agent of dynamicAgents) {
      const info = agent.getInfo?.() || {};
      agents.push({
        id: info.id || agent.name,
        displayName: info.displayName || agent.name,
        description: info.description || '',
        capabilities: info.tools?.map((t: any) => t.name) || [],
        model: info.model || agent.model || 'unknown',
      });
    }

    return agents;
  }

  /**
   * エージェントを取得
   */
  private async getAgent(agentId: string): Promise<DynamicAgent | any | null> {
    // 静的エージェントをチェック
    if (this.staticAgents.has(agentId)) {
      return this.staticAgents.get(agentId);
    }

    // 動的エージェントをチェック
    return this.agentManager.getAgent(agentId);
  }

  /**
   * 複数エージェントで並列実行
   */
  async runParallel(
    tasks: Array<{ agentId: string; task: string }>
  ): Promise<Array<{ agentId: string; result: any; error?: string }>> {
    const results = await Promise.all(
      tasks.map(async ({ agentId, task }) => {
        try {
          const agent = await this.getAgent(agentId);
          if (!agent) {
            return { agentId, result: null, error: 'Agent not found' };
          }
          const result = await agent.run(task);
          return { agentId, result };
        } catch (error: any) {
          return { agentId, result: null, error: error.message };
        }
      })
    );

    return results;
  }

  /**
   * 複数エージェントでシーケンシャル実行（パイプライン）
   */
  async runPipeline(
    pipeline: Array<{
      agentId: string;
      taskTemplate: string;
      inputFrom?: string; // 前のステップの結果を使用
    }>,
    initialInput?: string
  ): Promise<{ steps: any[]; finalOutput: string }> {
    const steps: any[] = [];
    let currentInput = initialInput || '';

    for (const step of pipeline) {
      const agent = await this.getAgent(step.agentId);
      if (!agent) {
        throw new Error(`Pipeline agent not found: ${step.agentId}`);
      }

      // タスクを構築（テンプレートに前の結果を埋め込み）
      const task = step.taskTemplate.replace('{{input}}', currentInput);

      const result = await agent.run(task);
      steps.push({
        agentId: step.agentId,
        task,
        result,
      });

      currentInput = result.output;
    }

    return {
      steps,
      finalOutput: currentInput,
    };
  }

  /**
   * 会話履歴をクリア
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * セッション状態をクリア
   */
  clearSessionState(sessionId: string): void {
    this.stateManager.clearPendingProposal(sessionId);
  }

  /**
   * 設定を取得
   */
  getConfig(): {
    routerModel: string;
    staticAgentCount: number;
    confidenceThreshold: number;
    autoExecuteAfterCreate: boolean;
  } {
    return {
      routerModel: this.routerModel,
      staticAgentCount: this.staticAgents.size,
      confidenceThreshold: this.config.confidenceThreshold,
      autoExecuteAfterCreate: this.config.autoExecuteAfterCreate,
    };
  }

  /**
   * 状態マネージャーを取得
   */
  getStateManager(): ConversationStateManager {
    return this.stateManager;
  }

  /**
   * 提案サービスを取得
   */
  getProposalService(): AgentProposalService {
    return this.proposalService;
  }
}

export default AgentOrchestrator;
