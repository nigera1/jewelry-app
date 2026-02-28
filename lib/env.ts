import { z } from 'zod'

/**
 * Schema for all environment variables
 * Validated on app startup
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Missing Supabase key'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

/**
 * Validate and parse environment variables
 * Throws if validation fails
 */
export function validateEnv() {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    const errors = parsed.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('\n')
    throw new Error(`Environment validation failed:\n${errors}`)
  }

  return parsed.data
}

// Validate on module load
export const env = validateEnv()
