'use client'

import { useMutation, useQueryClient, QueryClient, type UseMutationOptions } from '@tanstack/react-query'
import { logger } from '@/lib/logger'

/**
 * Query configuration presets for consistent cache behavior
 */
export const queryConfig = {
  orders: {
    queryKey: ['orders'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
  orderDetail: (id: string) => ({
    queryKey: ['orders', id],
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  }),
  productionLogs: (orderId: string) => ({
    queryKey: ['productionLogs', orderId],
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  }),
  analytics: {
    queryKey: ['analytics'],
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000,
  },
}

/**
 * Create a singleton React Query client for the application
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (error instanceof Error && error.message.includes('4')) {
            return false
          }
          return failureCount < 3
        },
      },
      mutations: {
        retry: 1,
      },
    },
  })
}

/**
 * Hook for using the query client
 */
export function useCustomQueryClient() {
  const queryClient = useQueryClient()

  return {
    queryClient,
    /**
     * Invalidate order queries
     */
    invalidateOrders: () => {
      queryClient.invalidateQueries({ queryKey: queryConfig.orders.queryKey })
    },
    /**
     * Invalidate a specific order
     */
    invalidateOrder: (id: string) => {
      queryClient.invalidateQueries({ queryKey: queryConfig.orderDetail(id).queryKey })
    },
    /**
     * Invalidate analytics
     */
    invalidateAnalytics: () => {
      queryClient.invalidateQueries({ queryKey: queryConfig.analytics.queryKey })
    },
    /**
     * Invalidate production logs for an order
     */
    invalidateProductionLogs: (orderId: string) => {
      queryClient.invalidateQueries({
        queryKey: queryConfig.productionLogs(orderId).queryKey,
      })
    },
  }
}

/**
 * Wrapper for mutations that logs and handles errors
 */
export function useMutationWithLogging<TData, TError, TVariables, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>
) {
  return useMutation<TData, TError, TVariables, TContext>({
    ...options,
    onSuccess: (data: TData, variables: TVariables, context?: TContext) => {
      logger.debug({ data }, 'Mutation succeeded')
      if (options.onSuccess && typeof options.onSuccess === 'function') {
        (options.onSuccess as any)(data, variables, context)
      }
    },
    onError: (error: TError, variables: TVariables, context?: TContext) => {
      logger.error({ error, variables }, 'Mutation failed')
      if (options.onError && typeof options.onError === 'function') {
        (options.onError as any)(error, variables, context)
      }
    },
  })
}

