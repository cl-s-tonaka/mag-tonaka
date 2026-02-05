import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('MainLayout', () => {
  it('should render header', () => {
    renderWithRouter(<MainLayout>Content</MainLayout>)
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('should render sidebar', () => {
    renderWithRouter(<MainLayout>Content</MainLayout>)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('should render children in main area', () => {
    renderWithRouter(<MainLayout>Test Content</MainLayout>)
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should render logo in header', () => {
    renderWithRouter(<MainLayout>Content</MainLayout>)
    expect(screen.getByText('Dynamic Agents')).toBeInTheDocument()
  })

  it('should render navigation links', () => {
    renderWithRouter(<MainLayout>Content</MainLayout>)
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /chat/i })).toBeInTheDocument()
    // Check for exact "Agents" text (not "Dynamic Agents")
    expect(screen.getByRole('link', { name: 'Agents' })).toBeInTheDocument()
  })
})
