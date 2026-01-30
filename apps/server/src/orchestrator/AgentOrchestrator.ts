/**
 * マルチエージェント・オーケストレーター
 * リクエストを分析して適切なエージェントにタスクを振り分ける
 */

import { LiteLLMService, type LLMMessage, type LLMTool } from '../services/LiteLLMService';
import { DynamicAgentManager } from '../dynamic/managers/DynamicAgentManager';
import { logger } from '../dynamic/utils/logger';
import type { DynamicAgent } from '../dynamic/agents/DynamicAgentCreator';

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
 * マルチエージェント・オーケストレーター
 */
export class AgentOrchestrator {
  private llmService: LiteLLMService;
  private agentManager: DynamicAgentManager;
  private staticAgents: Map<string, any> = new Map();
  private routerModel: string;
  private conversationHistory: LLMMessage[] = [];

  constructor(
    agentManager: DynamicAgentManager,
    llmService?: LiteLLMService,
    routerModel?: string
  ) {
    this.agentManager = agentManager;
    this.llmService = llmService || LiteLLMService.getInstance();
    this.routerModel = routerModel || process.env.ORCHESTRATOR_MODEL || 'gpt-4o';
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
  async processRequest(userMessage: string): Promise<OrchestrationResult> {
    logger.info('Processing request', { message: userMessage.substring(0, 100) });

    try {
      // 1. 利用可能なエージェント一覧を取得
      const availableAgents = await this.getAvailableAgents();

      if (availableAgents.length === 0) {
        return {
          success: false,
          response: '利用可能なエージェントがありません。先にエージェントを登録してください。',
          routing: {
            targetAgentId: 'none',
            reason: 'No agents available',
            confidence: 0,
          },
        };
      }

      // 2. ルーティング決定
      const routing = await this.decideRouting(userMessage, availableAgents);

      logger.info('Routing decision', {
        targetAgent: routing.targetAgentId,
        confidence: routing.confidence,
        reason: routing.reason,
      });

      // 3. 自己処理（orchestrator自身で回答）の場合
      if (routing.targetAgentId === 'orchestrator') {
        const directResponse = await this.handleDirectResponse(userMessage, availableAgents);
        return {
          success: true,
          response: directResponse,
          routing,
        };
      }

      // 4. 対象エージェントを取得
      const targetAgent = await this.getAgent(routing.targetAgentId);

      if (!targetAgent) {
        return {
          success: false,
          response: `エージェント「${routing.targetAgentId}」が見つかりませんでした。`,
          routing,
          error: 'Agent not found',
        };
      }

      // 5. エージェントを実行
      const task = routing.reformulatedTask || userMessage;
      const agentResult = await targetAgent.run(task);

      // 6. 結果を返す
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
   * 設定を取得
   */
  getConfig(): { routerModel: string; staticAgentCount: number } {
    return {
      routerModel: this.routerModel,
      staticAgentCount: this.staticAgents.size,
    };
  }
}

export default AgentOrchestrator;
