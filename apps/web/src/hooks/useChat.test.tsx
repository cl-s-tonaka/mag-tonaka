import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useChat } from './useChat'
import * as agentsApi from '@/api/agents'

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

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should start with empty messages', () => {
    const { result } = renderHook(() => useChat('test-agent'), {
      wrapper: createWrapper(),
    })

    expect(result.current.messages).toEqual([])
  })

  it('should add user message when sending', async () => {
    vi.mocked(agentsApi.executeAgent).mockResolvedValue({
      response: 'Hello!',
      sessionId: 'session-123',
    })

    const { result } = renderHook(() => useChat('test-agent'), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.sendMessage('Hello')
    })

    // User message should be added immediately
    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0].role).toBe('user')
    expect(result.current.messages[0].content).toBe('Hello')
  })

  it('should add assistant response after sending', async () => {
    vi.mocked(agentsApi.executeAgent).mockResolvedValue({
      response: 'Hello! How can I help you?',
      sessionId: 'session-123',
    })

    const { result } = renderHook(() => useChat('test-agent'), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.sendMessage('Hello')
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
    })

    expect(result.current.messages[1].role).toBe('assistant')
    expect(result.current.messages[1].content).toBe('Hello! How can I help you?')
  })

  it('should show loading state while sending', async () => {
    // Use a deferred promise for controlled async flow
    vi.mocked(agentsApi.executeAgent).mockImplementation(
      () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({ response: 'Response', sessionId: 'session-123' })
        }, 100)
      })
    )

    const { result } = renderHook(() => useChat('test-agent'), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.sendMessage('Hello')
    })

    // Should be loading immediately after sending
    expect(result.current.isLoading).toBe(true)

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    }, { timeout: 2000 })
  })

  it('should handle errors', async () => {
    const error = new Error('Network error')
    vi.mocked(agentsApi.executeAgent).mockRejectedValue(error)

    const { result } = renderHook(() => useChat('test-agent'), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.sendMessage('Hello')
    })

    await waitFor(() => {
      expect(result.current.error).toBeDefined()
    })
  })

  it('should clear messages', async () => {
    vi.mocked(agentsApi.executeAgent).mockResolvedValue({
      response: 'Hello!',
      sessionId: 'session-123',
    })

    const { result } = renderHook(() => useChat('test-agent'), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.sendMessage('Hello')
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
    })

    act(() => {
      result.current.clearMessages()
    })

    expect(result.current.messages).toEqual([])
  })

  it('should maintain session ID across messages', async () => {
    vi.mocked(agentsApi.executeAgent).mockResolvedValue({
      response: 'Hello!',
      sessionId: 'session-123',
    })

    const { result } = renderHook(() => useChat('test-agent'), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.sendMessage('First')
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
    })

    act(() => {
      result.current.sendMessage('Second')
    })

    await waitFor(() => {
      expect(agentsApi.executeAgent).toHaveBeenLastCalledWith(
        'test-agent',
        'Second',
        'session-123'
      )
    })
  })
})
