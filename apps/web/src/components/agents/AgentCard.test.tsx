import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { AgentCard } from './AgentCard'
import type { DynamicAgentDefinition } from '@/types'

const mockAgent: DynamicAgentDefinition = {
  agentId: 'test-agent',
  className: 'TestAgent',
  displayName: 'Test Agent',
  description: 'A test agent for testing purposes',
  instructions: 'Test instructions',
  model: 'gpt-4',
  status: 'active',
  version: 1,
  tools: [
    {
      name: 'tool1',
      description: 'Tool 1',
      parameters: [],
      implementation: '',
    },
    {
      name: 'tool2',
      description: 'Tool 2',
      parameters: [],
      implementation: '',
    },
  ],
  testExamples: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('AgentCard', () => {
  it('should render agent display name', () => {
    renderWithRouter(<AgentCard agent={mockAgent} />)
    expect(screen.getByText('Test Agent')).toBeInTheDocument()
  })

  it('should render agent description', () => {
    renderWithRouter(<AgentCard agent={mockAgent} />)
    expect(screen.getByText('A test agent for testing purposes')).toBeInTheDocument()
  })

  it('should render status badge', () => {
    renderWithRouter(<AgentCard agent={mockAgent} />)
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('should render inactive status with different style', () => {
    const inactiveAgent = { ...mockAgent, status: 'inactive' as const }
    renderWithRouter(<AgentCard agent={inactiveAgent} />)
    expect(screen.getByText('inactive')).toBeInTheDocument()
  })

  it('should render tool count', () => {
    renderWithRouter(<AgentCard agent={mockAgent} />)
    expect(screen.getByText(/2 tools/i)).toBeInTheDocument()
  })

  it('should render model name', () => {
    renderWithRouter(<AgentCard agent={mockAgent} />)
    expect(screen.getByText('gpt-4')).toBeInTheDocument()
  })

  it('should call onClick when card is clicked', async () => {
    const handleClick = vi.fn()
    renderWithRouter(<AgentCard agent={mockAgent} onClick={handleClick} />)

    await userEvent.click(screen.getByRole('article'))

    expect(handleClick).toHaveBeenCalledWith(mockAgent)
  })

  it('should link to agent detail page', () => {
    renderWithRouter(<AgentCard agent={mockAgent} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/agents/test-agent')
  })
})
