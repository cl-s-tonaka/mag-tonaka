/**
 * 動的エージェントシステム
 * エントリーポイント
 */

import { DynamicAgentManager } from './managers/DynamicAgentManager';
import { runMigrations } from './storage/migrations';
import { logger } from './utils/logger';
import { FEATURE_FLAGS, logFeatureFlagsStatus } from './utils/featureFlags';
import { seedAgents } from './data/seedAgents';

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

      // 4. シードデータの作成（エージェントが存在しない場合）
      if (Object.keys(agents).length === 0) {
        logger.info('No agents found, creating seed agents...');
        await this.createSeedAgents();
      }

      const finalAgentCount = this.manager.getAllAgents().length;
      logger.info(`Dynamic agent system initialized successfully with ${finalAgentCount} agents`);

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
   * シードエージェントを作成
   */
  private async createSeedAgents(): Promise<void> {
    if (!this.manager) {
      throw new Error('Manager not initialized');
    }

    for (const seedAgent of seedAgents) {
      try {
        await this.manager.createAgent({
          agentId: seedAgent.agentId,
          displayName: seedAgent.displayName,
          description: seedAgent.description,
          instructions: seedAgent.instructions,
          model: seedAgent.model,
        });
        logger.info(`Created seed agent: ${seedAgent.displayName}`);
      } catch (error: any) {
        logger.warn(`Failed to create seed agent ${seedAgent.agentId}: ${error.message}`);
      }
    }
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
            if (query.args && tableName === 'dynamic_agents') {
              // dynamic_agents テーブルの場合、カラム名をマッピング
              row.id = query.args[0];
              row.class_name = query.args[1];
              row.display_name = query.args[2];
              row.description = query.args[3];
              row.instructions = query.args[4];
              row.model = query.args[5];
              row.status = query.args[6];
              row.version = query.args[7];
              row.metadata = query.args[8];
              row.created_at = new Date().toISOString();
              row.updated_at = new Date().toISOString();
            } else if (query.args) {
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
            // WHERE id = ? の場合、IDでフィルタリング
            if (sql.includes('WHERE') && sql.includes('id = ?') && query.args?.[0]) {
              const filteredRows = table.filter((row: any) => row.id === query.args[0] && row.status !== 'deleted');
              return { rows: filteredRows };
            }
            // statusでフィルタリング
            if (sql.includes("status != 'deleted'")) {
              const filteredRows = table.filter((row: any) => row.status !== 'deleted');
              return { rows: filteredRows };
            }
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
