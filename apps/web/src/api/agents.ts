import { apiClient } from './client'
import type {
  DynamicAgentDefinition,
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentListParams,
  ApiResponse,
} from '@/types'

const AGENTS_ENDPOINT = '/v2/dynamic-agents'

/**
 * API response for agents list
 */
interface AgentsListResponse {
  agents: DynamicAgentDefinition[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

/**
 * Fetch all agents with optional filters
 */
export async function getAgents(
  params?: AgentListParams
): Promise<DynamicAgentDefinition[]> {
  const response = await apiClient.get<ApiResponse<AgentsListResponse>>(
    AGENTS_ENDPOINT,
    { params }
  )
  return response.data.data?.agents ?? []
}

/**
 * Fetch a single agent by ID
 */
export async function getAgent(agentId: string): Promise<DynamicAgentDefinition> {
  const response = await apiClient.get<ApiResponse<DynamicAgentDefinition>>(
    `${AGENTS_ENDPOINT}/${agentId}`
  )
  return response.data.data!
}

/**
 * Create a new agent
 */
export async function createAgent(
  data: CreateAgentRequest
): Promise<DynamicAgentDefinition> {
  const response = await apiClient.post<ApiResponse<DynamicAgentDefinition>>(
    AGENTS_ENDPOINT,
    data
  )
  return response.data.data!
}

/**
 * Update an existing agent
 */
export async function updateAgent(
  agentId: string,
  data: UpdateAgentRequest
): Promise<DynamicAgentDefinition> {
  const response = await apiClient.put<ApiResponse<DynamicAgentDefinition>>(
    `${AGENTS_ENDPOINT}/${agentId}`,
    data
  )
  return response.data.data!
}

/**
 * Delete an agent
 */
export async function deleteAgent(agentId: string): Promise<void> {
  await apiClient.delete(`${AGENTS_ENDPOINT}/${agentId}`)
}

/**
 * Chat agent response
 */
export interface ChatAgentResponse {
  agentId: string
  response: string
  toolCalls?: unknown[]
  conversationHistory?: unknown[]
}

/**
 * Execute agent response (alias for compatibility)
 */
export interface ExecuteAgentResponse {
  response: string
  sessionId: string
}

/**
 * Chat with an agent
 */
export async function chatWithAgent(
  agentId: string,
  message: string,
  clearHistory?: boolean
): Promise<ChatAgentResponse> {
  const response = await apiClient.post<ApiResponse<ChatAgentResponse>>(
    `${AGENTS_ENDPOINT}/${agentId}/chat`,
    { message, clearHistory }
  )
  return response.data.data!
}

/**
 * Execute an agent with a message (uses chat endpoint)
 */
export async function executeAgent(
  agentId: string,
  message: string,
  sessionId?: string
): Promise<ExecuteAgentResponse> {
  const chatResponse = await chatWithAgent(agentId, message, !sessionId)
  return {
    response: chatResponse.response,
    sessionId: chatResponse.agentId, // Use agentId as session identifier
  }
}
