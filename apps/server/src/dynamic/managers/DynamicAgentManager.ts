/**
 * 動的エージェントマネージャー
 * エージェントのライフサイクル管理
 */

import { DynamicAgentStorage } from '../storage/DynamicAgentStorage';
import { DynamicToolStorage } from '../storage/DynamicToolStorage';
import { AuditLogStorage } from '../storage/AuditLogStorage';
import { DynamicAgentCreator } from '../agents/DynamicAgentCreator';
import { DynamicAgentLoader } from '../agents/DynamicAgentLoader';
import { DynamicAgentRegistry } from './DynamicAgentRegistry';
import type { DynamicAgentDefinition, CreateAgentRequest, UpdateAgentRequest } from '../types/dynamicAgent.types';
import { logger } from '../utils/logger';

/**
 * 動的エージェントマネージャー
 */
export class DynamicAgentManager {
  private agentStorage: DynamicAgentStorage;
  private toolStorage: DynamicToolStorage;
  private auditStorage: AuditLogStorage;
  private creator: DynamicAgentCreator;
  private loader: DynamicAgentLoader;
  private registry: DynamicAgentRegistry;
  private memory: any;

  constructor(memory: any, db: any) {
    this.memory = memory;
    this.agentStorage = new DynamicAgentStorage(db);
    this.toolStorage = new DynamicToolStorage(db);
    this.auditStorage = new AuditLogStorage(db);
    this.creator = new DynamicAgentCreator();
    this.loader = new DynamicAgentLoader(db);
    this.registry = new DynamicAgentRegistry();
  }

  /**
   * エージェントを作成
   */
  async createAgent(request: CreateAgentRequest): Promise<any> {
    logger.info('Creating agent', { agentId: request.agentId });

    try {
      // クラス名を生成（キャメルケース）
      const className = this.generateClassName(request.agentId);

      // 定義を構築
      const definition: DynamicAgentDefinition = {
        agentId: request.agentId,
        className,
        displayName: request.displayName,
        description: request.description,
        instructions: request.instructions,
        model: request.model || 'openai/gpt-4o-mini',
        status: 'active',
        version: 1,
        tools: request.tools || [],
        testExamples: request.testExamples || [],
      };

      // バリデーション
      this.creator.validateDefinition(definition);

      // 重複チェック
      const existing = await this.agentStorage.findById(definition.agentId);
      if (existing) {
        throw new Error(`Agent with ID '${definition.agentId}' already exists`);
      }

      // 1. DB保存
      await this.agentStorage.create(definition);

      // 2. ツール保存
      if (definition.tools.length > 0) {
        await this.toolStorage.createMany(definition.agentId, definition.tools);
      }

      // 3. エージェント生成
      const agent = this.creator.createAgent(definition, this.memory);

      // 4. レジストリ登録
      this.registry.register(definition.agentId, agent);

      // 5. 監査ログ
      await this.auditStorage.log({
        agentId: definition.agentId,
        operation: 'create',
        status: 'success',
        metadata: {
          displayName: definition.displayName,
          toolCount: definition.tools.length,
        },
      });

      logger.info('Agent created successfully', { agentId: definition.agentId });

      return agent;
    } catch (error: any) {
      logger.error('Failed to create agent', {
        agentId: request.agentId,
        error: error.message,
      });

      // 監査ログ（失敗）
      await this.auditStorage.log({
        agentId: request.agentId,
        operation: 'create',
        status: 'failure',
        errorMessage: error.message,
      });

      throw error;
    }
  }

  /**
   * エージェントを更新
   */
  async updateAgent(id: string, request: UpdateAgentRequest): Promise<any> {
    logger.info('Updating agent', { agentId: id });

    try {
      // 既存エージェント確認
      const existing = await this.agentStorage.findById(id);
      if (!existing) {
        throw new Error(`Agent with ID '${id}' not found`);
      }

      // DB更新
      await this.agentStorage.update(id, request);

      // ツール更新（全削除・再作成）
      if (request.tools) {
        await this.toolStorage.deleteByAgentId(id);
        await this.toolStorage.createMany(id, request.tools);
      }

      // エージェント再生成
      const agent = await this.loader.reload(id, this.memory);

      // レジストリ更新
      if (agent) {
        this.registry.register(id, agent);
      }

      // 監査ログ
      await this.auditStorage.log({
        agentId: id,
        operation: 'update',
        status: 'success',
        metadata: {
          changes: request,
        },
      });

      logger.info('Agent updated successfully', { agentId: id });

      return agent;
    } catch (error: any) {
      logger.error('Failed to update agent', {
        agentId: id,
        error: error.message,
      });

      // 監査ログ（失敗）
      await this.auditStorage.log({
        agentId: id,
        operation: 'update',
        status: 'failure',
        errorMessage: error.message,
      });

      throw error;
    }
  }

  /**
   * エージェントを削除
   */
  async deleteAgent(id: string): Promise<void> {
    logger.info('Deleting agent', { agentId: id });

    try {
      // 既存エージェント確認
      const existing = await this.agentStorage.findById(id);
      if (!existing) {
        throw new Error(`Agent with ID '${id}' not found`);
      }

      // レジストリから削除
      this.registry.unregister(id);

      // DB論理削除
      await this.agentStorage.delete(id);

      // 監査ログ
      await this.auditStorage.log({
        agentId: id,
        operation: 'delete',
        status: 'success',
      });

      logger.info('Agent deleted successfully', { agentId: id });
    } catch (error: any) {
      logger.error('Failed to delete agent', {
        agentId: id,
        error: error.message,
      });

      // 監査ログ（失敗）
      await this.auditStorage.log({
        agentId: id,
        operation: 'delete',
        status: 'failure',
        errorMessage: error.message,
      });

      throw error;
    }
  }

  /**
   * 全エージェントをロード
   */
  async loadAllAgents(): Promise<Record<string, any>> {
    logger.info('Loading all dynamic agents...');

    const agents = await this.loader.loadAll(this.memory);

    // レジストリに登録
    for (const [id, agent] of Object.entries(agents)) {
      this.registry.register(id, agent);
    }

    logger.info(`Loaded ${Object.keys(agents).length} dynamic agents`);

    return agents;
  }

  /**
   * エージェントを取得
   */
  getAgent(id: string): any | undefined {
    return this.registry.get(id);
  }

  /**
   * 全エージェントを取得
   */
  getAllAgents(): any[] {
    return this.registry.getAll();
  }

  /**
   * レジストリを取得
   */
  getRegistry(): DynamicAgentRegistry {
    return this.registry;
  }

  /**
   * クラス名を生成
   */
  private generateClassName(agentId: string): string {
    // キャメルケースに変換
    // 例: weatherAgent -> WeatherAgent, weather-agent -> WeatherAgent
    return agentId
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }
}
