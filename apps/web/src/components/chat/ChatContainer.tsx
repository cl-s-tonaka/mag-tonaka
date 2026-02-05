import { useChat } from '@/hooks/useChat'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'

interface ChatContainerProps {
  agentId: string
  agentName?: string
}

export function ChatContainer({ agentId, agentName }: ChatContainerProps) {
  const { messages, sendMessage, clearMessages, isLoading, error } = useChat(agentId)

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="font-semibold">{agentName || 'Chat'}</h2>
          <p className="text-sm text-muted-foreground">Agent ID: {agentId}</p>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearMessages}
            aria-label="Clear chat"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      {/* Error message */}
      {error && (
        <div className="border-t border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
          Error: {error.message}
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4">
        <ChatInput
          onSend={sendMessage}
          isLoading={isLoading}
          placeholder={`Message ${agentName || 'the agent'}...`}
        />
      </div>
    </div>
  )
}
