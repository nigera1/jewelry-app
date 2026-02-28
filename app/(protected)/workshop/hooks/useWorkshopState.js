'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { OrderDAO, ProductionLogDAO } from '@/lib/data-access'
import { useCustomQueryClient } from '@/lib/query-client'
import { logger } from '@/lib/logger'
import { STAGES, STAFF_MEMBERS, COOLDOWN_MS } from '../constants'

/**
 * Enhanced Workshop State Hook with React Query
 * Features:
 * - Automatic caching and background updates
 * - Optimistic updates for snappy UI
 * - Comprehensive error handling and logging
 * - Cooldown management
 * - Timer management with automatic stage transitions
 */
export function useWorkshopState() {
  // UI State
  const [activeTab, setActiveTab] = useState('scanner')
  const [searchId, setSearchId] = useState('')
  const [scanMode, setScanMode] = useState('manual')
  const [staffName, setStaffName] = useState(STAFF_MEMBERS[0])
  const [loading, setLoading] = useState(false)
  const [scanMessage, setScanMessage] = useState(null)

  // Order State
  const [activeOrder, setActiveOrder] = useState(null)
  const [showRejectMenu, setShowRejectMenu] = useState(false)
  const [isExternal, setIsExternal] = useState(false)
  const [manualStage, setManualStage] = useState('')
  const [lastRedoReason, setLastRedoReason] = useState(null)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  // Refs
  const cooldownsRef = useRef({})
  const processingRef = useRef(false)
  const activeOrderRef = useRef(null)
  const staffNameRef = useRef(staffName)

  useEffect(() => {
    activeOrderRef.current = activeOrder
  }, [activeOrder])
  useEffect(() => {
    staffNameRef.current = staffName
  }, [staffName])

  const { invalidateOrders, invalidateOrder, invalidateProductionLogs } =
    useCustomQueryClient()

  // Fetch active orders with React Query
  const {
    data: activeJobs = [],
    isLoading: jobsLoading,
  } = useQuery({
    queryKey: ['orders', 'active'],
    queryFn: () =>
      OrderDAO.getActiveOrders({
        stage: activeTab === 'rush' ? undefined : 'entry',
      }),
    staleTime: 30000,
    refetchInterval: 60000,
  })

  // Fetch production logs for active order
  const { data: productionLogs = [] } = useQuery({
    queryKey: ['productionLogs', activeOrder?.id],
    queryFn: () =>
      activeOrder
        ? ProductionLogDAO.getOrderLogs(activeOrder.id)
        : Promise.resolve([]),
    enabled: !!activeOrder,
    staleTime: 30000,
  })

  // Auto-dismiss scan message
  useEffect(() => {
    if (!scanMessage) return
    const t = setTimeout(() => setScanMessage(null), 4000)
    return () => clearTimeout(t)
  }, [scanMessage])

  // Sync derived state when order changes
  useEffect(() => {
    if (!activeOrder) {
      setLastRedoReason(null)
      return
    }

    setManualStage(activeOrder.current_stage)
    setIsExternal(activeOrder.is_external || false)
    setIsTimerRunning(!!activeOrder.timer_started_at)

    const redoLog = productionLogs.find((log) => log.redo_reason)
    if (redoLog) {
      setLastRedoReason(redoLog.redo_reason)
    }
  }, [activeOrder, productionLogs])

  const rushJobs = useMemo(() => activeJobs.filter((j) => j.is_rush), [activeJobs])
  const visibleJobs = activeTab === 'rush' ? rushJobs : activeJobs

  // Cooldown helpers
  const isOrderInCooldown = useCallback((orderId) => {
    const expiry = cooldownsRef.current[orderId]
    return !!expiry && Date.now() < expiry
  }, [])

  const setOrderCooldown = useCallback((orderId) => {
    cooldownsRef.current[orderId] = Date.now() + COOLDOWN_MS
    setTimeout(() => {
      delete cooldownsRef.current[orderId]
    }, COOLDOWN_MS)
  }, [])

  // Mutations
  const updateOrderMutation = useMutation({
    mutationFn: (updates) =>
      activeOrder ? OrderDAO.updateOrder(activeOrder.id, updates) : Promise.reject(),
    onMutate: async (updates) => {
      const previousOrder = activeOrder
      setActiveOrder((prev) => (prev ? { ...prev, ...updates } : null))
      return previousOrder
    },
    onError: (_, __, previousOrder) => {
      if (previousOrder) {
        setActiveOrder(previousOrder)
      }
      logger.error('Failed to update order')
    },
    onSuccess: () => {
      invalidateOrder(activeOrder?.id || '')
      invalidateOrders()
    },
  })

  const createLogMutation = useMutation({
    mutationFn: (logData) => ProductionLogDAO.createLog(logData),
    onSuccess: () => {
      invalidateProductionLogs(activeOrder?.id || '')
    },
  })

  // Handlers
  const handleTimerStart = useCallback(async () => {
    const order = activeOrderRef.current
    if (!order || isTimerRunning) return

    const now = new Date().toISOString()

    setActiveOrder((prev) => (prev ? { ...prev, timer_started_at: now } : prev))
    setIsTimerRunning(true)

    try {
      await updateOrderMutation.mutateAsync({ timer_started_at: now })
      await createLogMutation.mutateAsync({
        order_id: order.id,
        stage: order.current_stage,
        staff_member: staffNameRef.current,
        duration_ms: 0,
      })
    } catch (err) {
      logger.error('Failed to start timer')
    }
  }, [isTimerRunning, updateOrderMutation, createLogMutation])

  const handleTimerStop = useCallback(async () => {
    const order = activeOrderRef.current
    if (!order || !isTimerRunning) return

    const elapsed = order.timer_started_at
      ? Math.floor((Date.now() - new Date(order.timer_started_at).getTime()) / 1000)
      : 0

    const currentIdx = STAGES.indexOf(order.current_stage)
    const nextStage =
      currentIdx >= 0 && currentIdx < STAGES.length - 1
        ? STAGES[currentIdx + 1]
        : 'completed'

    try {
      await updateOrderMutation.mutateAsync({
        current_stage: nextStage,
        timer_started_at: null,
      })

      await createLogMutation.mutateAsync({
        order_id: order.id,
        stage: nextStage,
        staff_member: staffNameRef.current,
        duration_ms: elapsed * 1000,
      })

      setScanMessage({ type: 'success', text: `✅ Moved to ${nextStage}` })
      setIsTimerRunning(false)
      setActiveOrder(null)
      setOrderCooldown(order.id)
    } catch (err) {
      logger.error('Failed to stop timer')
    }
  }, [isTimerRunning, updateOrderMutation, createLogMutation, setOrderCooldown])

  const processOrderId = useCallback(
    async (cleanId) => {
      if (!cleanId || processingRef.current) return
      processingRef.current = true
      setLoading(true)

      try {
        const order = await OrderDAO.getOrder(cleanId)

        if (isOrderInCooldown(order.id)) {
          const remaining = Math.ceil(
            (cooldownsRef.current[order.id] - Date.now()) / 1000
          )
          setScanMessage({
            type: 'error',
            text: `Cooldown: ${remaining}s remaining`,
          })
          return
        }

        if (!order.timer_started_at) {
          setActiveOrder(order)
          await handleTimerStart()
          setScanMessage({
            type: 'start',
            text: `▶️ Started: ${order.id}`,
          })
        } else {
          await handleTimerStop()
        }

        setOrderCooldown(order.id)
        setSearchId('')
      } catch (err) {
        setScanMessage({ type: 'error', text: 'Order not found' })
        logger.error('Failed to process order')
      } finally {
        setLoading(false)
        processingRef.current = false
      }
    },
    [isOrderInCooldown, handleTimerStart, handleTimerStop, setOrderCooldown]
  )

  const handleScan = useCallback(
    () => processOrderId(searchId.toUpperCase().trim()),
    [searchId, processOrderId]
  )

  const handleDecodedText = useCallback(
    (text) => {
      processOrderId(text.trim().toUpperCase())
      navigator.vibrate?.(200)
    },
    [processOrderId]
  )

  const handleManualMove = useCallback(
    async (isRejection = false, reason = null) => {
      const order = activeOrderRef.current
      if (!order) return

      const nextStage = isRejection ? 'goldsmithing' : manualStage

      try {
        await updateOrderMutation.mutateAsync({
          current_stage: nextStage,
          is_external: isExternal,
          timer_started_at: null,
        })

        await createLogMutation.mutateAsync({
          order_id: order.id,
          stage: nextStage,
          staff_member: staffNameRef.current,
          duration_ms: 0,
          notes: isRejection ? reason : undefined,
        })

        setScanMessage({ type: 'success', text: `✅ Moved to ${nextStage}` })
        setOrderCooldown(order.id)
        setActiveOrder(null)
        setShowRejectMenu(false)
      } catch (err) {
        logger.error('Failed to move order')
      }
    },
    [manualStage, isExternal, updateOrderMutation, createLogMutation, setOrderCooldown]
  )

  const handleToggleStone = useCallback(
    async (field, currentValue) => {
      const order = activeOrderRef.current
      if (!order) return

      try {
        await updateOrderMutation.mutateAsync({ [field]: !currentValue })
      } catch (err) {
        logger.error('Failed to toggle stone')
      }
    },
    [updateOrderMutation]
  )

  const closeOrder = useCallback(() => {
    setActiveOrder(null)
    setShowRejectMenu(false)
  }, [])

  const switchTab = useCallback(
    (tab) => {
      setActiveTab(tab)
      closeOrder()
    },
    [closeOrder]
  )

  // Public API
  return {
    activeTab,
    setActiveTab,
    switchTab,
    searchId,
    setSearchId,
    scanMode,
    setScanMode,
    staffName,
    setStaffName,
    loading,
    scanMessage,
    setScanMessage,
    activeOrder,
    setActiveOrder,
    showRejectMenu,
    setShowRejectMenu,
    isExternal,
    setIsExternal,
    manualStage,
    setManualStage,
    lastRedoReason,
    isTimerRunning,
    activeJobs,
    jobsLoading,
    rushJobs,
    visibleJobs,
    productionLogs,
    cooldownsRef,
    handleScan,
    handleDecodedText,
    handleTimerStart,
    handleTimerStop,
    handleManualMove,
    handleToggleStone,
    closeOrder,
    processOrderId,
    isOrderInCooldown,
  }
}

