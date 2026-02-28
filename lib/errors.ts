import { logger } from './logger'

/**
 * Custom error types for better error handling and categorization
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, any>
  ) {
    super(message)
    this.name = 'AppError'
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, context)
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

export class AuthError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'AUTH_ERROR', 401, context)
    this.name = 'AuthError'
    Object.setPrototypeOf(this, AuthError.prototype)
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'DATABASE_ERROR', 503, context)
    this.name = 'DatabaseError'
    Object.setPrototypeOf(this, DatabaseError.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, context?: Record<string, any>) {
    super(`${resource} not found`, 'NOT_FOUND', 404, context)
    this.name = 'NotFoundError'
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CONFLICT', 409, context)
    this.name = 'ConflictError'
    Object.setPrototypeOf(this, ConflictError.prototype)
  }
}

/**
 * Handle errors with consistent logging and user-friendly messages
 */
export function handleError(error: unknown): {
  message: string
  code: string
  statusCode: number
  isUserFriendly: boolean
} {
  if (error instanceof AppError) {
    logger.error(
      {
        code: error.code,
        statusCode: error.statusCode,
        context: error.context,
      },
      error.message
    )
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      isUserFriendly: true,
    }
  }

  if (error instanceof Error) {
    logger.error({ err: error }, error.message)
    return {
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      isUserFriendly: false,
    }
  }

  logger.error(error, 'Unknown error')
  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
    isUserFriendly: false,
  }
}

/**
 * Retry logic for transient failures
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options = { maxAttempts: 3, delayMs: 1000 }
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < options.maxAttempts) {
        const delay = options.delayMs * Math.pow(2, attempt - 1)
        logger.warn({ attempt, delay, error: lastError.message }, 'Retrying operation')
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Max retry attempts exceeded')
}
