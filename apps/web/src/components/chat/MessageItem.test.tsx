import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageItem } from './MessageItem'
import type { ChatMessage } from '@/types'

describe('MessageItem', () => {
  const userMessage: ChatMessage = {
    id: '1',
    role: 'user',
    content: 'Hello, how are you?',
    timestamp: '2024-01-01T12:00:00Z',
  }

  const assistantMessage: ChatMessage = {
    id: '2',
    role: 'assistant',
    content: 'I am doing well, thank you!',
    agentId: 'test-agent',
    timestamp: '2024-01-01T12:00:01Z',
  }

  it('should render user message content', () => {
    render(<MessageItem message={userMessage} />)
    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument()
  })

  it('should render assistant message content', () => {
    render(<MessageItem message={assistantMessage} />)
    expect(screen.getByText('I am doing well, thank you!')).toBeInTheDocument()
  })

  it('should show "You" label for user messages', () => {
    render(<MessageItem message={userMessage} />)
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('should show "Assistant" label for assistant messages', () => {
    render(<MessageItem message={assistantMessage} />)
    expect(screen.getByText('Assistant')).toBeInTheDocument()
  })

  it('should apply different styles for user and assistant messages', () => {
    const { rerender } = render(<MessageItem message={userMessage} />)
    const userItem = screen.getByRole('listitem')
    expect(userItem.className).toContain('justify-end')

    rerender(<MessageItem message={assistantMessage} />)
    const assistantItem = screen.getByRole('listitem')
    expect(assistantItem.className).toContain('justify-start')
  })
})
