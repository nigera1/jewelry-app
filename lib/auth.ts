'use server'

import { createClient } from './supabaseServer'
import { validateData, AuthSchema } from './validation'
import { AuthError } from './errors'
import { logger } from './logger'

/**
 * Server-side authentication actions
 * All authentication operations must go through these functions
 */

export async function signIn(email: string, password: string) {
  try {
    // Validate input
    const validation = validateData({ email, password }, AuthSchema)
    if (!validation.success) {
      throw new AuthError(validation.error || 'Invalid credentials')
    }

    const supabase = await createClient()
    const trimmedEmail = email.trim().toLowerCase()

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    })

    if (error) {
      logger.warn({ email: trimmedEmail }, 'Sign in failed')
      throw new AuthError('Invalid email or password')
    }

    logger.info({ email: trimmedEmail }, 'User signed in')
    return { error: null }
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: err.message }
    }
    logger.error({ err }, 'Sign in error')
    return { error: 'Authentication failed' }
  }
}

export async function signUp(email: string, password: string) {
  try {
    // Validate input
    const validation = validateData({ email, password }, AuthSchema)
    if (!validation.success) {
      throw new AuthError(validation.error || 'Invalid input')
    }

    const supabase = await createClient()
    const trimmedEmail = email.trim().toLowerCase()

    const { error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    })

    if (error) {
      logger.warn({ email: trimmedEmail }, 'Sign up failed')
      throw new AuthError(error.message)
    }

    logger.info({ email: trimmedEmail }, 'User signed up')
    return { error: null }
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: err.message }
    }
    logger.error({ err }, 'Sign up error')
    return { error: 'Registration failed' }
  }
}

export async function signOut() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw new AuthError('Failed to sign out')
    }

    logger.info('User signed out')
    return { error: null }
  } catch (err) {
    logger.error({ err }, 'Sign out error')
    return { error: 'Sign out failed' }
  }
}

