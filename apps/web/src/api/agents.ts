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
 * Execute agent response
 */
export interface ExecuteAgentResponse {
  response: string
  sessionId: string
}

/**
 * Execute an agent with a message
 */
export async function executeAgent(
  agentId: string,
  message: string,
  sessionId?: string
): Promise<ExecuteAgentResponse> {
  const response = await apiClient.post<ApiResponse<ExecuteAgentResponse>>(
    `${AGENTS_ENDPOINT}/${agentId}/execute`,
    { message, sessionId }
  )
  return response.data.data!
}
