/**
 * 動的ツールストレージ
 * dynamic_tools テーブルへのCRUD操作を提供
 */

import type { DynamicToolDefinition } from '../types/dynamicAgent.types';
import { randomUUID } from 'crypto';

export class DynamicToolStorage {
  constructor(private db: any) {}

  /**
   * ツールを作成
   */
  async create(agentId: string, tool: DynamicToolDefinition): Promise<string> {
    const id = tool.id || randomUUID();

    await this.db.execute({
      sql: `INSERT INTO dynamic_tools
            (id, agent_id, name, description, parameters_schema, implementation, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        agentId,
        tool.name,
        tool.description,
        JSON.stringify(tool.parameters),
        tool.implementation,
        tool.status || 'active',
      ],
    });

    return id;
  }

  /**
   * エージェントのツールを全て作成
   */
  async createMany(agentId: string, tools: DynamicToolDefinition[]): Promise<void> {
    for (const tool of tools) {
      await this.create(agentId, tool);
    }
  }

  /**
   * エージェントのツールを取得
   */
  async findByAgentId(agentId: string): Promise<DynamicToolDefinition[]> {
    const result = await this.db.execute({
      sql: `SELECT * FROM dynamic_tools WHERE agent_id = ? AND status = 'active' ORDER BY created_at`,
      args: [agentId],
    });

    return result.rows.map((row: any) => this.mapRowToTool(row));
  }

  /**
   * IDでツールを検索
   */
  async findById(id: string): Promise<DynamicToolDefinition | null> {
    const result = await this.db.execute({
      sql: `SELECT * FROM dynamic_tools WHERE id = ?`,
      args: [id],
    });

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTool(result.rows[0]);
  }

  /**
   * エージェントのツールを全て削除
   */
  async deleteByAgentId(agentId: string): Promise<void> {
    await this.db.execute({
      sql: `DELETE FROM dynamic_tools WHERE agent_id = ?`,
      args: [agentId],
    });
  }

  /**
   * データベース行をツールオブジェクトにマッピング
   */
  private mapRowToTool(row: any): DynamicToolDefinition {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      parameters: JSON.parse(row.parameters_schema as string),
      implementation: row.implementation as string,
      status: row.status as 'active' | 'inactive',
      createdAt: row.created_at as string,
    };
  }
}
