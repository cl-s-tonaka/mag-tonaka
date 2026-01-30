/**
 * 動的エージェントシステム
 * エントリーポイント
 */

import { DynamicAgentManager } from './managers/DynamicAgentManager';
import { runMigrations } from './storage/migrations';
import { logger } from './utils/logger';
import { FEATURE_FLAGS, logFeatureFlagsStatus } from './utils/featureFlags';

/**
 * 動的エージェントシステム
 */
export class DynamicSystem {
  private manager: DynamicAgentManager | null = null;
  private db: any;
  private memory: any;

  constructor(memory: any, dbPath: string = './dynamic_agents.db') {
    this.memory = memory;

    // DB接続（簡易実装）
    // 実際の実装では LibSQL/Turso を使用
    // const { createClient } = require('@libsql/client');
    // this.db = createClient({ url: `file:${dbPath}` });

    // 開発用モック
    this.db = this.createMockDb();
  }

  /**
   * システムを初期化
   */
  async initialize(): Promise<Record<string, any>> {
    logger.info('Initializing dynamic agent system...');

    // フィーチャーフラグ確認
    if (!FEATURE_FLAGS.ENABLE_DYNAMIC_AGENTS) {
      logger.warn('Dynamic agents are disabled by feature flag');
      return {};
    }

    logFeatureFlagsStatus();

    try {
      // 1. マイグレーション実行
      logger.info('Running database migrations...');
      await runMigrations(this.db);

      // 2. マネージャー初期化
      logger.info('Initializing agent manager...');
      this.manager = new DynamicAgentManager(this.memory, this.db);

      // 3. エージェントロード
      logger.info('Loading dynamic agents...');
      const agents = await this.manager.loadAllAgents();

      logger.info(`Dynamic agent system initialized successfully with ${Object.keys(agents).length} agents`);

      return agents;
    } catch (error: any) {
      logger.error('Failed to initialize dynamic agent system', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * マネージャーを取得
   */
  getManager(): DynamicAgentManager {
    if (!this.manager) {
      throw new Error('Dynamic system not initialized');
    }
    return this.manager;
  }

  /**
   * システムをシャットダウン
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down dynamic agent system...');

    if (this.manager) {
      // クリーンアップ処理
      this.manager.getRegistry().clear();
    }

    logger.info('Dynamic agent system shut down successfully');
  }

  /**
   * モックDBを作成（開発用）
   */
  private createMockDb(): any {
    const storage = new Map<string, any[]>();

    return {
      execute: async (query: any) => {
        const sql = typeof query === 'string' ? query : query.sql;

        // CREATE TABLE
        if (sql.includes('CREATE TABLE')) {
          const tableName = sql.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/)?.[1];
          if (tableName && !storage.has(tableName)) {
            storage.set(tableName, []);
          }
          return { rows: [], rowsAffected: 0 };
        }

        // INSERT
        if (sql.includes('INSERT INTO')) {
          const tableName = sql.match(/INSERT INTO (\w+)/)?.[1];
          if (tableName) {
            const table = storage.get(tableName) || [];
            const row: any = {};
            if (query.args) {
              // 簡易実装: argsを行データとして保存
              row.data = query.args;
            }
            table.push(row);
            storage.set(tableName, table);
          }
          return { rows: [], rowsAffected: 1 };
        }

        // SELECT
        if (sql.includes('SELECT')) {
          const tableName = sql.match(/FROM (\w+)/)?.[1];
          if (tableName) {
            const table = storage.get(tableName) || [];
            return { rows: table };
          }
          return { rows: [] };
        }

        // UPDATE
        if (sql.includes('UPDATE')) {
          return { rows: [], rowsAffected: 1 };
        }

        // DELETE
        if (sql.includes('DELETE')) {
          return { rows: [], rowsAffected: 1 };
        }

        return { rows: [] };
      },
    };
  }
}

export default DynamicSystem;
