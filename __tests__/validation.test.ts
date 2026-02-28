import { validateData, AuthSchema, OrderSchema } from '@/lib/validation'

describe('Validation', () => {
  describe('AuthSchema', () => {
    it('validates correct email and password', () => {
      const result = validateData(
        { email: 'user@example.com', password: 'password123' },
        AuthSchema
      )
      expect(result.success).toBe(true)
    })

    it('rejects invalid email', () => {
      const result = validateData(
        { email: 'invalid-email', password: 'password123' },
        AuthSchema
      )
      expect(result.success).toBe(false)
      expect(result.error).toContain('email')
    })

    it('rejects short password', () => {
      const result = validateData(
        { email: 'user@example.com', password: 'short' },
        AuthSchema
      )
      expect(result.success).toBe(false)
      expect(result.error).toContain('Password')
    })
  })

  describe('OrderSchema', () => {
    const validOrder = {
      id: 'uuid-test',
      client_name: 'John Doe',
      product_type: 'ring',
      current_stage: 'entry' as const,
      is_rush: false,
      is_external: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    it('validates correct order', () => {
      const result = validateData(validOrder, OrderSchema)
      expect(result.success).toBe(true)
    })

    it('rejects missing client_name', () => {
      const invalid = { ...validOrder, client_name: '' }
      const result = validateData(invalid, OrderSchema)
      expect(result.success).toBe(false)
    })

    it('rejects invalid stage', () => {
      const invalid = { ...validOrder, current_stage: 'invalid' }
      const result = validateData(invalid, OrderSchema)
      expect(result.success).toBe(false)
    })
  })
})
