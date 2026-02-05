import axios, { type AxiosError } from 'axios'
import type { ApiError } from '@/types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// Request interceptor for adding auth headers
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Add request ID for tracing
    config.headers['X-Request-ID'] = crypto.randomUUID()
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle specific error cases
    if (error.response?.status === 401) {
      // Handle unauthorized - could trigger logout
      localStorage.removeItem('auth_token')
    }
    return Promise.reject(error)
  }
)

interface HandleApiErrorResult {
  message: string
  code: string
  details?: unknown
}

export function handleApiError(error: unknown): HandleApiErrorResult {
  // Check if it's an Axios error with response data
  if (typeof error === 'object' && error !== null) {
    const axiosError = error as {
      response?: {
        data?: {
          error?: ApiError
        }
      }
      message?: string
    }

    // API returned an error response
    if (axiosError.response?.data?.error) {
      const apiError = axiosError.response.data.error
      return {
        message: apiError.message,
        code: apiError.code,
        details: apiError.details,
      }
    }

    // Network error or timeout
    if (axiosError.message) {
      return {
        message: axiosError.message,
        code: 'NETWORK_ERROR',
      }
    }
  }

  // Unknown error
  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  }
}
