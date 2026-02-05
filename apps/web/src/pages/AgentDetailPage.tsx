import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Trash2, MessageSquare, Wrench } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAgent, useDeleteAgent } from '@/hooks'

export function AgentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: agent, isLoading, error } = useAgent(id)
  const deleteMutation = useDeleteAgent()

  const handleDelete = async () => {
    if (!id) return
    if (!confirm('Are you sure you want to delete this agent?')) return

    try {
      await deleteMutation.mutateAsync(id)
      navigate('/agents')
    } catch {
      // Error handling is done by the mutation
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg border bg-muted" />
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="space-y-4">
        <Link to="/agents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </Button>
        </Link>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Agent not found or failed to load.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusVariant = {
    active: 'success',
    inactive: 'secondary',
    deleted: 'destructive',
  } as const

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link to="/agents">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Agents
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
              {agent.displayName}
            </h1>
            <Badge variant={statusVariant[agent.status]}>{agent.status}</Badge>
          </div>
          <p className="text-muted-foreground">{agent.description}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/chat?agent=${agent.agentId}`}>
            <Button variant="outline">
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat
            </Button>
          </Link>
          <Link to={`/agents/${agent.agentId}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Agent Info */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Agent ID
              </label>
              <p className="font-mono text-sm">{agent.agentId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Class Name
              </label>
              <p className="font-mono text-sm">{agent.className}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Model
              </label>
              <p className="font-mono text-sm">{agent.model}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Version
              </label>
              <p className="font-mono text-sm">v{agent.version}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Created At
              </label>
              <p className="text-sm">
                {agent.createdAt
                  ? new Date(agent.createdAt).toLocaleString()
                  : 'N/A'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Updated At
              </label>
              <p className="text-sm">
                {agent.updatedAt
                  ? new Date(agent.updatedAt).toLocaleString()
                  : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
            <CardDescription>
              System instructions for this agent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
              {agent.instructions}
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Tools ({agent.tools.length})
          </CardTitle>
          <CardDescription>Available tools for this agent</CardDescription>
        </CardHeader>
        <CardContent>
          {agent.tools.length === 0 ? (
            <p className="text-muted-foreground">No tools configured</p>
          ) : (
            <div className="space-y-4">
              {agent.tools.map((tool, index) => (
                <div
                  key={tool.id || index}
                  className="rounded-lg border p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{tool.name}</h4>
                    <Badge variant="outline">{tool.status || 'active'}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tool.description}
                  </p>
                  {tool.parameters.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Parameters:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {tool.parameters.map((param) => (
                          <Badge key={param.name} variant="secondary" className="text-xs">
                            {param.name}: {param.zodType}
                            {param.optional && ' (optional)'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Examples */}
      {agent.testExamples.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Examples</CardTitle>
            <CardDescription>
              Sample inputs and expected behaviors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {agent.testExamples.map((example, index) => (
                <div
                  key={example.id || index}
                  className="rounded-lg border p-4 space-y-2"
                >
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Input
                    </label>
                    <p className="text-sm">{example.input}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Description
                    </label>
                    <p className="text-sm">{example.description}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Expected Behavior
                    </label>
                    <p className="text-sm">{example.expectedBehavior}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
