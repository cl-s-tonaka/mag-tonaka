/**
 * AgentGeneratorエージェント
 * 自然言語でエージェント作成を支援
 */

import type { DynamicAgentManager } from '../dynamic/managers/DynamicAgentManager';
import { logger } from '../dynamic/utils/logger';
import type { AgentProposal, ToolSuggestion } from '../dynamic/types/proposal.types';
import type { DynamicToolDefinition, ToolParameter } from '../dynamic/types/dynamicAgent.types';
import { IntegrationRegistry } from '../integrations/IntegrationRegistry';

/**
 * AgentGeneratorエージェントクラス
 *
 * ユーザーとの対話を通じて、新しいエージェントの設計・作成を支援します。
 */
export class AgentGeneratorAgent {
  private name: string = 'agentGenerator';
  private instructions: string;
  private tools: any[];
  private memory: any;
  private dynamicAgentManager: DynamicAgentManager;
  private integrationRegistry: IntegrationRegistry;

  constructor(memory: any, dynamicAgentManager: DynamicAgentManager) {
    this.memory = memory;
    this.dynamicAgentManager = dynamicAgentManager;
    this.integrationRegistry = IntegrationRegistry.getInstance();

    // ツールの定義
    this.tools = [this.createAnalyzeRequirementsTool(), this.createGenerateAgentSpecTool()];

    this.instructions = `あなたはAgentGeneratorエージェントです。
ユーザーとの対話を通じて、新しいエージェントの作成を支援します。

## プロセス

### 1. 要求分析フェーズ
ユーザーから「〇〇するエージェントを作りたい」というリクエストを受けたら、以下を確認：
- エージェントの目的・機能
- 必要なツール（既存 or 新規作成）
- 入力・出力の形式
- 使用するデータソース（API、データベースなど）

### 2. 設計フェーズ
以下の情報を含むエージェント設計書を作成：
- **agentId**: エージェントID（camelCase、例: weatherAgent）
- **displayName**: 表示名（例: Weather Agent）
- **description**: エージェントの説明
- **instructions**: エージェントへのシステムプロンプト
- **model**: 使用するLLMモデル（デフォルト: gpt-4o-mini）
- **tools**: 必要なツール一覧

### 3. 確認フェーズ
設計書をユーザーに提示し、承認を得る：
- エージェントの機能が要求通りか
- 必要な環境変数やAPIキーがあるか
- 期待される動作を説明

### 4. 生成フェーズ
承認後、createAgentツールを使用してエージェントを作成

## 使用例

### 例1: シンプルなエージェント
\`\`\`
ユーザー: 「簡単な計算をするエージェントを作って」

AgentGenerator:
「了解しました。計算エージェントを作成します。

【設計書】
- ID: calculatorAgent
- 名前: Calculator Agent
- 説明: 基本的な算術計算を実行
- ツール: なし（LLMの計算能力を使用）

この設計で作成してよろしいでしょうか？」

ユーザー: 「はい」

AgentGenerator: createAgentツールを実行 → 「作成完了！」
\`\`\`

### 例2: ツール付きエージェント
\`\`\`
ユーザー: 「天気情報を取得するエージェントを作って」

AgentGenerator:
「天気情報エージェントですね。以下を確認させてください：

1. どの天気APIを使用しますか？（OpenWeatherMap、Weather API など）
2. 取得したい情報は？（気温、湿度、予報など）
3. 対象地域は？（日本全国、特定地域など）」

ユーザー: 「OpenWeatherMapを使って、気温と天気を取得したい」

AgentGenerator:
「了解しました。設計書を作成します。

【設計書】
- ID: weatherAgent
- 名前: Weather Agent
- 説明: OpenWeatherMapから天気情報を取得
- ツール:
  - getCurrentWeather: 指定地点の現在の天気を取得
- 必要な環境変数: OPENWEATHERMAP_API_KEY

注意: OpenWeatherMapのAPIキーが必要です。

この設計で作成してよろしいでしょうか？」
\`\`\`

## 注意事項

1. **セキュリティ**: APIキーや認証情報は環境変数で管理
2. **命名規則**: エージェントIDはcamelCase、クラス名はPascalCase
3. **重複チェック**: 既存エージェントと同じIDは使用不可
4. **ツール設計**: 新しいツールが必要な場合は実装方法を説明

## ツールの使用

- **analyzeRequirements**: ユーザーの要求を分析
- **generateAgentSpec**: エージェント設計書を生成
- **createAgent**: エージェントを作成（DynamicAgentManager経由）`;
  }

