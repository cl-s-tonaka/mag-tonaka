/**
 * Shared types for Dynamic Agent System
 */

// Agent types
export interface DynamicAgentDefinition {
  agentId: string;
  className: string;
  displayName: string;
  description: string;
  instructions: string;
  model: string;
  status: AgentStatus;
  version: number;
  tools: DynamicToolDefinition[];
  testExamples: DynamicTestExample[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export type AgentStatus = 'active' | 'inactive' | 'deleted';

export interface DynamicToolDefinition {
  id?: string;
  name: string;
  description: string;
  parameters: ToolParameter[];
  implementation: string;
  status?: 'active' | 'inactive';
  createdAt?: string;
}

export interface ToolParameter {
  name: string;
  zodType: ZodType;
  zodOptions?: string[];
  description: string;
  optional?: boolean;
}

export type ZodType = 'string' | 'number' | 'boolean' | 'enum' | 'object' | 'array';

export interface DynamicTestExample {
  id?: string;
  input: string;
  description: string;
  expectedBehavior: string;
  createdAt?: string;
}

// Request types
export interface CreateAgentRequest {
  agentId: string;
  displayName: string;
  description: string;
  instructions: string;
  model?: string;
  tools?: DynamicToolDefinition[];
  testExamples?: DynamicTestExample[];
}

export interface UpdateAgentRequest {
  displayName?: string;
  description?: string;
  instructions?: string;
  model?: string;
  tools?: DynamicToolDefinition[];
  testExamples?: DynamicTestExample[];
}

// Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

// Audit types
export interface AuditLog {
  id: string;
  agentId: string;
  operation: AuditOperation;
  userId?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type AuditOperation = 'create' | 'update' | 'delete' | 'execute' | 'enable' | 'disable';

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ChatSession {
  id: string;
  agentId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// Tool execution types
export interface ToolExecutionResult {
  success: boolean;
  result?: unknown;
  error?: ToolExecutionError;
  duration: number;
}

export interface ToolExecutionError {
  code: string;
  message: string;
  stack?: string;
}

// Agent relation types (for graph visualization)
export interface AgentRelation {
  sourceId: string;
  targetId: string;
  relationType: 'delegates' | 'calls' | 'inherits';
  metadata?: Record<string, unknown>;
}

export interface AgentNode {
  id: string;
  displayName: string;
  description: string;
  status: AgentStatus;
  toolCount: number;
  position?: { x: number; y: number };
}

// List/Query types
export interface AgentListParams {
  status?: AgentStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'displayName' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
