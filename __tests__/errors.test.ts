import {
  AppError,
  ValidationError,
  AuthError,
  DatabaseError,
  NotFoundError,
  handleError,
  retry,
} from '@/lib/errors'

describe('Error Handling', () => {
  describe('Custom Error Classes', () => {
    it('creates ValidationError with correct properties', () => {
      const error = new ValidationError('Invalid input', { field: 'email' })
      expect(error.message).toBe('Invalid input')
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.statusCode).toBe(400)
      expect(error.context?.field).toBe('email')
    })

    it('creates AuthError with correct statusCode', () => {
      const error = new AuthError('Unauthorized')
      expect(error.statusCode).toBe(401)
      expect(error.code).toBe('AUTH_ERROR')
    })

    it('creates NotFoundError with resource name', () => {
      const error = new NotFoundError('Order', { id: '123' })
      expect(error.message).toContain('Order')
      expect(error.statusCode).toBe(404)
    })
  })

  describe('handleError', () => {
    it('handles AppError correctly', () => {
      const appError = new ValidationError('Test error')
      const result = handleError(appError)
      expect(result.isUserFriendly).toBe(true)
      expect(result.statusCode).toBe(400)
    })

    it('handles generic Error', () => {
      const error = new Error('Generic error')
      const result = handleError(error)
      expect(result.isUserFriendly).toBe(false)
      expect(result.statusCode).toBe(500)
    })

    it('handles unknown error', () => {
      const result = handleError('unknown')
      expect(result.isUserFriendly).toBe(false)
      expect(result.code).toBe('UNKNOWN_ERROR')
    })
  })

  describe('Retry Logic', () => {
    it('succeeds on first attempt', async () => {
      let attempts = 0
      const fn = async () => {
        attempts++
        return 'success'
      }

      const result = await retry(fn, { maxAttempts: 3 })
      expect(result).toBe('success')
      expect(attempts).toBe(1)
    })

    it('retries on failure then succeeds', async () => {
      let attempts = 0
      const fn = async () => {
        attempts++
        if (attempts < 2) throw new Error('Failed')
        return 'success'
      }

      const result = await retry(fn, { maxAttempts: 3, delayMs: 10 })
      expect(result).toBe('success')
      expect(attempts).toBe(2)
    })

    it('fails after max attempts', async () => {
      const fn = async () => {
        throw new Error('Always fails')
      }

      await expect(retry(fn, { maxAttempts: 2, delayMs: 10 })).rejects.toThrow(
        'Always fails'
      )
    })
  })
})