  /**
   * 要求分析ツール
   */
  private createAnalyzeRequirementsTool(): any {
    return {
      name: 'analyzeRequirements',
      description: 'ユーザーの要求を分析し、必要な情報を抽出します',
      parameters: {
        userRequest: {
          type: 'string',
          description: 'ユーザーのリクエスト',
        },
      },
      execute: async ({ userRequest }: any) => {
        logger.info('Analyzing requirements', { userRequest });

        // 簡易的な分析（実際はLLMで高度な分析を行う）
        const analysis = {
          purpose: this.extractPurpose(userRequest),
          suggestedId: this.generateAgentId(userRequest),
          needsTools: this.checkIfToolsNeeded(userRequest),
          questions: this.generateClarificationQuestions(userRequest),
        };

        return {
          success: true,
          analysis,
        };
      },
    };
  }

  /**
   * エージェント設計書生成ツール
   */
  private createGenerateAgentSpecTool(): any {
    return {
      name: 'generateAgentSpec',
      description: 'エージェント設計書を生成します',
      parameters: {
        purpose: {
          type: 'string',
          description: 'エージェントの目的',
        },
        agentId: {
          type: 'string',
          description: 'エージェントID',
        },
        tools: {
          type: 'array',
          description: '必要なツール',
          optional: true,
        },
      },
      execute: async ({ purpose, agentId, tools = [] }: any) => {
        logger.info('Generating agent spec', { purpose, agentId });

        const spec = {
          agentId,
          displayName: this.generateDisplayName(agentId),
          description: purpose,
          instructions: this.generateInstructions(purpose),
          model: 'openai/gpt-4o-mini',
          tools,
          testExamples: [],
        };

        return {
          success: true,
          spec,
        };
      },
    };
  }

  /**
   * 提案からエージェントを自動生成
   */
  async generateFromProposal(proposal: AgentProposal): Promise<any> {
    logger.info('Generating agent from proposal', {
      proposalId: proposal.id,
      agentId: proposal.suggestedAgent.agentId,
    });

    const { suggestedAgent } = proposal;

    // ツール提案をDynamicToolDefinitionに変換
    const tools: DynamicToolDefinition[] = this.convertToolSuggestions(
      suggestedAgent.suggestedTools || []
    );

    // 統合モジュールなしのツールがあるかチェック
    const hasUnconfiguredTools = this.hasToolsWithoutIntegration(
      suggestedAgent.suggestedTools || []
    );

    // instructionsを構築
    let instructions = suggestedAgent.instructions;

    if (hasUnconfiguredTools) {
      // 統合モジュールがないツールがある場合、フォールバック指示を追加
      instructions += `

注意: このエージェントの一部のツールはリアルタイムデータを取得する機能がありません。
あなたの知識の範囲内で、一般的な情報やアドバイスを提供してください。
リアルタイムデータが必要な質問には、「最新の情報は外部サービスから取得できません」と前置きしてから、
あなたの持つ一般的な知識に基づいて回答してください。`;
    }

    // エージェントを作成
    const agent = await this.dynamicAgentManager.createAgent({
      agentId: suggestedAgent.agentId,
      displayName: suggestedAgent.displayName,
      description: suggestedAgent.description,
      instructions,
      model: 'gpt-4o-mini',
      tools,
      testExamples: [],
    });

    logger.info('Agent generated from proposal', {
      proposalId: proposal.id,
      agentId: suggestedAgent.agentId,
      hasUnconfiguredTools,
    });

    return agent;
  }

  /**
   * 統合モジュールがないツールがあるかチェック
   */
  private hasToolsWithoutIntegration(suggestions: ToolSuggestion[]): boolean {
    for (const suggestion of suggestions) {
      const integrationTool = this.integrationRegistry.getToolByName(suggestion.name);
      if (!integrationTool) {
        return true;
      }
    }
    return false;
  }

  /**
   * ツール名をOpenAI API互換形式にサニタイズ
   */
  private sanitizeToolName(name: string): string {
    // 英数字、アンダースコア、ハイフンのみを許可
    let sanitized = name
      .replace(/[^a-zA-Z0-9_-]/g, '_')  // 不正文字をアンダースコアに置換
      .replace(/_+/g, '_')               // 連続アンダースコアを1つに
      .replace(/^_|_$/g, '');            // 先頭・末尾のアンダースコアを削除

    // 空文字の場合はデフォルト名
    if (!sanitized) {
      sanitized = `tool_${Date.now()}`;
    }

    return sanitized;
  }

