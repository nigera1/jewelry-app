'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { OrderDAO, ProductionLogDAO } from '@/lib/data-access'
import { queryConfig, useCustomQueryClient } from '@/lib/query-client'
import { STAGES, STAFF_MEMBERS, COOLDOWN_MS } from '../constants'
import { handleError, retry } from '@/lib/errors'
import { logger } from '@/lib/logger'
import type { Order, OrderStage } from '@/lib/types'

/**
 * Enhanced Workshop State Hook with React Query integration
 * Manages all workshop operations with proper caching and error handling
 *
 * @returns Encapsulated workshop state and actions
 */
export function useWorkshopState() {
  // ── Query Setup ────────────────────────────────────────────────────
  const { invalidateOrders, invalidateOrder, invalidateProductionLogs } =
    useCustomQueryClient()

  // Fetch active orders using React Query
  const { data: allOrders = [], isLoading: ordersLoading } = useQuery({
    ...queryConfig.orders,
    queryFn: async () => {
      try {
        const orders = await retry(() => OrderDAO.getActiveOrders(), {
          maxAttempts: 3,
          delayMs: 500,
        })
        logger.debug({ count: orders.length }, 'Orders fetched')
        return orders
      } catch (err) {
        handleError(err)
        throw err
      }
    },
  })

  // ── UI State ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('scanner')
  const [searchId, setSearchId] = useState('')
  const [scanMode, setScanMode] = useState('manual')
  const [staffName, setStaffName] = useState(STAFF_MEMBERS[0])
  const [scanMessage, setScanMessage] = useState<string | null>(null)

  // ── Order State ────────────────────────────────────────────────────
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [showRejectMenu, setShowRejectMenu] = useState(false)
  const [isExternal, setIsExternal] = useState(false)
  const [manualStage, setManualStage] = useState('')
  const [lastRedoReason, setLastRedoReason] = useState<string | null>(null)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  // ── Refs (stable across renders) ───────────────────────────────────
  const cooldownsRef = useRef<Record<string, number>>({})
  const staffNameRef = useRef(staffName)
  const activeOrderRef = useRef<Order | null>(null)

  useEffect(() => {
    activeOrderRef.current = activeOrder
  }, [activeOrder])
  useEffect(() => {
    staffNameRef.current = staffName
  }, [staffName])

  // ── Derived State ──────────────────────────────────────────────────
  const rushJobs = useMemo(() => allOrders.filter((j) => j.is_rush), [allOrders])
  const visibleJobs = activeTab === 'rush' ? rushJobs : allOrders

  // ── Scan message auto-dismiss ──────────────────────────────────────
  useEffect(() => {
    if (!scanMessage) return
    const timer = setTimeout(() => setScanMessage(null), 4000)
    return () => clearTimeout(timer)
  }, [scanMessage])

  // ── Fetch production logs when order changes ───────────────────────
  const { data: productionLogs = [] } = useQuery({
    ...queryConfig.productionLogs(activeOrder?.id || ''),
    enabled: !!activeOrder,
    queryFn: async () => {
      if (!activeOrder) return []
      try {
        return await ProductionLogDAO.getOrderLogs(activeOrder.id)
      } catch (err) {
        handleError(err)
        return []
      }
    },
  })

  // Update derived state when active order changes
  useEffect(() => {
    if (!activeOrder) {
      setLastRedoReason(null)
      return
    }

    setManualStage(activeOrder.current_stage)
    setIsExternal(activeOrder.is_external || false)
    setIsTimerRunning(!!activeOrder.timer_started_at)

    // Fetch latest redo reason from production logs
    const latestRedo = productionLogs.find((log) => log.redo_reason)
    if (latestRedo) {
      setLastRedoReason(latestRedo.redo_reason || null)
    }
  }, [activeOrder, productionLogs])

  // ── Cooldown helpers ───────────────────────────────────────────────
  const isOrderInCooldown = useCallback((orderId: string) => {
    const expiry = cooldownsRef.current[orderId]
    return !!expiry && Date.now() < expiry
  }, [])

  const setOrderCooldown = useCallback((orderId: string) => {
    cooldownsRef.current[orderId] = Date.now() + COOLDOWN_MS
    setTimeout(() => {
      delete cooldownsRef.current[orderId]
    }, COOLDOWN_MS)
  }, [])

  // ── Mutations ──────────────────────────────────────────────────────
  const updateOrderMutation = useMutation({
    mutationFn: async (updates: Partial<Order>) => {
      if (!activeOrderRef.current) throw new Error('No active order')
      return OrderDAO.updateOrder(activeOrderRef.current.id, updates)
    },
    onSuccess: (updated) => {
      setActiveOrder(updated)
      invalidateOrder(updated.id)
      invalidateOrders()
      logger.info({ orderId: updated.id }, 'Order updated')
    },
    onError: (error) => {
      handleError(error)
      setScanMessage('Error updating order')
    },
  })

  const createProductionLogMutation = useMutation({
    mutationFn: ProductionLogDAO.createLog,
    onSuccess: (log) => {
      if (activeOrder) {
        invalidateProductionLogs(activeOrder.id)
      }
      logger.info({ orderId: log.order_id }, 'Production log created')
    },
    onError: (error) => {
      handleError(error)
    },
  })

  // ── Action Handlers ────────────────────────────────────────────────
  const transitionStage = useCallback(async (toStage: OrderStage) => {
    if (!activeOrder || isOrderInCooldown(activeOrder.id)) {
      setScanMessage('Please wait before next scan')
      return
    }

    try {
      setOrderCooldown(activeOrder.id)
      await updateOrderMutation.mutateAsync({
        current_stage: toStage,
      })

      // Log the transition
      await createProductionLogMutation.mutateAsync({
        order_id: activeOrder.id,
        stage: toStage,
        staff_member: staffNameRef.current,
        duration_ms: activeOrder.timer_started_at
          ? Date.now() - new Date(activeOrder.timer_started_at).getTime()
          : 0,
      })

      setScanMessage(`Moved to ${toStage}`)
    } catch (err) {
      handleError(err)
      setScanMessage('Transition failed')
    }
  }, [activeOrder, isOrderInCooldown, setOrderCooldown, updateOrderMutation, createProductionLogMutation])

  const toggleExternal = useCallback(async () => {
    if (!activeOrder) return
    try {
      await updateOrderMutation.mutateAsync({
        is_external: !isExternal,
      })
    } catch (err) {
      handleError(err)
    }
  }, [activeOrder, isExternal, updateOrderMutation])

  const startTimer = useCallback(async () => {
    if (!activeOrder) return
    try {
      await updateOrderMutation.mutateAsync({
        timer_started_at: new Date().toISOString(),
      })
      setIsTimerRunning(true)
    } catch (err) {
      handleError(err)
    }
  }, [activeOrder, updateOrderMutation])

  return {
    // State
    activeTab,
    setActiveTab,
    searchId,
    setSearchId,
    scanMode,
    setScanMode,
    staffName,
    setStaffName,
    scanMessage,
    setScanMessage,
    activeOrder,
    setActiveOrder,
    showRejectMenu,
    setShowRejectMenu,
    isExternal,
    manualStage,
    setManualStage,
    lastRedoReason,
    isTimerRunning,
    ordersLoading,
    visibleJobs,
    productionLogs,

    // Actions
    transitionStage,
    toggleExternal,
    startTimer,
    isOrderInCooldown,
  }
}
