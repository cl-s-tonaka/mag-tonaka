/**
 * エージェント管理ツール
 * チャットインターフェースからエージェントを管理するためのツール群
 */

import type { DynamicAgentManager } from '../managers/DynamicAgentManager';
import { logger } from '../utils/logger';

/**
 * エージェント管理ツールを作成
 */
export function createAgentManagementTools(manager: DynamicAgentManager) {
  /**
   * エージェント一覧取得ツール
   */
  const listAgentsTool = {
    name: 'listAgents',
    description: '利用可能な全エージェント（静的+動的）の一覧を取得します。各エージェントのID、表示名、説明、タイプ（静的/動的）が含まれます。',
    parameters: {
      includeInactive: {
        type: 'boolean',
        description: '非アクティブなエージェントも含めるか',
        optional: true,
      },
    },
    execute: async ({ includeInactive = false }: any) => {
      logger.info('Executing listAgents tool', { includeInactive });

      try {
        // 動的エージェント取得
        const dynamicAgents = manager.getAllAgents();

        const agentList = dynamicAgents.map((agent: any) => {
          const info = agent.getInfo?.() || {};
          return {
            id: agent.name,
            displayName: info.displayName || agent.name,
            description: info.description || '',
            type: 'dynamic',
            status: 'active',
            model: agent.model || 'unknown',
            toolCount: agent.tools?.length || 0,
          };
        });

        return {
          success: true,
          agents: agentList,
          total: agentList.length,
          message: `Found ${agentList.length} agents`,
        };
      } catch (error: any) {
        logger.error('Failed to list agents', { error: error.message });
        return {
          success: false,
          error: error.message,
        };
      }
    },
  };

  /**
   * エージェント詳細取得ツール
   */
  const getAgentDetailsTool = {
    name: 'getAgentDetails',
    description: '特定のエージェントの詳細情報を取得します。エージェントの説明、使用可能なツール、モデル、ステータスなどの情報が含まれます。',
    parameters: {
      agentId: {
        type: 'string',
        description: 'エージェントID',
      },
    },
    execute: async ({ agentId }: any) => {
      logger.info('Executing getAgentDetails tool', { agentId });

      try {
        const agent = manager.getAgent(agentId);

        if (!agent) {
          return {
            success: false,
            error: `Agent '${agentId}' not found`,
          };
        }

        const info = agent.getInfo?.() || {};

        return {
          success: true,
          agent: {
            id: agent.name,
            displayName: info.displayName || agent.name,
            description: info.description || '',
            instructions: agent.instructions || '',
            model: agent.model || 'unknown',
            type: info.isDynamic ? 'dynamic' : 'static',
            tools: (info.tools || []).map((t: any) => ({
              name: t.name,
              description: t.description,
            })),
            status: 'active',
          },
        };
      } catch (error: any) {
        logger.error('Failed to get agent details', { error: error.message });
        return {
          success: false,
          error: error.message,
        };
      }
    },
  };

  /**
   * エージェント作成ツール
   */
  const createAgentTool = {
    name: 'createAgent',
    description: '新しい動的エージェントを作成します。エージェントID、表示名、説明、指示、使用するモデル、ツールを指定できます。',
    parameters: {
      agentId: {
        type: 'string',
        description: 'エージェントID（英数字、ハイフン、アンダースコアのみ）',
      },
      displayName: {
        type: 'string',
        description: 'エージェントの表示名',
      },
      description: {
        type: 'string',
        description: 'エージェントの説明',
      },
      instructions: {
        type: 'string',
        description: 'エージェントへの指示（システムプロンプト）',
      },
      model: {
        type: 'string',
        description: '使用するLLMモデル',
        optional: true,
      },
      tools: {
        type: 'array',
        description: 'エージェントが使用するツールの配列',
        optional: true,
      },
    },
    execute: async (params: any) => {
      logger.info('Executing createAgent tool', { agentId: params.agentId });

      try {
        const agent = await manager.createAgent({
          agentId: params.agentId,
          displayName: params.displayName,
          description: params.description,
          instructions: params.instructions,
          model: params.model || 'openai/gpt-4o-mini',
          tools: params.tools || [],
          testExamples: [],
        });

        return {
          success: true,
          message: `Agent '${params.displayName}' created successfully`,
          agentId: params.agentId,
          agent: {
            id: agent.name,
            displayName: params.displayName,
            description: params.description,
            status: 'active',
          },
        };
      } catch (error: any) {
        logger.error('Failed to create agent', { error: error.message });
        return {
          success: false,
          error: error.message,
        };
      }
    },
  };

  /**
   * エージェント削除ツール
   */
  const deleteAgentTool = {
    name: 'deleteAgent',
    description: '動的エージェントを削除します。静的エージェントは削除できません。',
    parameters: {
      agentId: {
        type: 'string',
        description: '削除するエージェントのID',
      },
      confirm: {
        type: 'boolean',
        description: '削除を確認（trueで削除実行）',
      },
    },
    execute: async ({ agentId, confirm }: any) => {
      logger.info('Executing deleteAgent tool', { agentId, confirm });

      if (!confirm) {
        return {
          success: false,
          error: 'Deletion not confirmed. Please set confirm=true to delete.',
        };
      }

      try {
        await manager.deleteAgent(agentId);

        return {
          success: true,
          message: `Agent '${agentId}' deleted successfully`,
        };
      } catch (error: any) {
        logger.error('Failed to delete agent', { error: error.message });
        return {
          success: false,
          error: error.message,
        };
      }
    },
  };

  /**
   * エージェント検索ツール
   */
  const searchAgentsTool = {
    name: 'searchAgents',
    description: 'キーワードでエージェントを検索します。エージェントの名前、説明、ツール名を対象に検索します。',
    parameters: {
      query: {
        type: 'string',
        description: '検索キーワード',
      },
    },
    execute: async ({ query }: any) => {
      logger.info('Executing searchAgents tool', { query });

      try {
        const allAgents = manager.getAllAgents();
        const lowerQuery = query.toLowerCase();

        const matchedAgents = allAgents.filter((agent: any) => {
          const info = agent.getInfo?.() || {};
          const name = (agent.name || '').toLowerCase();
          const displayName = (info.displayName || '').toLowerCase();
          const description = (info.description || '').toLowerCase();

          return (
            name.includes(lowerQuery) ||
            displayName.includes(lowerQuery) ||
            description.includes(lowerQuery)
          );
        });

        const results = matchedAgents.map((agent: any) => {
          const info = agent.getInfo?.() || {};
          return {
            id: agent.name,
            displayName: info.displayName || agent.name,
            description: info.description || '',
            type: info.isDynamic ? 'dynamic' : 'static',
          };
        });

        return {
          success: true,
          query,
          results,
          count: results.length,
          message: `Found ${results.length} agents matching '${query}'`,
        };
      } catch (error: any) {
        logger.error('Failed to search agents', { error: error.message });
        return {
          success: false,
          error: error.message,
        };
      }
    },
  };

  return {
    listAgentsTool,
    getAgentDetailsTool,
    createAgentTool,
    deleteAgentTool,
    searchAgentsTool,
  };
}
