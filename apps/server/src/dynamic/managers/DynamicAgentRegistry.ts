/**
 * 動的エージェントレジストリ
 * 実行中エージェントのインメモリキャッシュ
 */

import { logger } from '../utils/logger';

/**
 * 動的エージェントレジストリ
 */
export class DynamicAgentRegistry {
  private agents: Map<string, any>;

  constructor() {
    this.agents = new Map();
  }

  /**
   * エージェントを登録
   */
  register(id: string, agent: any): void {
    logger.info('Registering agent in registry', { agentId: id });
    this.agents.set(id, agent);
  }

  /**
   * エージェントを登録解除
   */
  unregister(id: string): boolean {
    logger.info('Unregistering agent from registry', { agentId: id });
    return this.agents.delete(id);
  }

  /**
   * エージェントを取得
   */
  get(id: string): any | undefined {
    return this.agents.get(id);
  }

  /**
   * 全エージェントを取得
   */
  getAll(): any[] {
    return Array.from(this.agents.values());
  }

  /**
   * 全エージェントIDを取得
   */
  getAllIds(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * エージェントが存在するか確認
   */
  has(id: string): boolean {
    return this.agents.has(id);
  }

  /**
   * レジストリをクリア
   */
  clear(): void {
    logger.warn('Clearing agent registry');
    this.agents.clear();
  }

  /**
   * レジストリのサイズを取得
   */
  size(): number {
    return this.agents.size;
  }
}
