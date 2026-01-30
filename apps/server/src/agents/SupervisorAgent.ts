/**
 * Supervisorエージェント
 * ユーザーのリクエストを解釈し、適切なエージェントに割り振る
 * LLMを使用してインテリジェントにタスクを処理
 */

import type { DynamicAgentManager } from '../dynamic/managers/DynamicAgentManager';
import { createAgentManagementTools } from '../dynamic/tools/agentManagementTools';
import { LiteLLMService, type LLMMessage, type LLMTool } from '../services/LiteLLMService';
import { logger } from '../dynamic/utils/logger';

/**
 * Supervisorエージェントクラス
 * LLMを使用してユーザーリクエストを処理
 */
export class SupervisorAgent {
  private name: string = 'supervisor';
  private instructions: string;
  private tools: any[];
  private memory: any;
  private dynamicAgentManager: DynamicAgentManager | null = null;
  private llmService: LiteLLMService;
  private model: string;
  private conversationHistory: LLMMessage[] = [];

  constructor(
    memory: any,
    dynamicAgentManager?: DynamicAgentManager,
    llmService?: LiteLLMService,
    model?: string
  ) {
    this.memory = memory;
    this.dynamicAgentManager = dynamicAgentManager || null;
    this.llmService = llmService || LiteLLMService.getInstance();
    this.model = model || process.env.SUPERVISOR_MODEL || 'gpt-4o';

    // エージェント管理ツールを追加
    const managementTools = dynamicAgentManager
      ? createAgentManagementTools(dynamicAgentManager)
      : null;

    this.tools = managementTools
      ? [
          managementTools.listAgentsTool,
          managementTools.getAgentDetailsTool,
          managementTools.createAgentTool,
          managementTools.deleteAgentTool,
          managementTools.searchAgentsTool,
        ]
      : [];

    this.instructions = `あなたはSupervisorエージェントです。
ユーザーのリクエストを分析し、適切なエージェントに割り振る役割を担います。

## 主な責務

1. **リクエスト分析**: ユーザーの要求を理解し、必要なエージェントを特定
2. **エージェント管理**: 利用可能なエージェントの一覧取得、詳細確認
3. **タスク委譲**: 適切なサブエージェントにタスクを委譲
4. **結果統合**: サブエージェントからの結果を統合してユーザーに返す

## 利用可能なツール

### エージェント管理ツール
- **listAgents**: 全エージェントの一覧を取得
- **getAgentDetails**: 特定のエージェントの詳細情報を取得
- **searchAgents**: キーワードでエージェントを検索
- **createAgent**: 新しい動的エージェントを作成
- **deleteAgent**: 動的エージェントを削除

## 使用例

### エージェント一覧の取得
ユーザー: "どんなエージェントが使えますか？"
→ listAgentsツールを使用して一覧を表示

### エージェントの詳細確認
ユーザー: "weatherAgentについて教えて"
→ getAgentDetailsツールを使用して詳細を表示

### エージェントの作成
ユーザー: "天気情報を取得するエージェントを作成して"
→ createAgentツールを使用して新しいエージェントを作成

### エージェントの検索
ユーザー: "Slackに関連するエージェントを探して"
→ searchAgentsツールを使用してキーワード検索

## 応答のガイドライン

1. **明確さ**: ユーザーに分かりやすく説明する
2. **提案**: 適切なエージェントやアクションを提案する
3. **確認**: 重要な操作（削除など）の前に確認を求める
4. **エラーハンドリング**: エラーが発生した場合は原因と解決策を説明する

## 注意事項

- 静的エージェントは削除できません
- エージェント作成時は適切なIDと説明を付けてください
- ツール実行結果は必ずユーザーに分かりやすく伝えてください`;
  }

  /**
   * エージェント実行（LLMを使用）
   */
  async run(task: string, context?: any): Promise<any> {
    logger.info('[Supervisor] Running task', { task: task.substring(0, 100) });

    // メッセージを構築
    const messages: LLMMessage[] = [
      { role: 'system', content: this.instructions },
      ...this.conversationHistory,
      { role: 'user', content: task },
    ];

    // ツールをLLM形式に変換
    const llmTools = this.convertToolsToLLMFormat();

    // ツール実行関数
    const executeToolFn = async (name: string, args: Record<string, any>): Promise<any> => {
      const tool = this.tools.find((t) => t.name === name);
      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }
      return await tool.execute(args);
    };

