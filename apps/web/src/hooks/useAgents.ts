import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  executeAgent,
} from '@/api/agents'
import type {
  AgentListParams,
  CreateAgentRequest,
  UpdateAgentRequest,
} from '@/types'

// Query keys
export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (params?: AgentListParams) => [...agentKeys.lists(), params] as const,
  details: () => [...agentKeys.all, 'detail'] as const,
  detail: (id: string) => [...agentKeys.details(), id] as const,
}

/**
 * Hook to fetch all agents
 */
export function useAgents(params?: AgentListParams) {
  return useQuery({
    queryKey: agentKeys.list(params),
    queryFn: () => getAgents(params),
  })
}

/**
 * Hook to fetch a single agent
 */
export function useAgent(agentId: string | undefined) {
  return useQuery({
    queryKey: agentKeys.detail(agentId ?? ''),
    queryFn: () => getAgent(agentId!),
    enabled: !!agentId,
  })
}

/**
 * Hook to create a new agent
 */
export function useCreateAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAgentRequest) => createAgent(data),
    onSuccess: () => {
      // Invalidate all agent lists
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() })
    },
  })
}

/**
 * Hook to update an existing agent
 */
export function useUpdateAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ agentId, data }: { agentId: string; data: UpdateAgentRequest }) =>
      updateAgent(agentId, data),
    onSuccess: (_, variables) => {
      // Invalidate the specific agent and all lists
      queryClient.invalidateQueries({ queryKey: agentKeys.detail(variables.agentId) })
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() })
    },
  })
}

/**
 * Hook to delete an agent
 */
export function useDeleteAgent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (agentId: string) => deleteAgent(agentId),
    onSuccess: (_, agentId) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: agentKeys.detail(agentId) })
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() })
    },
  })
}

/**
 * Hook to execute an agent
 */
export function useExecuteAgent() {
  return useMutation({
    mutationFn: ({
      agentId,
      message,
      sessionId,
    }: {
      agentId: string
      message: string
      sessionId?: string
    }) => executeAgent(agentId, message, sessionId),
  })
}
