import { validateData, AuthSchema } from '@/lib/validation'

describe('Validation', () => {
  describe('AuthSchema', () => {
    it('should validate correct email and password', () => {
      const result = validateData(
        { email: 'user@example.com', password: 'password123' },
        AuthSchema
      )
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        email: 'user@example.com',
        password: 'password123',
      })
    })

    it('should reject invalid email', () => {
      const result = validateData(
        { email: 'invalid-email', password: 'password123' },
        AuthSchema
      )
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid email')
    })

    it('should reject short password', () => {
      const result = validateData(
        { email: 'user@example.com', password: 'short' },
        AuthSchema
      )
      expect(result.success).toBe(false)
      expect(result.error).toContain('at least 8')
    })
  })
})
