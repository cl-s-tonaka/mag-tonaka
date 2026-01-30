/**
 * 動的エージェントストレージ
 * dynamic_agents テーブルへのCRUD操作を提供
 */

import type { DynamicAgentDefinition } from '../types/dynamicAgent.types';

export class DynamicAgentStorage {
  constructor(private db: any) {}

  /**
   * エージェントを作成
   */
  async create(definition: DynamicAgentDefinition): Promise<void> {
    await this.db.execute({
      sql: `INSERT INTO dynamic_agents
            (id, class_name, display_name, description, instructions, model, status, version, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        definition.agentId,
        definition.className,
        definition.displayName,
        definition.description,
        definition.instructions,
        definition.model || 'openai/gpt-4o-mini',
        definition.status || 'active',
        definition.version || 1,
        definition.metadata ? JSON.stringify(definition.metadata) : null,
      ],
    });
  }

  /**
   * IDでエージェントを検索
   */
  async findById(id: string): Promise<DynamicAgentDefinition | null> {
    const result = await this.db.execute({
      sql: `SELECT * FROM dynamic_agents WHERE id = ? AND status != 'deleted'`,
      args: [id],
    });

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToDefinition(result.rows[0]);
  }

  /**
   * 全エージェントを取得
   */
  async findAll(status?: string): Promise<DynamicAgentDefinition[]> {
    const sql = status
      ? `SELECT * FROM dynamic_agents WHERE status = ? ORDER BY created_at DESC`
      : `SELECT * FROM dynamic_agents WHERE status != 'deleted' ORDER BY created_at DESC`;

    const args = status ? [status] : [];

    const result = await this.db.execute({
      sql,
      args,
    });

    return result.rows.map((row: any) => this.mapRowToDefinition(row));
  }

  /**
   * エージェントを更新
   */
  async update(id: string, updates: Partial<DynamicAgentDefinition>): Promise<void> {
    const fields: string[] = [];
    const args: any[] = [];

    if (updates.displayName !== undefined) {
      fields.push('display_name = ?');
      args.push(updates.displayName);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      args.push(updates.description);
    }
    if (updates.instructions !== undefined) {
      fields.push('instructions = ?');
      args.push(updates.instructions);
    }
    if (updates.model !== undefined) {
      fields.push('model = ?');
      args.push(updates.model);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      args.push(updates.status);
    }
    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      args.push(JSON.stringify(updates.metadata));
    }

    // バージョンをインクリメント
    fields.push('version = version + 1');
    fields.push('updated_at = CURRENT_TIMESTAMP');

    args.push(id);

    await this.db.execute({
      sql: `UPDATE dynamic_agents SET ${fields.join(', ')} WHERE id = ?`,
      args,
    });
  }

  /**
   * エージェントを論理削除
   */
  async delete(id: string): Promise<void> {
    await this.db.execute({
      sql: `UPDATE dynamic_agents SET status = 'deleted', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [id],
    });
  }

  /**
   * データベース行を定義オブジェクトにマッピング
   */
  private mapRowToDefinition(row: any): DynamicAgentDefinition {
    return {
      agentId: row.id as string,
      className: row.class_name as string,
      displayName: row.display_name as string,
      description: row.description as string,
      instructions: row.instructions as string,
      model: row.model as string,
      status: row.status as 'active' | 'inactive' | 'deleted',
      version: row.version as number,
      tools: [],
      testExamples: [],
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
