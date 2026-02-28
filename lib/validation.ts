import { z } from 'zod'
import { logger } from './logger'

/**
 * Validation schemas for all domain entities
 * Used for runtime validation of API inputs and database outputs
 */

// ─ Auth ────────────────────────────────────────────────────────────
export const EmailSchema = z.string().email('Invalid email address')
export const PasswordSchema = z.string().min(8, 'Password must be at least 8 characters')

export const AuthSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
})

// ─ Orders ──────────────────────────────────────────────────────────
export const OrderStageSchema = z.enum([
  'entry',
  'design',
  'casting',
  'finishing',
  'qc',
  'shipping',
  'completed',
])

export const OrderSchema = z.object({
  id: z.string().uuid(),
  client_name: z.string().min(1),
  product_type: z.string(),
  current_stage: OrderStageSchema,
  is_rush: z.boolean().default(false),
  is_external: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const CreateOrderSchema = OrderSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
})

// ─ Production Logs ────────────────────────────────────────────────
export const ProductionLogSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  stage: OrderStageSchema,
  staff_member: z.string(),
  duration_ms: z.number().int().min(0),
  notes: z.string().optional(),
  redo_reason: z.string().optional(),
  created_at: z.string().datetime(),
})

// ─ Validation Helpers ──────────────────────────────────────────────
/**
 * Safely validate data against a schema
 * Returns { success, data, error }
 */
export function validateData<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: boolean; data?: T; error?: string } {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (err) {
    if (err instanceof z.ZodError) {
      const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      logger.warn({ error: message }, 'Validation failed')
      return { success: false, error: message }
    }
    logger.error({ err }, 'Unknown validation error')
    return { success: false, error: 'Validation error' }
  }
}

/**
 * Assert that data matches schema, throw on failure
 */
export function assertValid<T>(data: unknown, schema: z.ZodSchema<T>): T {
  return schema.parse(data)
}
