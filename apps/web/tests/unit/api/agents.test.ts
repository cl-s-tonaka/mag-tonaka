import { describe, it, expect, beforeEach, vi } from 'vitest'
import { apiClient } from '@/api/client'
import {
  getAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  executeAgent,
} from '@/api/agents'
import type {
  DynamicAgentDefinition,
  CreateAgentRequest,
  UpdateAgentRequest,
} from '@/types'

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('Agents API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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

  describe('getAgents', () => {
    it('should fetch all agents', async () => {
      const mockResponse = { data: { success: true, data: [mockAgent] } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await getAgents()

      expect(apiClient.get).toHaveBeenCalledWith('/v2/dynamic-agents', {
        params: undefined,
      })
      expect(result).toEqual([mockAgent])
    })

    it('should fetch agents with filters', async () => {
      const mockResponse = { data: { success: true, data: [mockAgent] } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const params = { status: 'active' as const, search: 'test' }
      const result = await getAgents(params)

      expect(apiClient.get).toHaveBeenCalledWith('/v2/dynamic-agents', {
        params,
      })
      expect(result).toEqual([mockAgent])
    })

    it('should throw on API error', async () => {
      const mockError = new Error('API Error')
      vi.mocked(apiClient.get).mockRejectedValue(mockError)

      await expect(getAgents()).rejects.toThrow('API Error')
    })
  })

  describe('getAgent', () => {
    it('should fetch a single agent by ID', async () => {
      const mockResponse = { data: { success: true, data: mockAgent } }
      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await getAgent('test-agent')

      expect(apiClient.get).toHaveBeenCalledWith('/v2/dynamic-agents/test-agent')
      expect(result).toEqual(mockAgent)
    })

    it('should throw on not found', async () => {
      const mockError = new Error('Not found')
      vi.mocked(apiClient.get).mockRejectedValue(mockError)

      await expect(getAgent('non-existent')).rejects.toThrow('Not found')
    })
  })

  describe('createAgent', () => {
    it('should create a new agent', async () => {
      const createRequest: CreateAgentRequest = {
        agentId: 'new-agent',
        displayName: 'New Agent',
        description: 'A new agent',
        instructions: 'New instructions',
      }
      const mockResponse = { data: { success: true, data: mockAgent } }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await createAgent(createRequest)

      expect(apiClient.post).toHaveBeenCalledWith(
        '/v2/dynamic-agents',
        createRequest
      )
      expect(result).toEqual(mockAgent)
    })

    it('should throw on validation error', async () => {
      const createRequest: CreateAgentRequest = {
        agentId: '',
        displayName: '',
        description: '',
        instructions: '',
      }
      const mockError = new Error('Validation failed')
      vi.mocked(apiClient.post).mockRejectedValue(mockError)

      await expect(createAgent(createRequest)).rejects.toThrow('Validation failed')
    })
  })

  describe('updateAgent', () => {
    it('should update an existing agent', async () => {
      const updateRequest: UpdateAgentRequest = {
        displayName: 'Updated Agent',
        description: 'Updated description',
      }
      const updatedAgent = { ...mockAgent, ...updateRequest }
      const mockResponse = { data: { success: true, data: updatedAgent } }
      vi.mocked(apiClient.put).mockResolvedValue(mockResponse)

      const result = await updateAgent('test-agent', updateRequest)

      expect(apiClient.put).toHaveBeenCalledWith(
        '/v2/dynamic-agents/test-agent',
        updateRequest
      )
      expect(result).toEqual(updatedAgent)
    })
  })

  describe('deleteAgent', () => {
    it('should delete an agent', async () => {
      const mockResponse = { data: { success: true } }
      vi.mocked(apiClient.delete).mockResolvedValue(mockResponse)

      await deleteAgent('test-agent')

      expect(apiClient.delete).toHaveBeenCalledWith('/v2/dynamic-agents/test-agent')
    })
  })

  describe('executeAgent', () => {
    it('should execute an agent with a message', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            response: 'Agent response',
            sessionId: 'session-123',
          },
        },
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await executeAgent('test-agent', 'Hello')

      expect(apiClient.post).toHaveBeenCalledWith(
        '/v2/dynamic-agents/test-agent/execute',
        { message: 'Hello', sessionId: undefined }
      )
      expect(result).toEqual({
        response: 'Agent response',
        sessionId: 'session-123',
      })
    })

    it('should execute agent with existing session', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            response: 'Agent response',
            sessionId: 'session-123',
          },
        },
      }
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await executeAgent('test-agent', 'Hello', 'session-123')

      expect(apiClient.post).toHaveBeenCalledWith(
        '/v2/dynamic-agents/test-agent/execute',
        { message: 'Hello', sessionId: 'session-123' }
      )
      expect(result).toEqual({
        response: 'Agent response',
        sessionId: 'session-123',
      })
    })
  })
})