    try {
      let result: any;

      if (llmTools.length > 0) {
        // ツールがある場合
        const response = await this.llmService.runWithTools(
          messages,
          llmTools,
          executeToolFn,
          { model: this.model }
        );

        result = {
          output: response.response,
          toolCalls: response.toolCalls,
        };
      } else {
        // ツールがない場合
        const response = await this.llmService.generateText(
          task,
          this.instructions,
          { model: this.model }
        );

        result = {
          output: response,
          toolCalls: [],
        };
      }

      // 会話履歴を更新
      this.conversationHistory.push({ role: 'user', content: task });
      this.conversationHistory.push({ role: 'assistant', content: result.output });

      // 履歴が長くなりすぎたら古いものを削除
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      logger.info('[Supervisor] Task completed', {
        outputLength: result.output.length,
        toolCallCount: result.toolCalls.length,
      });

      return result;
    } catch (error: any) {
      logger.error('[Supervisor] Task failed', { error: error.message });
      return {
        output: `エラーが発生しました: ${error.message}`,
        toolCalls: [],
        error: error.message,
      };
    }
  }

  /**
   * タスクを分析して適切なエージェントを推薦
   */
  async analyzeAndRoute(task: string): Promise<{
    recommendation: string;
    targetAgent: string | null;
    confidence: number;
    reasoning: string;
  }> {
    // まずエージェント一覧を取得
    const listTool = this.tools.find((t) => t.name === 'listAgents');
    if (!listTool) {
      return {
        recommendation: 'エージェント管理ツールが利用できません',
        targetAgent: null,
        confidence: 0,
        reasoning: 'No agent management tools available',
      };
    }

    const agentList = await listTool.execute({});
    if (!agentList.success || !agentList.agents || agentList.agents.length === 0) {
      return {
        recommendation: '利用可能なエージェントがありません',
        targetAgent: null,
        confidence: 0,
        reasoning: 'No agents available',
      };
    }

    // LLMでルーティング分析
    const agentDescriptions = agentList.agents
      .map((a: any) => `- ${a.id}: ${a.description || a.displayName}`)
      .join('\n');

    const analysisPrompt = `以下のタスクを実行するのに最適なエージェントを選んでください。

タスク: ${task}

利用可能なエージェント:
${agentDescriptions}

JSON形式で回答してください:
{
  "targetAgent": "エージェントID（該当なしの場合はnull）",
  "confidence": 0.0-1.0,
  "reasoning": "選択理由"
}`;

    const response = await this.llmService.generateText(
      analysisPrompt,
      'あなたはタスクルーターです。JSONのみで回答してください。',
      { model: this.model, temperature: 0.3 }
    );

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found');
      }
      const analysis = JSON.parse(jsonMatch[0]);

      const targetAgent = analysis.targetAgent
        ? agentList.agents.find((a: any) => a.id === analysis.targetAgent)
        : null;

      return {
        recommendation: targetAgent
          ? `「${targetAgent.displayName}」エージェントをお勧めします: ${analysis.reasoning}`
          : `適切なエージェントが見つかりませんでした: ${analysis.reasoning}`,
        targetAgent: analysis.targetAgent,
        confidence: analysis.confidence || 0.5,
        reasoning: analysis.reasoning || '',
      };
    } catch {
      return {
        recommendation: '分析に失敗しました',
        targetAgent: null,
        confidence: 0,
        reasoning: 'Failed to parse analysis result',
      };
    }
  }

  /**
   * ツールをLLM形式に変換
   */
  private convertToolsToLLMFormat(): LLMTool[] {
    return this.tools.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters || {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    }));
  }

  /**
   * 会話履歴をクリア
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * エージェント情報を取得
   */
  getInfo(): any {
    return {
      id: this.name,
      displayName: 'Supervisor Agent',
      description: 'ユーザーのリクエストを解釈し、適切なエージェントに割り振るメインエージェント',
      model: this.model,
      tools: this.tools.map((t) => ({
        name: t.name,
        description: t.description,
      })),
      isDynamic: false,
    };
  }
}
