import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn utility', () => {
  it('should merge class names', () => {
    const result = cn('px-2', 'py-1')
    expect(result).toBe('px-2 py-1')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    const result = cn('base', isActive && 'active')
    expect(result).toBe('base active')
  })

  it('should handle false conditions', () => {
    const isActive = false
    const result = cn('base', isActive && 'active')
    expect(result).toBe('base')
  })

  it('should merge conflicting tailwind classes', () => {
    const result = cn('px-2 px-4')
    expect(result).toBe('px-4')
  })

  it('should handle arrays', () => {
    const result = cn(['px-2', 'py-1'])
    expect(result).toBe('px-2 py-1')
  })

  it('should handle objects', () => {
    const result = cn({ 'px-2': true, 'py-1': false })
    expect(result).toBe('px-2')
  })
})
