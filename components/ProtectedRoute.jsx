'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

export function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login')
        }
    }, [user, loading, router])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        Loading…
                    </p>
                </div>
            </div>
        )
    }

    if (!user) {
        return null
    }

    return children
}
