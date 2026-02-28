'use client'

import { createBrowserClient } from '@supabase/ssr'
import { env } from './env'
import { logger } from './logger'

/**
 * Browser-side Supabase client
 * Used for client-side data operations with automatic session management
 */

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

/**
 * Create or return cached Supabase client
 */
export function createClient() {
  if (supabaseInstance) {
    return supabaseInstance
  }

  try {
    supabaseInstance = createBrowserClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    logger.debug('Supabase client initialized')
  } catch (error) {
    logger.error({ error }, 'Failed to initialize Supabase client')
    throw error
  }

  return supabaseInstance
}

export const supabase = createClient()
