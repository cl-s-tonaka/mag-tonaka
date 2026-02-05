import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bot, ChevronDown, Check } from 'lucide-react'
import { ChatContainer } from '@/components/chat'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAgents } from '@/hooks'
import { cn } from '@/lib/utils'

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedAgentId = searchParams.get('agent')
  const [isSelectOpen, setIsSelectOpen] = useState(false)

  const { data: agents, isLoading } = useAgents({ status: 'active' })

  const selectedAgent = agents?.find((a) => a.agentId === selectedAgentId)

  const handleSelectAgent = (agentId: string) => {
    setSearchParams({ agent: agentId })
    setIsSelectOpen(false)
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Chat</h1>

        {/* Agent Selector */}
        <div className="relative">
          <Button
            variant="outline"
            className="w-[200px] justify-between"
            onClick={() => setIsSelectOpen(!isSelectOpen)}
          >
            {selectedAgent ? (
              <>
                <Bot className="mr-2 h-4 w-4" />
                {selectedAgent.displayName}
              </>
            ) : (
              'Select an agent'
            )}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>

          {isSelectOpen && (
            <Card className="absolute right-0 top-full z-10 mt-1 w-[250px] p-1">
              {isLoading ? (
                <p className="p-2 text-sm text-muted-foreground">Loading...</p>
              ) : agents?.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">
                  No active agents
                </p>
              ) : (
                agents?.map((agent) => (
                  <button
                    key={agent.agentId}
                    className={cn(
                      'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
                      selectedAgentId === agent.agentId && 'bg-accent'
                    )}
                    onClick={() => handleSelectAgent(agent.agentId)}
                  >
                    <div>
                      <div className="font-medium">{agent.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        {agent.description.slice(0, 50)}...
                      </div>
                    </div>
                    {selectedAgentId === agent.agentId && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                ))
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <Card className="flex-1 overflow-hidden">
        {selectedAgent ? (
          <ChatContainer
            agentId={selectedAgent.agentId}
            agentName={selectedAgent.displayName}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
            <Bot className="h-12 w-12" />
            <p>Select an agent to start chatting</p>
          </div>
        )}
      </Card>
    </div>
  )
}
