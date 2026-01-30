/**
 * LiteLLM統合サービス
 * OpenAI互換APIでLLM呼び出しを行う
 */

import { logger } from '../dynamic/utils/logger';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: LLMToolCall[];
}

export interface LLMTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface LLMToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string | null;
      tool_calls?: LLMToolCall[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface ChatCompletionOptions {
  model?: string;
  messages: LLMMessage[];
  tools?: LLMTool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * LiteLLM統合サービス
 * 環境変数: LITELLM_API_KEY, LITELLM_BASE_URL
 */
export class LiteLLMService {
  private config: LLMConfig;
  private static instance: LiteLLMService | null = null;

  constructor(config?: Partial<LLMConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.LITELLM_API_KEY || '',
      baseUrl: config?.baseUrl || process.env.LITELLM_BASE_URL || 'http://localhost:4000',
      defaultModel: config?.defaultModel || process.env.LITELLM_DEFAULT_MODEL || 'gpt-4o-mini',
      timeout: config?.timeout || 60000,
      maxRetries: config?.maxRetries || 3,
    };

    if (!this.config.apiKey) {
      logger.warn('LITELLM_API_KEY is not set. LLM calls will fail.');
    }
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(config?: Partial<LLMConfig>): LiteLLMService {
    if (!LiteLLMService.instance) {
      LiteLLMService.instance = new LiteLLMService(config);
    }
    return LiteLLMService.instance;
  }

  /**
   * インスタンスをリセット（テスト用）
   */
  static resetInstance(): void {
    LiteLLMService.instance = null;
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Chat Completion API呼び出し
   */
  async chatCompletion(options: ChatCompletionOptions): Promise<LLMResponse> {
    const model = options.model || this.config.defaultModel;
    const url = `${this.config.baseUrl}/v1/chat/completions`;

    const requestBody: Record<string, any> = {
      model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
    };

    if (options.max_tokens) {
      requestBody.max_tokens = options.max_tokens;
    }

    if (options.tools && options.tools.length > 0) {
      requestBody.tools = options.tools;
      requestBody.tool_choice = options.tool_choice || 'auto';
    }

    if (options.stream) {
      requestBody.stream = true;
    }

    logger.debug('LLM Request', {
      url,
      model,
      messageCount: options.messages.length,
      hasTools: !!(options.tools && options.tools.length > 0),
    });

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.config.maxRetries!; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`LLM API error: ${response.status} - ${errorText}`);
        }

        const result = (await response.json()) as LLMResponse;

        logger.debug('LLM Response', {
          model: result.model,
          finishReason: result.choices[0]?.finish_reason,
          hasToolCalls: !!(result.choices[0]?.message?.tool_calls),
          usage: result.usage,
        });

        return result;
      } catch (error: any) {
        lastError = error;
        logger.warn(`LLM request failed (attempt ${attempt + 1}/${this.config.maxRetries})`, {
          error: error.message,
        });

        if (attempt < this.config.maxRetries! - 1) {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error('LLM request failed after retries');
  }

  /**
   * 単純なテキスト生成（ツールなし）
   */
  async generateText(
    prompt: string,
    systemPrompt?: string,
    options?: Partial<ChatCompletionOptions>
  ): Promise<string> {
    const messages: LLMMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await this.chatCompletion({
      ...options,
      messages,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * ツール呼び出し付きの会話実行
   * ツールの実行結果を自動的に処理して最終回答を返す
   */
  async runWithTools(
    messages: LLMMessage[],
    tools: LLMTool[],
    executeToolFn: (name: string, args: Record<string, any>) => Promise<any>,
    options?: Partial<ChatCompletionOptions>
  ): Promise<{ response: string; toolCalls: Array<{ name: string; args: any; result: any }> }> {
    const conversationMessages = [...messages];
    const toolCallsHistory: Array<{ name: string; args: any; result: any }> = [];
    let maxIterations = 10;

    while (maxIterations > 0) {
      maxIterations--;

      const response = await this.chatCompletion({
        ...options,
        messages: conversationMessages,
        tools,
        tool_choice: 'auto',
      });

      const assistantMessage = response.choices[0]?.message;
      if (!assistantMessage) {
        throw new Error('No response from LLM');
      }

      // ツール呼び出しがない場合は完了
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        return {
          response: assistantMessage.content || '',
          toolCalls: toolCallsHistory,
        };
      }

      // アシスタントメッセージを追加（tool_callsを含める）
      conversationMessages.push({
        role: 'assistant',
        content: assistantMessage.content,
        tool_calls: assistantMessage.tool_calls,
      });

      // ツールを実行
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        let toolArgs: Record<string, any>;

        try {
          toolArgs = JSON.parse(toolCall.function.arguments);
        } catch {
          toolArgs = {};
        }

        logger.info('Executing tool', { toolName, toolArgs });

        let toolResult: any;
        try {
          toolResult = await executeToolFn(toolName, toolArgs);
        } catch (error: any) {
          toolResult = { error: error.message };
        }

        toolCallsHistory.push({
          name: toolName,
          args: toolArgs,
          result: toolResult,
        });

        // ツール結果をメッセージに追加
        conversationMessages.push({
          role: 'tool',
          content: JSON.stringify(toolResult),
          tool_call_id: toolCall.id,
        });
      }
    }

    throw new Error('Max iterations reached in tool execution loop');
  }

  /**
   * タイムアウト付きfetch
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * スリープ
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): Omit<LLMConfig, 'apiKey'> & { apiKey: string } {
    return {
      ...this.config,
      apiKey: this.config.apiKey ? '***' : '',
    };
  }

  /**
   * 接続テスト
   */
  async testConnection(): Promise<{ success: boolean; message: string; model?: string }> {
    try {
      const response = await this.generateText('Say "OK" if you can read this.', undefined, {
        max_tokens: 10,
      });

      return {
        success: true,
        message: 'Connection successful',
        model: this.config.defaultModel,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}

export default LiteLLMService;
