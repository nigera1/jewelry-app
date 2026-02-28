import { retry, handleError, ValidationError } from '@/lib/errors'

describe('Error Handling', () => {
  describe('Custom Errors', () => {
    it('should create ValidationError', () => {
      const error = new ValidationError('Invalid input', { field: 'email' })
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.statusCode).toBe(400)
      expect(error.context?.field).toBe('email')
    })
  })

  describe('handleError', () => {
    it('should handle AppError correctly', () => {
      const error = new ValidationError('Bad input')
      const result = handleError(error)

      expect(result.code).toBe('VALIDATION_ERROR')
      expect(result.statusCode).toBe(400)
      expect(result.isUserFriendly).toBe(true)
    })

    it('should handle generic Error', () => {
      const error = new Error('Something went wrong')
      const result = handleError(error)

      expect(result.code).toBe('INTERNAL_ERROR')
      expect(result.statusCode).toBe(500)
      expect(result.isUserFriendly).toBe(false)
    })
  })

  describe('retry', () => {
    it('should retry failed operations', async () => {
      let attempts = 0
      const fn = async () => {
        attempts++
        if (attempts < 3) throw new Error('Not ready')
        return 'Success'
      }

      const result = await retry(fn, { maxAttempts: 3, delayMs: 10 })
      expect(result).toBe('Success')
      expect(attempts).toBe(3)
    })

    it('should fail after max attempts', async () => {
      const fn = async () => {
        throw new Error('Always fails')
      }

      await expect(
        retry(fn, { maxAttempts: 2, delayMs: 10 })
      ).rejects.toThrow('Always fails')
    })
  })
})

