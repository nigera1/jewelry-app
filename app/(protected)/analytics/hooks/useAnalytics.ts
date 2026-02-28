'use client'

import { useQuery } from '@tanstack/react-query'
import { ProductionLogDAO } from '@/lib/data-access'
import { queryConfig } from '@/lib/query-client'
import { handleError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import type { AnalyticsMetrics, OrderStage } from '@/lib/types'

/**
 * Enhanced Analytics Hook with React Query
 * Derives KPIs from production logs and orders
 */
export function useAnalytics(dateRange?: { startDate: string; endDate: string }) {
  const endDate = dateRange?.endDate || new Date().toISOString()
  const startDate = dateRange?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch stats from production logs
  const { data: stats, isLoading, error } = useQuery({
    ...queryConfig.analytics,
    queryKey: [
      ...queryConfig.analytics.queryKey,
      { startDate, endDate },
    ],
    queryFn: async () => {
      try {
        logger.debug({ startDate, endDate }, 'Fetching analytics')
        const result = await ProductionLogDAO.getStats(startDate, endDate)
        return result
      } catch (err) {
        handleError(err)
        throw err
      }
    },
  })

  // Derive metrics from stats
  const metrics: Partial<AnalyticsMetrics> = {}

  if (stats) {
    const stageEntries = Object.entries(stats)
    const totalRecords = stageEntries.reduce((sum, [_, data]: [string, any]) => sum + data.count, 0)
    const totalDuration = stageEntries.reduce((sum, [_, data]: [string, any]) => sum + data.totalDuration, 0)

    metrics.throughput = totalRecords
    metrics.avgCycleTime = totalRecords > 0 ? totalDuration / totalRecords : 0
    metrics.stageBreakdown = Object.fromEntries(
      stageEntries.map(([stage, data]: [string, any]) => [stage, data.avgDuration])
    ) as Record<OrderStage, number>

    // Find bottleneck (slowest stage)
    let bottleneckStage: OrderStage | undefined
    let maxDuration = 0
    
    for (const [stage, data] of stageEntries) {
      if ((data as any).avgDuration > maxDuration) {
        maxDuration = (data as any).avgDuration
        bottleneckStage = stage as OrderStage
      }
    }
    
    if (bottleneckStage) {
      metrics.bottleneckStage = bottleneckStage
    }
  }

  return {
    metrics,
    isLoading,
    error,
    stats,
  }
}

/**
 * Advanced analytics with multiple metrics
 */
export function useAdvancedAnalytics(dateRange?: { startDate: string; endDate: string }) {
  const { metrics, isLoading, error } = useAnalytics(dateRange)

  return {
    // Throughput (orders per day)
    dailyThroughput: (metrics.throughput || 0) / 30,

    // Cycle time (hours)
    avgCycleTimeHours: (metrics.avgCycleTime || 0) / (1000 * 60 * 60),

    // Efficiency score (0-100)
    efficiencyScore: Math.min(100, Math.max(0, 100 - ((metrics.avgCycleTime || 0) / 100000) * 100)),

    // Stage metrics
    stageMetrics: metrics.stageBreakdown,
    bottleneckStage: metrics.bottleneckStage,

    isLoading,
    error,
  }
}
