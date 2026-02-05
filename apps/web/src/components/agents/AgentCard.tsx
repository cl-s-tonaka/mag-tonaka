import { Link } from 'react-router-dom'
import { Wrench, Bot } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DynamicAgentDefinition } from '@/types'
import { cn } from '@/lib/utils'

interface AgentCardProps {
  agent: DynamicAgentDefinition
  onClick?: (agent: DynamicAgentDefinition) => void
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const statusVariant = {
    active: 'success',
    inactive: 'secondary',
    deleted: 'destructive',
  } as const

  const handleClick = () => {
    onClick?.(agent)
  }

  return (
    <Link to={`/agents/${agent.agentId}`}>
      <Card
        role="article"
        className={cn(
          'cursor-pointer transition-shadow hover:shadow-md',
          onClick && 'hover:border-primary'
        )}
        onClick={handleClick}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">{agent.displayName}</CardTitle>
            </div>
            <Badge variant={statusVariant[agent.status]}>{agent.status}</Badge>
          </div>
          <CardDescription className="line-clamp-2">
            {agent.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Wrench className="h-4 w-4" />
              <span>{agent.tools.length} tools</span>
            </div>
            <span className="rounded bg-muted px-2 py-1 font-mono text-xs">
              {agent.model}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
