'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

import { useQuery } from '@tanstack/react-query'

/**
 * Custom hook for the analytics dashboard.
 * Fetches orders and production_logs, then derives all KPIs client-side.
 */
export function useAnalytics() {
    const { data, isLoading, error: queryError, refetch } = useQuery({
        queryKey: ['analytics'],
        queryFn: async () => {
            const [ordersRes, logsRes] = await Promise.all([
                supabase.from('orders').select('*').order('created_at', { ascending: false }),
                supabase.from('production_logs').select('*').order('created_at', { ascending: false }),
            ])
            if (ordersRes.error) throw new Error(ordersRes.error.message)
            if (logsRes.error) throw new Error(logsRes.error.message)
            return { orders: ordersRes.data ?? [], logs: logsRes.data ?? [] }
        }
    })

    const orders = data?.orders ?? []
    const logs = data?.logs ?? []
    const loading = isLoading
    const error = queryError ? queryError.message : null
    const fetchData = refetch

    // ── Derived KPIs ──

    const totalOrders = orders.length
    const wipOrders = useMemo(() => orders.filter(o => o.current_stage !== 'Completed'), [orders])
    const completedOrders = useMemo(() => orders.filter(o => o.current_stage === 'Completed'), [orders])
    const rushOrders = useMemo(() => orders.filter(o => o.is_rush), [orders])

    // Orders per stage
    const ordersByStage = useMemo(() => {
        const map: Record<string, number> = {}
        for (const o of orders) {
            const stage = o.current_stage || 'Unknown'
            map[stage] = (map[stage] || 0) + 1
        }
        return Object.entries(map)
            .map(([stage, count]) => ({ stage, count }))
            .sort((a, b) => b.count - a.count)
    }, [orders])

    // Average completion time (seconds)
    const avgCompletionTime = useMemo(() => {
        const completedIds = new Set(completedOrders.map(o => o.id))
        const totals: Record<string, number> = {}
        for (const log of logs) {
            if (completedIds.has(log.order_id)) {
                totals[log.order_id] = (totals[log.order_id] || 0) + (Number(log.duration_seconds) || 0)
            }
        }
        const values = Object.values(totals).filter(v => v > 0)
        if (!values.length) return 0
        return values.reduce((a, b) => a + b, 0) / values.length
    }, [completedOrders, logs])

    // Average duration per stage (seconds)
    const avgDurationByStage = useMemo(() => {
        const stageData: Record<string, { total: number, count: number }> = {}
        for (const log of logs) {
            const stage = log.previous_stage
            const secs = Number(log.duration_seconds) || 0
            if (!stage || !secs) continue
            if (!stageData[stage]) stageData[stage] = { total: 0, count: 0 }
            stageData[stage].total += secs
            stageData[stage].count += 1
        }
        return Object.entries(stageData)
            .map(([stage, d]) => ({ stage, avg: d.total / d.count, total: d.total, count: d.count }))
            .sort((a, b) => b.avg - a.avg)
    }, [logs])

    // Staff leaderboard (total work time, number of moves)
    const staffStats = useMemo(() => {
        const map: Record<string, { totalTime: number, moves: number }> = {}
        for (const log of logs) {
            const name = log.staff_name || 'Unknown'
            if (!map[name]) map[name] = { totalTime: 0, moves: 0 }
            map[name].totalTime += (Number(log.duration_seconds) || 0)
            map[name].moves += 1
        }
        return Object.entries(map)
            .map(([name, d]) => ({ name, ...d }))
            .sort((a, b) => b.totalTime - a.totalTime)
    }, [logs])

    // Orders by metal type
    const ordersByMetal = useMemo(() => {
        const map: Record<string, number> = {}
        for (const o of orders) {
            const metal = o.metal || 'Unknown'
            map[metal] = (map[metal] || 0) + 1
        }
        return Object.entries(map).map(([metal, count]) => ({ metal, count }))
    }, [orders])

    // Daily order trend (last 30 days)
    const dailyTrend = useMemo(() => {
        const now = new Date()
        const days: Record<string, number> = {}
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now)
            d.setDate(d.getDate() - i)
            const key = d.toISOString().slice(0, 10)
            days[key] = 0
        }
        for (const o of orders) {
            const key = o.created_at?.slice(0, 10)
            if (key && key in days) days[key] += 1
        }
        return Object.entries(days).map(([date, count]) => ({ date, count }))
    }, [orders])

    return {
        loading, error, fetchData,
        totalOrders, wipOrders: wipOrders.length, completedOrders: completedOrders.length,
        rushOrders: rushOrders.length, rushPercent: totalOrders ? Math.round((rushOrders.length / totalOrders) * 100) : 0,
        avgCompletionTime,
        ordersByStage, avgDurationByStage, staffStats, ordersByMetal, dailyTrend,
    }
}
