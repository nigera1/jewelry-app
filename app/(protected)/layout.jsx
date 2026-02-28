'use client'

import { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/lib/query-client'
import { Navbar } from '@/components/Navbar'

// Prevent static prerendering - all protected routes are dynamic
export const dynamic = 'force-dynamic'

export default function ProtectedLayout({ children }) {
    const queryClient = createQueryClient()
    
    return (
        <QueryClientProvider client={queryClient}>
            <Navbar />
            <main>{children}</main>
        </QueryClientProvider>
    )
}
