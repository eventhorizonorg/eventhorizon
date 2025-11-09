/**
 * Custom error types for Timeline API
 */

/**
 * Validation error for invalid input parameters
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Query error for database query failures
 */
export class QueryError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message)
    this.name = 'QueryError'
  }
}

/**
 * Consistent error response format
 */
export interface ErrorResponse {
  status: 'error'
  message: string
  error?: string
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(message: string, error?: string): ErrorResponse {
  return {
    status: 'error',
    message,
    ...(error && { error })
  }
}

