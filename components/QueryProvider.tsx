'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { createQueryClient } from '@/lib/query-client'

/**
 * Provider component that sets up React Query for the entire application
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const queryClient = createQueryClient()

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
