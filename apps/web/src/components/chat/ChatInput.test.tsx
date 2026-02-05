import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInput } from './ChatInput'

describe('ChatInput', () => {
  it('should render input field', () => {
    render(<ChatInput onSend={vi.fn()} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('should render send button', () => {
    render(<ChatInput onSend={vi.fn()} />)
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('should call onSend when clicking send button', async () => {
    const handleSend = vi.fn()
    render(<ChatInput onSend={handleSend} />)

    await userEvent.type(screen.getByRole('textbox'), 'Hello')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))

    expect(handleSend).toHaveBeenCalledWith('Hello')
  })

  it('should call onSend when pressing Enter', async () => {
    const handleSend = vi.fn()
    render(<ChatInput onSend={handleSend} />)

    await userEvent.type(screen.getByRole('textbox'), 'Hello{enter}')

    expect(handleSend).toHaveBeenCalledWith('Hello')
  })

  it('should not call onSend with empty input', async () => {
    const handleSend = vi.fn()
    render(<ChatInput onSend={handleSend} />)

    await userEvent.click(screen.getByRole('button', { name: /send/i }))

    expect(handleSend).not.toHaveBeenCalled()
  })

  it('should clear input after sending', async () => {
    const handleSend = vi.fn()
    render(<ChatInput onSend={handleSend} />)

    const input = screen.getByRole('textbox')
    await userEvent.type(input, 'Hello')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))

    expect(input).toHaveValue('')
  })

  it('should disable input and button when disabled', () => {
    render(<ChatInput onSend={vi.fn()} disabled />)

    expect(screen.getByRole('textbox')).toBeDisabled()
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
  })

  it('should disable button when loading', () => {
    render(<ChatInput onSend={vi.fn()} isLoading />)

    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
  })

  it('should show placeholder text', () => {
    render(<ChatInput onSend={vi.fn()} placeholder="Type your message..." />)
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument()
  })
})
