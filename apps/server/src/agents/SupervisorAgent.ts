/**
 * Supervisorエージェント
 * ユーザーのリクエストを解釈し、適切なエージェントに割り振る
 */

import type { DynamicAgentManager } from '../dynamic/managers/DynamicAgentManager';
import { createAgentManagementTools } from '../dynamic/tools/agentManagementTools';

/**
 * Supervisorエージェントクラス
 *
 * 注意: この実装はVoltAgentフレームワークのAgentクラスを使用する前提です。
 * 実際の使用にはVoltAgentパッケージが必要です。
 */
export class SupervisorAgent {
  private name: string = 'supervisor';
  private instructions: string;
  private tools: any[];
  private memory: any;
  private dynamicAgentManager: DynamicAgentManager | null = null;

  constructor(memory: any, dynamicAgentManager?: DynamicAgentManager) {
    this.memory = memory;
    this.dynamicAgentManager = dynamicAgentManager || null;

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
3. **タスク委譲**: 適切なサブエージェントにタスクを委譲（将来実装）
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
   * エージェント実行（簡易実装）
   */
  async run(task: string, context?: any): Promise<any> {
    console.log(`[Supervisor] Running task: ${task}`);

    // 実際の実装では VoltAgent の Agent.run() を呼び出します
    // const result = await super.run(task, context);

    // 簡易実装: タスクをパースしてツールを呼び出し
    const lowerTask = task.toLowerCase();

    if (lowerTask.includes('エージェント') && lowerTask.includes('一覧')) {
      // エージェント一覧リクエスト
      const tool = this.tools.find((t) => t.name === 'listAgents');
      if (tool) {
        const result = await tool.execute({});
        return {
          output: this.formatAgentList(result),
          toolCalls: [{ name: 'listAgents', result }],
        };
      }
    }

    if (lowerTask.includes('作成') || lowerTask.includes('作って')) {
      // エージェント作成リクエスト
      return {
        output: `エージェントを作成します。以下の情報を教えてください：
1. エージェントID（例: weatherAgent）
2. 表示名（例: Weather Agent）
3. 説明（例: 天気情報を取得するエージェント）
4. 指示（エージェントへのシステムプロンプト）

または、AgentGeneratorエージェントを使用して対話的に作成することもできます。`,
      };
    }

    // デフォルトレスポンス
    return {
      output: `ご要望を承りました。利用可能なエージェント一覧を確認する場合は「エージェント一覧を表示して」とお伝えください。
新しいエージェントを作成する場合は「エージェントを作成したい」とお伝えください。`,
    };
  }

  /**
   * エージェント一覧をフォーマット
   */
  private formatAgentList(result: any): string {
    if (!result.success) {
      return `エージェント一覧の取得に失敗しました: ${result.error}`;
    }

    const agents = result.agents || [];

    if (agents.length === 0) {
      return '現在、利用可能なエージェントはありません。';
    }

    let output = `## 利用可能なエージェント（${agents.length}個）\n\n`;

    for (const agent of agents) {
      output += `### ${agent.displayName} (${agent.id})\n`;
      output += `- **説明**: ${agent.description || '説明なし'}\n`;
      output += `- **タイプ**: ${agent.type === 'dynamic' ? '動的' : '静的'}\n`;
      output += `- **ステータス**: ${agent.status}\n`;
      output += `- **モデル**: ${agent.model}\n`;
      output += `- **ツール数**: ${agent.toolCount}\n\n`;
    }

    return output;
  }

  /**
   * エージェント情報を取得
   */
  getInfo(): any {
    return {
      id: this.name,
      displayName: 'Supervisor Agent',
      description: 'ユーザーのリクエストを解釈し、適切なエージェントに割り振るメインエージェント',
      model: 'openai/gpt-4o',
      tools: this.tools.map((t) => ({
        name: t.name,
        description: t.description,
      })),
      isDynamic: false,
    };
  }
}
