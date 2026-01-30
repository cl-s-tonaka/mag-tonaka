/**
 * エラーハンドリング
 * APIエラーレスポンスの生成
 */

import type { ApiError, ApiResponse } from '../types/dynamicAgent.types';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

/**
 * カスタムエラークラス
 */
export class DynamicAgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public httpStatus: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'DynamicAgentError';
  }
}

/**
 * エラーコード定義
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AGENT_ALREADY_EXISTS: 'AGENT_ALREADY_EXISTS',
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  TOOL_COMPILATION_ERROR: 'TOOL_COMPILATION_ERROR',
  TOOL_EXECUTION_ERROR: 'TOOL_EXECUTION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

/**
 * エラーレスポンスを生成
 */
export function createErrorResponse(
  error: any,
  requestId?: string
): ApiResponse {
  const id = requestId || randomUUID();

  // DynamicAgentError の場合
  if (error instanceof DynamicAgentError) {
    logger.error('API Error', {
      code: error.code,
      message: error.message,
      requestId: id,
    });

    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId: id,
      },
    };
  }

  // バリデーションエラー
  if (error.message && error.message.includes('required')) {
    logger.error('Validation Error', {
      message: error.message,
      requestId: id,
    });

    return {
      success: false,
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: error.message,
        requestId: id,
      },
    };
  }

  // エージェント重複エラー
  if (error.message && error.message.includes('already exists')) {
    logger.error('Agent Already Exists', {
      message: error.message,
      requestId: id,
    });

    return {
      success: false,
      error: {
        code: ErrorCodes.AGENT_ALREADY_EXISTS,
        message: error.message,
        requestId: id,
      },
    };
  }

  // エージェント未検出エラー
  if (error.message && error.message.includes('not found')) {
    logger.error('Agent Not Found', {
      message: error.message,
      requestId: id,
    });

    return {
      success: false,
      error: {
        code: ErrorCodes.AGENT_NOT_FOUND,
        message: error.message,
        requestId: id,
      },
    };
  }

  // その他のエラー
  logger.error('Internal Error', {
    message: error.message,
    stack: error.stack,
    requestId: id,
  });

  return {
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'An internal error occurred',
      requestId: id,
    },
  };
}

/**
 * HTTPステータスコードを取得
 */
export function getHttpStatus(errorCode: string): number {
  switch (errorCode) {
    case ErrorCodes.VALIDATION_ERROR:
      return 400;
    case ErrorCodes.AGENT_NOT_FOUND:
      return 404;
    case ErrorCodes.AGENT_ALREADY_EXISTS:
      return 409;
    case ErrorCodes.TOOL_COMPILATION_ERROR:
      return 400;
    case ErrorCodes.TOOL_EXECUTION_ERROR:
      return 500;
    case ErrorCodes.DATABASE_ERROR:
      return 500;
    case ErrorCodes.INTERNAL_ERROR:
      return 500;
    default:
      return 500;
  }
}
