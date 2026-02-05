import { useRef, useEffect } from 'react'
import { MessageItem } from './MessageItem'
import type { ChatMessage } from '@/types'

interface MessageListProps {
  messages: ChatMessage[]
  isLoading?: boolean
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p>Start a conversation by typing a message below.</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-4 p-4" role="list">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      {isLoading && (
        <li className="flex justify-start">
          <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm">
            <span className="animate-pulse">Thinking...</span>
          </div>
        </li>
      )}
      <div ref={bottomRef} />
    </ul>
  )
}
