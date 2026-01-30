/**
 * 動的エージェントシステムの型定義
 */

/**
 * 動的エージェント定義
 */
export interface DynamicAgentDefinition {
  agentId: string;
  className: string;
  displayName: string;
  description: string;
  instructions: string;
  model: string;
  status: 'active' | 'inactive' | 'deleted';
  version: number;
  tools: DynamicToolDefinition[];
  testExamples: DynamicTestExample[];
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 動的ツール定義
 */
export interface DynamicToolDefinition {
  id?: string;
  name: string;
  description: string;
  parameters: ToolParameter[];
  implementation: string;
  status?: 'active' | 'inactive';
  createdAt?: string;
}

/**
 * ツールパラメータ定義
 */
export interface ToolParameter {
  name: string;
  zodType: 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'array';
  zodOptions?: string[];
  description: string;
  optional?: boolean;
}

/**
 * テスト例定義
 */
export interface DynamicTestExample {
  id?: string;
  input: string;
  description: string;
  expectedBehavior: string;
  createdAt?: string;
}

/**
 * エージェント作成リクエスト
 */
export interface CreateAgentRequest {
  agentId: string;
  displayName: string;
  description: string;
  instructions: string;
  model?: string;
  tools?: DynamicToolDefinition[];
  testExamples?: DynamicTestExample[];
}

/**
 * エージェント更新リクエスト
 */
export interface UpdateAgentRequest {
  displayName?: string;
  description?: string;
  instructions?: string;
  model?: string;
  tools?: DynamicToolDefinition[];
  testExamples?: DynamicTestExample[];
}

/**
 * 監査ログ
 */
export interface AuditLog {
  id: string;
  agentId: string;
  operation: 'create' | 'update' | 'delete' | 'execute' | 'enable' | 'disable';
  userId?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

/**
 * API応答
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * APIエラー
 */
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  requestId?: string;
}