  /**
   * ツール提案をDynamicToolDefinitionに変換
   */
  private convertToolSuggestions(suggestions: ToolSuggestion[]): DynamicToolDefinition[] {
    return suggestions.map((suggestion) => {
      const parameters: ToolParameter[] = (suggestion.parameters || []).map((param) => ({
        name: param.name,
        zodType: this.mapTypeToZodType(param.type),
        description: param.description,
        optional: param.optional,
      }));

      // デフォルトの実装を生成
      const implementation = this.generateToolImplementation(suggestion);

      return {
        name: this.sanitizeToolName(suggestion.name),  // サニタイズを適用
        description: suggestion.description,
        parameters,
        implementation,
      };
    });
  }

  /**
   * 型をZod型にマッピング
   */
  private mapTypeToZodType(type: string): 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'array' {
    const typeMap: Record<string, 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'array'> = {
      string: 'string',
      number: 'number',
      boolean: 'boolean',
      enum: 'enum',
      object: 'object',
      array: 'array',
      int: 'number',
      integer: 'number',
      float: 'number',
      bool: 'boolean',
    };

    return typeMap[type.toLowerCase()] || 'string';
  }

  /**
   * ツールのデフォルト実装を生成
   * 統合モジュールがある場合はその実装を使用し、ない場合はフォールバック
   */
  private generateToolImplementation(suggestion: ToolSuggestion): string {
    // 1. 対応する統合モジュールをチェック
    const integrationTool = this.integrationRegistry.getToolByName(suggestion.name);

    if (integrationTool) {
      // 統合モジュールの実装を使用
      logger.info('Using integration tool implementation', {
        toolName: suggestion.name,
      });
      return integrationTool.implementation;
    }

    // 2. 統合モジュールがない場合はフォールバック実装を返す
    logger.info('No integration found for tool, using fallback', {
      toolName: suggestion.name,
    });

    return `
      // このツールは外部APIへの接続が設定されていません。
      // 統合モジュールの設定が必要です。
      logger.warn('Tool ${suggestion.name} requires integration configuration');

      return {
        success: false,
        requiresIntegration: true,
        message: '${suggestion.name}の実行には統合モジュールの設定が必要です。現在、このツールは利用できません。',
        hint: 'LLMの知識の範囲内で回答することをお勧めします。',
      };
    `;
  }

  /**
   * エージェント実行
   */
  async run(task: string, context?: any): Promise<any> {
    logger.info('AgentGenerator running', { task });

    // 実際の実装では VoltAgent の Agent.run() を呼び出します
    const lowerTask = task.toLowerCase();

    if (lowerTask.includes('作成') || lowerTask.includes('作って')) {
      return {
        output: `エージェント作成を開始します。

どのようなエージェントを作成したいですか？
例:
- 「天気情報を取得するエージェント」
- 「Slackのメッセージを分析するエージェント」
- 「データを可視化するエージェント」

エージェントの目的と機能を教えてください。`,
      };
    }

    return {
      output: `AgentGeneratorエージェントです。新しいエージェントの作成を支援します。
「〇〇するエージェントを作成したい」とお伝えください。`,
    };
  }

  /**
   * ユーティリティメソッド
   */
  private extractPurpose(request: string): string {
    // 簡易実装
    return request;
  }

  private generateAgentId(request: string): string {
    // 簡易実装: リクエストからキーワードを抽出してIDを生成
    const keywords = request
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3);

    return keywords.slice(0, 2).join('') + 'Agent';
  }

  private checkIfToolsNeeded(request: string): boolean {
    const toolKeywords = ['api', '取得', 'fetch', 'データ', 'slack', 'github'];
    return toolKeywords.some((keyword) => request.toLowerCase().includes(keyword));
  }

  private generateClarificationQuestions(request: string): string[] {
    return [
      'どのようなデータソースを使用しますか？',
      '入力と出力の形式は何ですか？',
      '特定のAPIやサービスを使用しますか？',
    ];
  }

  private generateDisplayName(agentId: string): string {
    // camelCase → Title Case
    return agentId
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  private generateInstructions(purpose: string): string {
    return `あなたは${purpose}を実行するエージェントです。
ユーザーの要求を理解し、適切に応答してください。`;
  }

  /**
   * エージェント情報を取得
   */
  getInfo(): any {
    return {
      id: this.name,
      displayName: 'Agent Generator',
      description: '対話的に新しいエージェントの作成を支援するエージェント',
      model: 'openai/gpt-4o',
      tools: this.tools.map((t) => ({
        name: t.name,
        description: t.description,
      })),
      isDynamic: false,
    };
  }
}
