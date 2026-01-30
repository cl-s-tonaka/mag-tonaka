/**
 * 動的ツール実行
 * サンドボックス環境でツールを安全に実行
 */

import { ToolSandbox } from './ToolSandbox';
import type { ToolExecutionResult } from '../types/dynamicTool.types';
import { logger } from '../utils/logger';

/**
 * 動的ツール実行
 */
export class DynamicToolExecutor {
  private sandbox: ToolSandbox;

  constructor(implementation: string) {
    this.sandbox = new ToolSandbox(implementation);
  }

  /**
   * ツールを実行
   */
  async execute(params: Record<string, any>): Promise<any> {
    const startTime = Date.now();

    try {
      logger.info('Executing tool', { params });

      const result = await this.sandbox.run(params);

      const duration = Date.now() - startTime;

      logger.info('Tool execution completed', { duration, result });

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      logger.error('Tool execution error', {
        error: error.message,
        stack: error.stack,
        params,
        duration,
      });

      throw new Error(`Tool execution failed: ${error.message}`);
    }
  }

  /**
   * ツール実行（詳細な結果を返す）
   */
  async executeWithDetails(
    params: Record<string, any>
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      const result = await this.sandbox.run(params);
      const duration = Date.now() - startTime;

      return {
        success: true,
        result,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        error: {
          code: 'TOOL_EXECUTION_ERROR',
          message: error.message,
          stack: error.stack,
        },
        duration,
      };
    }
  }
}
