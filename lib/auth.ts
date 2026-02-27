'use server'
import { createClient } from './supabaseServer'

export async function signIn(email, password) {
    const supabase = await createClient()

    const trimmedEmail = email.trim()

    const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    return { error: null }
}

export async function signUp(email, password) {
    const supabase = await createClient()

    const trimmedEmail = email.trim()

    const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    return { error: null }
}
