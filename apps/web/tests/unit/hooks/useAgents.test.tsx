import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAgents, useAgent, useCreateAgent, useUpdateAgent, useDeleteAgent } from '@/hooks/useAgents'
import * as agentsApi from '@/api/agents'
import type { DynamicAgentDefinition, CreateAgentRequest, UpdateAgentRequest } from '@/types'

vi.mock('@/api/agents')

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useAgents hooks', () => {
  const mockAgent: DynamicAgentDefinition = {
    agentId: 'test-agent',
    className: 'TestAgent',
    displayName: 'Test Agent',
    description: 'A test agent',
    instructions: 'Test instructions',
    model: 'gpt-4',
    status: 'active',
    version: 1,
    tools: [],
    testExamples: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useAgents', () => {
    it('should fetch agents successfully', async () => {
      vi.mocked(agentsApi.getAgents).mockResolvedValue([mockAgent])

      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual([mockAgent])
      expect(agentsApi.getAgents).toHaveBeenCalledWith(undefined)
    })

    it('should fetch agents with filters', async () => {
      vi.mocked(agentsApi.getAgents).mockResolvedValue([mockAgent])

      const params = { status: 'active' as const }
      const { result } = renderHook(() => useAgents(params), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(agentsApi.getAgents).toHaveBeenCalledWith(params)
    })

    it('should handle error', async () => {
      const error = new Error('Failed to fetch')
      vi.mocked(agentsApi.getAgents).mockRejectedValue(error)

      const { result } = renderHook(() => useAgents(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeDefined()
    })
  })

  describe('useAgent', () => {
    it('should fetch a single agent', async () => {
      vi.mocked(agentsApi.getAgent).mockResolvedValue(mockAgent)

      const { result } = renderHook(() => useAgent('test-agent'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockAgent)
      expect(agentsApi.getAgent).toHaveBeenCalledWith('test-agent')
    })

    it('should not fetch when agentId is undefined', async () => {
      const { result } = renderHook(() => useAgent(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
      expect(agentsApi.getAgent).not.toHaveBeenCalled()
    })
  })

  describe('useCreateAgent', () => {
    it('should create an agent', async () => {
      vi.mocked(agentsApi.createAgent).mockResolvedValue(mockAgent)

      const { result } = renderHook(() => useCreateAgent(), {
        wrapper: createWrapper(),
      })

      const createRequest: CreateAgentRequest = {
        agentId: 'new-agent',
        displayName: 'New Agent',
        description: 'A new agent',
        instructions: 'New instructions',
      }

      result.current.mutate(createRequest)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(agentsApi.createAgent).toHaveBeenCalledWith(createRequest)
    })
  })

  describe('useUpdateAgent', () => {
    it('should update an agent', async () => {
      vi.mocked(agentsApi.updateAgent).mockResolvedValue({
        ...mockAgent,
        displayName: 'Updated Agent',
      })

      const { result } = renderHook(() => useUpdateAgent(), {
        wrapper: createWrapper(),
      })

      const updateRequest: UpdateAgentRequest = {
        displayName: 'Updated Agent',
      }

      result.current.mutate({ agentId: 'test-agent', data: updateRequest })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(agentsApi.updateAgent).toHaveBeenCalledWith('test-agent', updateRequest)
    })
  })

  describe('useDeleteAgent', () => {
    it('should delete an agent', async () => {
      vi.mocked(agentsApi.deleteAgent).mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteAgent(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('test-agent')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(agentsApi.deleteAgent).toHaveBeenCalledWith('test-agent')
    })
  })
})
