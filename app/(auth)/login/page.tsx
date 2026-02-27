'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signUp } from '@/lib/auth'
import { useAuth } from '@/components/AuthProvider'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [error, setError] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const { user, loading } = useAuth()
    const router = useRouter()

    // Redirect if already logged in (client-side fallback, though middleware handles it)
    useEffect(() => {
        if (!loading && user) {
            router.replace('/')
        }
    }, [user, loading, router])

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault()
        setError('')
        setSubmitting(true)

        try {
            if (isSignUp) {
                const { error } = await signUp(email, password)
                if (error) throw new Error(error)
            } else {
                const { error } = await signIn(email, password)
                if (error) throw new Error(error)

                // On successful login, force a hard navigation to / so middleware runs
                router.push('/')
                router.refresh()
            }
        } catch (err) {
            setError(err.message)
            setSubmitting(false) // Only stop submitting on error, otherwise let navigation happen
        }
    }, [email, password, isSignUp, router])

    const handleToggleMode = useCallback(() => {
        setIsSignUp(prev => !prev)
        setError('')
    }, [])

    // Show nothing while checking auth
    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-900/20 to-transparent rounded-full blur-3xl" />
                <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-900/15 to-transparent rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo / Brand */}
                <div className="text-center mb-10">
                    <h1 className="text-5xl sm:text-6xl font-black italic text-white tracking-tighter leading-none">
                        ATELIER OS
                    </h1>
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.3em] text-gray-500">
                        Jewelry Workshop Management
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight mb-1">
                        {isSignUp ? 'Create Account' : 'Welcome Back'}
                    </h2>
                    <p className="text-sm text-gray-400 mb-8">
                        {isSignUp
                            ? 'Sign up to access the workshop'
                            : 'Sign in to your account'}
                    </p>

                    {/* Error — aria-live for screen readers */}
                    <div aria-live="polite" aria-atomic="true">
                        {error && (
                            <div role="alert" className="mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-sm text-red-400 font-medium animate-in fade-in slide-in-from-top-2 duration-200">
                                {error}
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2"
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2"
                            >
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                minLength={6}
                                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-white text-black font-black uppercase text-sm tracking-wide py-3.5 rounded-xl hover:bg-gray-100 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {submitting && <Loader2 size={16} className="animate-spin" />}
                            {isSignUp ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>

                    {/* Toggle sign in / sign up */}
                    <div className="mt-8 pt-6 border-t border-white/10 text-center">
                        <p className="text-sm text-gray-500">
                            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                            <button
                                type="button"
                                onClick={handleToggleMode}
                                className="text-white font-bold hover:text-blue-400 transition-colors"
                            >
                                {isSignUp ? 'Sign In' : 'Sign Up'}
                            </button>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center mt-8 text-[10px] text-gray-600 uppercase tracking-widest">
                    Secure access · Powered by Supabase
                </p>
            </div>
        </div>
    )
}
