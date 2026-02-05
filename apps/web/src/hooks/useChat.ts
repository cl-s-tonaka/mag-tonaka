import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { executeAgent } from '@/api/agents'
import type { ChatMessage } from '@/types'

interface UseChatOptions {
  onError?: (error: Error) => void
  onSuccess?: (response: string) => void
}

export function useChat(agentId: string, options?: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)

  const mutation = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      return executeAgent(agentId, message, sessionId)
    },
    onSuccess: (data) => {
      // Update session ID if returned
      if (data.sessionId) {
        setSessionId(data.sessionId)
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        agentId,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setError(null)
      options?.onSuccess?.(data.response)
    },
    onError: (err: Error) => {
      setError(err)
      options?.onError?.(err)
    },
  })

  const sendMessage = useCallback(
    (content: string) => {
      // Add user message immediately
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])

      // Send to API
      mutation.mutate({ message: content })
    },
    [mutation]
  )

  const clearMessages = useCallback(() => {
    setMessages([])
    setSessionId(undefined)
    setError(null)
  }, [])

  return {
    messages,
    sendMessage,
    clearMessages,
    isLoading: mutation.isPending,
    error,
    sessionId,
  }
}
