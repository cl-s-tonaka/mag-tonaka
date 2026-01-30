/**
 * AgentGeneratorエージェント
 * 自然言語でエージェント作成を支援
 */

import type { DynamicAgentManager } from '../dynamic/managers/DynamicAgentManager';
import { logger } from '../dynamic/utils/logger';

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

  constructor(memory: any, dynamicAgentManager: DynamicAgentManager) {
    this.memory = memory;
    this.dynamicAgentManager = dynamicAgentManager;

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
