/**
 * 動的エージェントローダー
 * データベースから動的エージェントを復元
 */

import { DynamicAgentStorage } from '../storage/DynamicAgentStorage';
import { DynamicToolStorage } from '../storage/DynamicToolStorage';
import { DynamicAgentCreator } from './DynamicAgentCreator';
import type { DynamicAgentDefinition } from '../types/dynamicAgent.types';
import { logger } from '../utils/logger';

/**
 * 動的エージェントローダー
 */
export class DynamicAgentLoader {
  private agentStorage: DynamicAgentStorage;
  private toolStorage: DynamicToolStorage;
  private creator: DynamicAgentCreator;

  constructor(db: any) {
    this.agentStorage = new DynamicAgentStorage(db);
    this.toolStorage = new DynamicToolStorage(db);
    this.creator = new DynamicAgentCreator();
  }

  /**
   * 全ての動的エージェントをロード
   */
  async loadAll(memory?: any): Promise<Record<string, any>> {
    logger.info('Loading all dynamic agents...');

    try {
      // アクティブなエージェント定義を取得
      const definitions = await this.agentStorage.findAll('active');

      logger.info(`Found ${definitions.length} active agents`);

      const agents: Record<string, any> = {};

      // 各エージェントをロード
      for (const definition of definitions) {
        try {
          const agent = await this.loadOne(definition.agentId, memory);
          if (agent) {
            agents[definition.agentId] = agent;
          }
        } catch (error: any) {
          logger.error('Failed to load agent', {
            agentId: definition.agentId,
            error: error.message,
          });
          // 1つのエージェントのロード失敗で全体を止めない
        }
      }

      logger.info(`Successfully loaded ${Object.keys(agents).length} dynamic agents`);

      return agents;
    } catch (error: any) {
      logger.error('Failed to load dynamic agents', { error: error.message });
      throw error;
    }
  }

  /**
   * 特定のエージェントをロード
   */
  async loadOne(agentId: string, memory?: any): Promise<any | null> {
    logger.info('Loading dynamic agent', { agentId });

    try {
      // エージェント定義を取得
      const definition = await this.agentStorage.findById(agentId);

      if (!definition) {
        logger.warn('Agent not found', { agentId });
        return null;
      }

      // ツールを取得
      const tools = await this.toolStorage.findByAgentId(agentId);

      // 完全な定義を構築
      const fullDefinition: DynamicAgentDefinition = {
        ...definition,
        tools,
      };

      // エージェントを生成
      const agent = this.creator.createAgent(fullDefinition, memory);

      logger.info('Dynamic agent loaded successfully', { agentId });

      return agent;
    } catch (error: any) {
      logger.error('Failed to load agent', {
        agentId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * エージェントをリロード
   */
  async reload(agentId: string, memory?: any): Promise<any | null> {
    logger.info('Reloading dynamic agent', { agentId });
    return await this.loadOne(agentId, memory);
  }
}
