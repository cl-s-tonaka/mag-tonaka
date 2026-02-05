import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { handleApiError } from '@/api/client'

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('apiClient', () => {
    it('should be an axios instance', async () => {
      const { apiClient } = await import('@/api/client')
      expect(apiClient).toBeDefined()
      expect(apiClient.defaults.baseURL).toBeDefined()
    })

    it('should have correct default headers', async () => {
      const { apiClient } = await import('@/api/client')
      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json')
    })

    it('should have timeout configured', async () => {
      const { apiClient } = await import('@/api/client')
      expect(apiClient.defaults.timeout).toBe(30000)
    })
  })

  describe('handleApiError', () => {
    it('should extract error message from API response', () => {
      const error = {
        response: {
          data: {
            error: {
              message: 'Test error message',
              code: 'TEST_ERROR',
            },
          },
        },
      }
      const result = handleApiError(error)
      expect(result.message).toBe('Test error message')
      expect(result.code).toBe('TEST_ERROR')
    })

    it('should extract details from API response', () => {
      const error = {
        response: {
          data: {
            error: {
              message: 'Validation error',
              code: 'VALIDATION_ERROR',
              details: { field: 'name', reason: 'required' },
            },
          },
        },
      }
      const result = handleApiError(error)
      expect(result.message).toBe('Validation error')
      expect(result.code).toBe('VALIDATION_ERROR')
      expect(result.details).toEqual({ field: 'name', reason: 'required' })
    })

    it('should handle network errors', () => {
      const error = {
        message: 'Network Error',
      }
      const result = handleApiError(error)
      expect(result.message).toBe('Network Error')
      expect(result.code).toBe('NETWORK_ERROR')
    })

    it('should handle timeout errors', () => {
      const error = {
        message: 'timeout of 30000ms exceeded',
      }
      const result = handleApiError(error)
      expect(result.message).toBe('timeout of 30000ms exceeded')
      expect(result.code).toBe('NETWORK_ERROR')
    })

    it('should handle unknown errors', () => {
      const error = {}
      const result = handleApiError(error)
      expect(result.message).toBe('An unexpected error occurred')
      expect(result.code).toBe('UNKNOWN_ERROR')
    })

    it('should handle null error', () => {
      const result = handleApiError(null)
      expect(result.message).toBe('An unexpected error occurred')
      expect(result.code).toBe('UNKNOWN_ERROR')
    })

    it('should handle undefined error', () => {
      const result = handleApiError(undefined)
      expect(result.message).toBe('An unexpected error occurred')
      expect(result.code).toBe('UNKNOWN_ERROR')
    })
  })
})
