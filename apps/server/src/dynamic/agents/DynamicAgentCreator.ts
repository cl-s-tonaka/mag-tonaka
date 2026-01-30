/**
 * 動的エージェント生成
 * エージェント定義からAgentインスタンスを生成
 */

import type { DynamicAgentDefinition } from '../types/dynamicAgent.types';
import { DynamicToolCompiler } from '../tools/DynamicToolCompiler';
import { logger } from '../utils/logger';

/**
 * 動的エージェント生成
 *
 * 注意: この実装はVoltAgentフレームワークのAgentクラスを使用する前提です。
 * 実際の使用にはVoltAgentパッケージが必要です。
 */
export class DynamicAgentCreator {
  private toolCompiler: DynamicToolCompiler;

  constructor() {
    this.toolCompiler = new DynamicToolCompiler();
  }

  /**
   * エージェント定義からAgentインスタンスを生成
   */
  createAgent(definition: DynamicAgentDefinition, memory?: any): any {
    logger.info('Creating dynamic agent', {
      agentId: definition.agentId,
      toolCount: definition.tools.length,
    });

    try {
      // ツールをコンパイル
      const tools = definition.tools.map((t) => this.toolCompiler.compile(t));

      // 動的Agentクラスを生成（簡易実装）
      // 実際の実装では VoltAgent の Agent クラスを継承します
      const GeneratedAgent = class {
        public name: string;
        public instructions: string;
        public tools: any[];
        public model: string;
        public memory: any;

        constructor(memory: any) {
          this.name = definition.agentId;
          this.instructions = definition.instructions;
          this.tools = tools;
          this.model = definition.model;
          this.memory = memory;
        }

        /**
         * エージェント実行（簡易実装）
         */
        async run(task: string, context?: any): Promise<any> {
          logger.info('Running dynamic agent', {
            agentId: this.name,
            task,
          });

          // 実際の実装では VoltAgent の Agent.run() を呼び出します
          // const result = await super.run(task, context);

          return {
            output: `Mock response from ${this.name}`,
            task,
            context,
          };
        }

        /**
         * エージェント情報を取得
         */
        getInfo(): any {
          return {
            id: this.name,
            displayName: definition.displayName,
            description: definition.description,
            model: this.model,
            tools: this.tools.map((t) => ({
              name: t.name,
              description: t.description,
            })),
            isDynamic: true,
          };
        }
      };

      // インスタンス化
      const agent = new GeneratedAgent(memory);

      logger.info('Dynamic agent created successfully', {
        agentId: definition.agentId,
      });

      return agent;
    } catch (error: any) {
      logger.error('Failed to create dynamic agent', {
        agentId: definition.agentId,
        error: error.message,
      });
      throw new Error(`Failed to create agent: ${error.message}`);
    }
  }

  /**
   * エージェント定義のバリデーション
   */
  validateDefinition(definition: DynamicAgentDefinition): void {
    if (!definition.agentId || !/^[a-zA-Z0-9_-]+$/.test(definition.agentId)) {
      throw new Error('Invalid agentId: must be alphanumeric with hyphens/underscores');
    }

    if (!definition.displayName || definition.displayName.trim() === '') {
      throw new Error('displayName is required');
    }

    if (!definition.description || definition.description.trim() === '') {
      throw new Error('description is required');
    }

    if (!definition.instructions || definition.instructions.trim() === '') {
      throw new Error('instructions are required');
    }

    // ツール名の重複チェック
    const toolNames = definition.tools.map((t) => t.name);
    const uniqueNames = new Set(toolNames);
    if (toolNames.length !== uniqueNames.size) {
      throw new Error('Duplicate tool names detected');
    }
  }
}
