/**
 * 統合モジュールの型定義
 */

/**
 * ツールパラメータ定義（統合モジュール用）
 */
export interface IntegrationToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  optional?: boolean;
  defaultValue?: any;
}

/**
 * 統合モジュールが提供するツール
 */
export interface IntegrationTool {
  name: string;
  description: string;
  parameters: IntegrationToolParameter[];
  implementation: string; // 実際のAPI呼び出しを含む実装コード
}

/**
 * 統合モジュールの設定
 */
export interface IntegrationConfig {
  id: string;                        // 例: 'openweathermap', 'stock-api'
  displayName: string;               // 表示名
  description: string;               // 説明
  requiredEnvVars: string[];         // 必要な環境変数
  allowedDomains: string[];          // 許可ドメイン
  tools: IntegrationTool[];          // 提供するツール
  category?: string;                 // カテゴリ（'weather', 'finance', 'communication' など）
  documentationUrl?: string;         // ドキュメントURL
}

/**
 * 統合モジュールの状態
 */
export interface IntegrationStatus {
  id: string;
  isConfigured: boolean;             // 必要な環境変数が設定されているか
  missingEnvVars: string[];          // 未設定の環境変数
  availableTools: string[];          // 利用可能なツール名
}

/**
 * 統合モジュールレジストリのインターフェース
 */
export interface IIntegrationRegistry {
  /**
   * 統合モジュールを登録
   */
  register(integration: IntegrationConfig): void;

  /**
   * IDで統合モジュールを取得
   */
  get(id: string): IntegrationConfig | undefined;

  /**
   * ツール名で統合モジュールを検索
   */
  findByToolName(toolName: string): IntegrationConfig | undefined;

  /**
   * すべての統合モジュールを取得
   */
  getAll(): IntegrationConfig[];

  /**
   * 設定済みの統合モジュールのみ取得
   */
  getConfigured(): IntegrationConfig[];

  /**
   * すべての許可ドメインを取得
   */
  getAllAllowedDomains(): string[];

  /**
   * 統合モジュールのステータスを取得
   */
  getStatus(id: string): IntegrationStatus | undefined;

  /**
   * すべての統合モジュールのステータスを取得
   */
  getAllStatuses(): IntegrationStatus[];
}
