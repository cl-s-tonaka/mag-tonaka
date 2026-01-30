/**
 * 動的エージェント生成
 * エージェント定義からAgentインスタンスを生成し、LLMで実行
 */

import type { DynamicAgentDefinition } from '../types/dynamicAgent.types';
import { DynamicToolCompiler } from '../tools/DynamicToolCompiler';
import { logger } from '../utils/logger';
import { LiteLLMService, type LLMMessage, type LLMTool } from '../../services/LiteLLMService';

/**
 * コンパイル済みツール型
 */
interface CompiledTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: Record<string, any>) => Promise<any>;
}

/**
 * エージェント実行結果
 */
export interface AgentRunResult {
  output: string;
  toolCalls: Array<{
    name: string;
    args: any;
    result: any;
  }>;
  model: string;
  agentId: string;
}

/**
 * 動的エージェント生成クラス
 */
export class DynamicAgentCreator {
  private toolCompiler: DynamicToolCompiler;
  private llmService: LiteLLMService;

  constructor(llmService?: LiteLLMService) {
    this.toolCompiler = new DynamicToolCompiler();
    this.llmService = llmService || LiteLLMService.getInstance();
  }

  /**
   * エージェント定義からAgentインスタンスを生成
   */
  createAgent(definition: DynamicAgentDefinition, memory?: any): DynamicAgent {
    logger.info('Creating dynamic agent', {
      agentId: definition.agentId,
      toolCount: definition.tools.length,
    });

    try {
      // ツールをコンパイル
      const tools = definition.tools.map((t) => this.toolCompiler.compile(t));

      // 動的エージェントインスタンスを生成
      const agent = new DynamicAgent(
        definition,
        tools,
        this.llmService,
        memory
      );

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

/**
 * 動的エージェントクラス
 * LLMを使用してプロンプトを実行する
 */
export class DynamicAgent {
  public readonly name: string;
  public readonly instructions: string;
  public readonly tools: CompiledTool[];
  public readonly model: string;
  public readonly memory: any;

  private definition: DynamicAgentDefinition;
  private llmService: LiteLLMService;
  private conversationHistory: LLMMessage[] = [];

  constructor(
    definition: DynamicAgentDefinition,
    tools: CompiledTool[],
    llmService: LiteLLMService,
    memory?: any
  ) {
    this.definition = definition;
    this.name = definition.agentId;
    this.instructions = definition.instructions;
    this.tools = tools;
    this.model = definition.model;
    this.memory = memory;
    this.llmService = llmService;
  }

  /**
   * エージェントを実行
   */
  async run(task: string, context?: Record<string, any>): Promise<AgentRunResult> {
    logger.info('Running dynamic agent', {
      agentId: this.name,
      task: task.substring(0, 100),
      hasContext: !!context,
    });

    // システムプロンプトを構築
    const systemPrompt = this.buildSystemPrompt(context);

    // メッセージを構築
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...this.conversationHistory,
      { role: 'user', content: task },
    ];

    // LLMツール形式に変換
    const llmTools = this.convertToolsToLLMFormat();

    // ツール実行関数
    const executeToolFn = async (name: string, args: Record<string, any>): Promise<any> => {
      const tool = this.tools.find((t) => t.name === name);
      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }
      return await tool.execute(args);
    };

    try {
      let result: AgentRunResult;

      if (llmTools.length > 0) {
        // ツールがある場合はrunWithToolsを使用
        const response = await this.llmService.runWithTools(
          messages,
          llmTools,
          executeToolFn,
          { model: this.model }
        );

        result = {
          output: response.response,
          toolCalls: response.toolCalls,
          model: this.model,
          agentId: this.name,
        };
      } else {
        // ツールがない場合はシンプルにテキスト生成
        const response = await this.llmService.generateText(
          task,
          systemPrompt,
          { model: this.model }
        );

        result = {
          output: response,
          toolCalls: [],
          model: this.model,
          agentId: this.name,
        };
      }

      // 会話履歴を更新
      this.conversationHistory.push({ role: 'user', content: task });
      this.conversationHistory.push({ role: 'assistant', content: result.output });

      // 履歴が長くなりすぎたら古いものを削除
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      logger.info('Agent execution completed', {
        agentId: this.name,
        outputLength: result.output.length,
        toolCallCount: result.toolCalls.length,
      });

      return result;
    } catch (error: any) {
      logger.error('Agent execution failed', {
        agentId: this.name,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * システムプロンプトを構築
   */
  private buildSystemPrompt(context?: Record<string, any>): string {
    let prompt = this.instructions;

    if (context) {
      prompt += '\n\n## コンテキスト情報\n';
      prompt += JSON.stringify(context, null, 2);
    }

    if (this.tools.length > 0) {
      prompt += '\n\n## 利用可能なツール\n';
      for (const tool of this.tools) {
        prompt += `- **${tool.name}**: ${tool.description}\n`;
      }
    }

    return prompt;
  }

  /**
   * ツールをLLM形式に変換
   */
  private convertToolsToLLMFormat(): LLMTool[] {
    return this.tools.map((tool) => {
      // パラメータをOpenAI API用のJSON Schema形式に変換
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const [paramName, paramDef] of Object.entries(tool.parameters as Record<string, any>)) {
        let jsonSchemaType = 'string';
        if (paramDef.type === 'number') jsonSchemaType = 'number';
        else if (paramDef.type === 'boolean') jsonSchemaType = 'boolean';
        else if (paramDef.type === 'enum') jsonSchemaType = 'string';

        properties[paramName] = {
          type: jsonSchemaType,
          description: paramDef.description || '',
        };

        // enum の場合
        if (paramDef.type === 'enum' && paramDef.options) {
          properties[paramName].enum = paramDef.options;
        }

        // 必須パラメータ
        if (!paramDef.optional) {
          required.push(paramName);
        }
      }

      return {
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: 'object',
            properties,
            required: required.length > 0 ? required : undefined,
          },
        },
      };
    });
  }

  /**
   * 会話履歴をクリア
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * 会話履歴を取得
   */
  getHistory(): LLMMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * エージェント情報を取得
   */
  getInfo(): any {
    return {
      id: this.name,
      displayName: this.definition.displayName,
      description: this.definition.description,
      model: this.model,
      tools: this.tools.map((t) => ({
        name: t.name,
        description: t.description,
      })),
      isDynamic: true,
    };
  }
}
