/**
 * バリデーションスキーマ
 * リクエストデータのバリデーション
 */

import type { CreateAgentRequest, UpdateAgentRequest } from '../types/dynamicAgent.types';

/**
 * エージェント作成リクエストのバリデーション
 */
export function validateCreateAgentRequest(data: any): CreateAgentRequest {
  // 必須フィールドチェック
  if (!data.agentId || typeof data.agentId !== 'string') {
    throw new Error('agentId is required and must be a string');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(data.agentId)) {
    throw new Error(
      'agentId must contain only alphanumeric characters, hyphens, and underscores'
    );
  }

  if (!data.displayName || typeof data.displayName !== 'string') {
    throw new Error('displayName is required and must be a string');
  }

  if (!data.description || typeof data.description !== 'string') {
    throw new Error('description is required and must be a string');
  }

  if (!data.instructions || typeof data.instructions !== 'string') {
    throw new Error('instructions are required and must be a string');
  }

  // オプショナルフィールドチェック
  if (data.model && typeof data.model !== 'string') {
    throw new Error('model must be a string');
  }

  if (data.tools && !Array.isArray(data.tools)) {
    throw new Error('tools must be an array');
  }

  if (data.testExamples && !Array.isArray(data.testExamples)) {
    throw new Error('testExamples must be an array');
  }

  // ツールのバリデーション
  if (data.tools) {
    for (const tool of data.tools) {
      validateTool(tool);
    }
  }

  return {
    agentId: data.agentId,
    displayName: data.displayName,
    description: data.description,
    instructions: data.instructions,
    model: data.model,
    tools: data.tools,
    testExamples: data.testExamples,
  };
}

/**
 * エージェント更新リクエストのバリデーション
 */
export function validateUpdateAgentRequest(data: any): UpdateAgentRequest {
  const updates: UpdateAgentRequest = {};

  if (data.displayName !== undefined) {
    if (typeof data.displayName !== 'string') {
      throw new Error('displayName must be a string');
    }
    updates.displayName = data.displayName;
  }

  if (data.description !== undefined) {
    if (typeof data.description !== 'string') {
      throw new Error('description must be a string');
    }
    updates.description = data.description;
  }

  if (data.instructions !== undefined) {
    if (typeof data.instructions !== 'string') {
      throw new Error('instructions must be a string');
    }
    updates.instructions = data.instructions;
  }

  if (data.model !== undefined) {
    if (typeof data.model !== 'string') {
      throw new Error('model must be a string');
    }
    updates.model = data.model;
  }

  if (data.tools !== undefined) {
    if (!Array.isArray(data.tools)) {
      throw new Error('tools must be an array');
    }
    for (const tool of data.tools) {
      validateTool(tool);
    }
    updates.tools = data.tools;
  }

  if (data.testExamples !== undefined) {
    if (!Array.isArray(data.testExamples)) {
      throw new Error('testExamples must be an array');
    }
    updates.testExamples = data.testExamples;
  }

  return updates;
}

/**
 * ツール定義のバリデーション
 */
function validateTool(tool: any): void {
  if (!tool.name || typeof tool.name !== 'string') {
    throw new Error('Tool name is required and must be a string');
  }

  if (!tool.description || typeof tool.description !== 'string') {
    throw new Error('Tool description is required and must be a string');
  }

  if (!tool.parameters || !Array.isArray(tool.parameters)) {
    throw new Error('Tool parameters are required and must be an array');
  }

  if (!tool.implementation || typeof tool.implementation !== 'string') {
    throw new Error('Tool implementation is required and must be a string');
  }

  // パラメータのバリデーション
  for (const param of tool.parameters) {
    if (!param.name || typeof param.name !== 'string') {
      throw new Error('Parameter name is required');
    }

    if (!param.zodType || typeof param.zodType !== 'string') {
      throw new Error('Parameter zodType is required');
    }

    const validTypes = ['string', 'number', 'boolean', 'enum', 'object', 'array'];
    if (!validTypes.includes(param.zodType)) {
      throw new Error(`Invalid zodType: ${param.zodType}`);
    }

    if (!param.description || typeof param.description !== 'string') {
      throw new Error('Parameter description is required');
    }
  }
}
