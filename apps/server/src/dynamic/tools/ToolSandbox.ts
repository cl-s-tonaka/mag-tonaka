/**
 * ツールサンドボックス
 * VM2を使用して動的ツールを安全に実行
 */

import { logger } from '../utils/logger';
import type { SandboxOptions } from '../types/dynamicTool.types';

/**
 * ツールサンドボックス
 *
 * 注意: この実装はVM2パッケージを使用しています。
 * 実際の使用には `npm install vm2 @types/vm2` が必要です。
 * MVPではこの簡易実装を使用し、プロダクション環境ではWorker Threadsへの移行を推奨します。
 */
export class ToolSandbox {
  private implementation: string;
  private options: SandboxOptions;

  constructor(implementation: string, options?: Partial<SandboxOptions>) {
    this.implementation = implementation;
    this.options = {
      timeout: options?.timeout || 5000,
      allowedDomains: options?.allowedDomains || [
        'api.weather.com',
        'api.openweathermap.org',
      ],
      maxMemory: options?.maxMemory || 50 * 1024 * 1024, // 50MB
    };
  }

  /**
   * ツールを実行
   */
  async run(params: Record<string, any>): Promise<any> {
    const startTime = Date.now();

    try {
      // VM2を使用した実行（プロダクション用）
      // const { VM } = require('vm2');
      // const vm = new VM({
      //   timeout: this.options.timeout,
      //   sandbox: {
      //     fetch: this.createFetchProxy(),
      //     console: {
      //       log: (...args: any[]) => logger.info('Tool log', { args }),
      //       error: (...args: any[]) => logger.error('Tool error', { args }),
      //     },
      //   },
      // });
      // const fn = vm.run(`(async (params) => { ${this.implementation} })`);
      // const result = await fn(params);

      // 開発用の簡易実装（注意: 本番環境では使用しないこと）
      logger.warn('Using unsafe eval for tool execution - VM2 not available');

      const fn = new Function(
        'params',
        'fetch',
        'console',
        `
        return (async () => {
          ${this.implementation}
        })();
        `
      );

      const result = await Promise.race([
        fn(params, this.createFetchProxy(), {
          log: (...args: any[]) => logger.info('Tool log', { args }),
          error: (...args: any[]) => logger.error('Tool error', { args }),
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Tool execution timed out')),
            this.options.timeout
          )
        ),
      ]);

      const duration = Date.now() - startTime;
      logger.info('Tool executed successfully', { duration });

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error('Tool execution failed', { error: error.message, duration });

      if (error.message.includes('timed out')) {
        throw new Error(`Tool execution exceeded ${this.options.timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * fetchのプロキシを作成（ホワイトリスト制御）
   */
  private createFetchProxy() {
    const allowedDomains = this.options.allowedDomains || [];

    return async (url: string, options?: RequestInit) => {
      try {
        const hostname = new URL(url).hostname;

        if (!allowedDomains.includes(hostname)) {
          throw new Error(`Access to ${hostname} is not allowed`);
        }

        // 3秒のタイムアウトを設定
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3001);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        return response;
      } catch (error: any) {
        logger.error('Fetch failed', { url, error: error.message });
        throw error;
      }
    };
  }
}
