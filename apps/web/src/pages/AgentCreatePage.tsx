import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useCreateAgent } from '@/hooks'

export function AgentCreatePage() {
  const navigate = useNavigate()
  const createAgent = useCreateAgent()

  const [formData, setFormData] = useState({
    agentId: '',
    displayName: '',
    description: '',
    instructions: '',
    model: 'gpt-4',
  })

  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      await createAgent.mutateAsync(formData)
      navigate('/agents')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent')
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create New Agent</CardTitle>
          <CardDescription>
            Fill in the details to create a new dynamic agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="agentId" className="text-sm font-medium">
                Agent ID
              </label>
              <Input
                id="agentId"
                name="agentId"
                placeholder="my-agent"
                value={formData.agentId}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier (lowercase, hyphens allowed)
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium">
                Display Name
              </label>
              <Input
                id="displayName"
                name="displayName"
                placeholder="My Agent"
                value={formData.displayName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                name="description"
                placeholder="What does this agent do?"
                value={formData.description}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="instructions" className="text-sm font-medium">
                Instructions
              </label>
              <Textarea
                id="instructions"
                name="instructions"
                placeholder="Instructions for the agent..."
                value={formData.instructions}
                onChange={handleChange}
                rows={5}
                required
              />
              <p className="text-xs text-muted-foreground">
                System prompt for the agent
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="model" className="text-sm font-medium">
                Model
              </label>
              <Input
                id="model"
                name="model"
                placeholder="gpt-4"
                value={formData.model}
                onChange={handleChange}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/agents')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createAgent.isPending}>
                {createAgent.isPending ? 'Creating...' : 'Create Agent'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
