import { useMemo, useCallback } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useAgents } from '@/hooks'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

export function AgentRelationsPage() {
  const { data: agents, isLoading, error } = useAgents()

  const initialNodes: Node[] = useMemo(() => {
    if (!agents || agents.length === 0) return []

    const centerX = 400
    const centerY = 300
    const radius = 200

    return agents.map((agent, index) => {
      const angle = (2 * Math.PI * index) / agents.length
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)

      return {
        id: agent.agentId,
        type: 'default',
        position: { x, y },
        data: {
          label: (
            <div className="p-2 text-center">
              <div className="font-semibold">{agent.displayName}</div>
              <div className="text-xs text-gray-500">
                {agent.tools?.length ?? 0} tools
              </div>
              <div
                className={`mt-1 text-xs px-2 py-0.5 rounded ${
                  agent.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {agent.status}
              </div>
            </div>
          ),
        },
        style: {
          border: '2px solid #3b82f6',
          borderRadius: '8px',
          backgroundColor: 'white',
          width: 150,
        },
      }
    })
  }, [agents])

  const initialEdges: Edge[] = useMemo(() => {
    // For now, create edges between agents that might work together
    // This could be enhanced based on actual agent relationships
    if (!agents || agents.length < 2) return []

    const edges: Edge[] = []

    // Create a simple connection pattern for demonstration
    // In a real app, this would be based on actual relationships
    for (let i = 0; i < agents.length; i++) {
      const nextIndex = (i + 1) % agents.length
      edges.push({
        id: `e${agents[i].agentId}-${agents[nextIndex].agentId}`,
        source: agents[i].agentId,
        target: agents[nextIndex].agentId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#94a3b8' },
      })
    }

    return edges
  }, [agents])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update nodes when agents change
  useMemo(() => {
    if (initialNodes.length > 0) {
      setNodes(initialNodes)
      setEdges(initialEdges)
    }
  }, [initialNodes, initialEdges, setNodes, setEdges])

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('Node clicked:', node.id)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading agents...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-destructive">Failed to load agents</p>
      </div>
    )
  }

  if (!agents || agents.length === 0) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>No Agents Found</CardTitle>
          <CardDescription>
            Create some agents to see their relationships here.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agent Relations</h1>
        <p className="text-muted-foreground">
          Visualize the relationships between your agents
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent Network</CardTitle>
          <CardDescription>
            {agents.length} agents connected. Drag nodes to rearrange.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] w-full border rounded-lg overflow-hidden">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              fitView
              attributionPosition="bottom-left"
            >
              <Controls />
              <MiniMap
                nodeStrokeColor="#3b82f6"
                nodeColor="#dbeafe"
                nodeBorderRadius={4}
              />
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agent Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{agents.length}</div>
              <div className="text-sm text-muted-foreground">Total Agents</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                {agents.filter((a) => a.status === 'active').length}
              </div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                {agents.reduce((sum, a) => sum + (a.tools?.length ?? 0), 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Tools</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{edges.length}</div>
              <div className="text-sm text-muted-foreground">Connections</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
