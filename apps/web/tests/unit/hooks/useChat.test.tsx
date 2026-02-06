import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useChat } from '@/hooks/useChat'
import * as agentsApi from '@/api/agents'

vi.mock('@/api/agents', () => ({
  executeAgent: vi.fn(),
}))

describe('useChat', () => {
  let queryClient: QueryClient

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  it('should initialize with empty messages', () => {
    const { result } = renderHook(() => useChat('test-agent'), { wrapper })

    expect(result.current.messages).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.sessionId).toBeUndefined()
  })

  it('should add user message immediately when sending', async () => {
    vi.mocked(agentsApi.executeAgent).mockResolvedValue({
      response: 'Hello!',
      sessionId: 'session-1',
    })

    const { result } = renderHook(() => useChat('test-agent'), { wrapper })

    act(() => {
      result.current.sendMessage('こんにちは')
    })

    // User message should be added immediately
    expect(result.current.messages).toHaveLength(1)
    expect(result.current.messages[0].role).toBe('user')
    expect(result.current.messages[0].content).toBe('こんにちは')
  })

  it('should receive assistant response after sending message', async () => {
    vi.mocked(agentsApi.executeAgent).mockResolvedValue({
      response: 'こんにちは！どのようにお手伝いできますか？',
      sessionId: 'session-1',
    })

    const { result } = renderHook(() => useChat('greeting-agent'), { wrapper })

    act(() => {
      result.current.sendMessage('こんにちは')
    })

    // Wait for assistant response
    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
    })

    // Verify user message
    expect(result.current.messages[0].role).toBe('user')
    expect(result.current.messages[0].content).toBe('こんにちは')

    // Verify assistant response
    expect(result.current.messages[1].role).toBe('assistant')
    expect(result.current.messages[1].content).toBe('こんにちは！どのようにお手伝いできますか？')
    expect(result.current.messages[1].agentId).toBe('greeting-agent')
  })

  it('should update sessionId after receiving response', async () => {
    vi.mocked(agentsApi.executeAgent).mockResolvedValue({
      response: 'Hello!',
      sessionId: 'new-session-123',
    })

    const { result } = renderHook(() => useChat('test-agent'), { wrapper })

    act(() => {
      result.current.sendMessage('Hi')
    })

    await waitFor(() => {
      expect(result.current.sessionId).toBe('new-session-123')
    })
  })

  it('should set loading state while waiting for response', async () => {
    let resolvePromise: (value: { response: string; sessionId: string }) => void
    const promise = new Promise<{ response: string; sessionId: string }>((resolve) => {
      resolvePromise = resolve
    })
    vi.mocked(agentsApi.executeAgent).mockReturnValue(promise)

    const { result } = renderHook(() => useChat('test-agent'), { wrapper })

    act(() => {
      result.current.sendMessage('Hello')
    })

    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolvePromise!({ response: 'Hello!', sessionId: 'session-1' })
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('should set error when API call fails', async () => {
    const mockError = new Error('Network error')
    vi.mocked(agentsApi.executeAgent).mockRejectedValue(mockError)

    const { result } = renderHook(() => useChat('test-agent'), { wrapper })

    act(() => {
      result.current.sendMessage('Hello')
    })

    await waitFor(() => {
      expect(result.current.error).toEqual(mockError)
    })
  })

  it('should call onError callback when API call fails', async () => {
    const mockError = new Error('Network error')
    vi.mocked(agentsApi.executeAgent).mockRejectedValue(mockError)

    const onError = vi.fn()
    const { result } = renderHook(() => useChat('test-agent', { onError }), { wrapper })

    act(() => {
      result.current.sendMessage('Hello')
    })

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(mockError)
    })
  })

  it('should call onSuccess callback when response is received', async () => {
    vi.mocked(agentsApi.executeAgent).mockResolvedValue({
      response: 'Success response',
      sessionId: 'session-1',
    })

    const onSuccess = vi.fn()
    const { result } = renderHook(() => useChat('test-agent', { onSuccess }), { wrapper })

    act(() => {
      result.current.sendMessage('Hello')
    })

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('Success response')
    })
  })

  it('should clear messages, sessionId, and error when clearMessages is called', async () => {
    vi.mocked(agentsApi.executeAgent).mockResolvedValue({
      response: 'Hello!',
      sessionId: 'session-1',
    })

    const { result } = renderHook(() => useChat('test-agent'), { wrapper })

    // Send a message first
    act(() => {
      result.current.sendMessage('Hi')
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
    })

    // Clear messages
    act(() => {
      result.current.clearMessages()
    })

    expect(result.current.messages).toEqual([])
    expect(result.current.sessionId).toBeUndefined()
    expect(result.current.error).toBeNull()
  })

  it('should maintain conversation history across multiple messages', async () => {
    vi.mocked(agentsApi.executeAgent)
      .mockResolvedValueOnce({
        response: 'First response',
        sessionId: 'session-1',
      })
      .mockResolvedValueOnce({
        response: 'Second response',
        sessionId: 'session-1',
      })

    const { result } = renderHook(() => useChat('test-agent'), { wrapper })

    // First message
    act(() => {
      result.current.sendMessage('First message')
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2)
    })

    // Second message
    act(() => {
      result.current.sendMessage('Second message')
    })

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(4)
    })

    expect(result.current.messages[0].content).toBe('First message')
    expect(result.current.messages[1].content).toBe('First response')
    expect(result.current.messages[2].content).toBe('Second message')
    expect(result.current.messages[3].content).toBe('Second response')
  })
})
