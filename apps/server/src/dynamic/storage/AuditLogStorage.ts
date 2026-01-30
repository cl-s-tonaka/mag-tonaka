/**
 * 監査ログストレージ
 * dynamic_agent_audit テーブルへの操作を提供
 */

import type { AuditLog } from '../types/dynamicAgent.types';
import { randomUUID } from 'crypto';

export class AuditLogStorage {
  constructor(private db: any) {}

  /**
   * 監査ログを記録
   */
  async log(log: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void> {
    const id = randomUUID();

    await this.db.execute({
      sql: `INSERT INTO dynamic_agent_audit
            (id, agent_id, operation, user_id, status, error_message, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        log.agentId,
        log.operation,
        log.userId || null,
        log.status,
        log.errorMessage || null,
        log.metadata ? JSON.stringify(log.metadata) : null,
      ],
    });
  }

  /**
   * エージェントの監査ログを取得
   */
  async findByAgentId(
    agentId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditLog[]> {
    const result = await this.db.execute({
      sql: `SELECT * FROM dynamic_agent_audit
            WHERE agent_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?`,
      args: [agentId, limit, offset],
    });

    return result.rows.map((row: any) => this.mapRowToLog(row));
  }

  /**
   * 全監査ログを取得
   */
  async findAll(limit: number = 100, offset: number = 0): Promise<AuditLog[]> {
    const result = await this.db.execute({
      sql: `SELECT * FROM dynamic_agent_audit
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?`,
      args: [limit, offset],
    });

    return result.rows.map((row: any) => this.mapRowToLog(row));
  }

  /**
   * データベース行をログオブジェクトにマッピング
   */
  private mapRowToLog(row: any): AuditLog {
    return {
      id: row.id as string,
      agentId: row.agent_id as string,
      operation: row.operation as AuditLog['operation'],
      userId: row.user_id as string | undefined,
      status: row.status as 'success' | 'failure',
      errorMessage: row.error_message as string | undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      createdAt: row.created_at as string,
    };
  }
}
