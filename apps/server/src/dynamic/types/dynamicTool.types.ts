/**
 * 動的ツールシステムの型定義
 */

/**
 * ツール実行結果
 */
export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: ToolExecutionError;
  duration: number;
}

/**
 * ツール実行エラー
 */
export interface ToolExecutionError {
  code: string;
  message: string;
  stack?: string;
}

/**
 * サンドボックスオプション
 */
export interface SandboxOptions {
  timeout: number;
  allowedDomains?: string[];
  maxMemory?: number;
}

/**
 * ツールコンテキスト
 */
export interface ToolContext {
  agentId: string;
  userId?: string;
  sessionId?: string;
  timestamp: string;
}
