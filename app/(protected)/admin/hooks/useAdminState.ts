import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useQuery } from '@tanstack/react-query'
import { debounce } from '@/app/(protected)/admin/utils'
import { KANBAN_COLUMNS } from '@/app/(protected)/admin/constants'

/**
 * Central state and data-fetching logic for the Admin page.
 *
 * Encapsulates:
 * - Live WIP jobs and recent audit logs
 * - Completed jobs archive with per-stage duration lookup
 * - Client-side search filtering (debounced)
 * - Kanban stage grouping (derived, memoized)
 * - Order selection for the detail modal
 *
 * All Supabase calls are isolated here; components receive only derived data
 * and stable handler references.
 *
 * @returns {object}
 */
export function useAdminState() {
  // ── Tab ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('live')

  // ── Data ──────────────────────────────────────────────────────────────────
  const [logs, setLogs] = useState([])
  const [wipJobs, setWipJobs] = useState([])
  const [completedJobs, setCompletedJobs] = useState([])
  const [stageDurations, setStageDurations] = useState({})

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedOrder, setSelectedOrder] = useState<any>(null)

  // ── Search terms (internal; exposed only as debounced setters) ────────────
  const [searchTerm, setSearchTerm] = useState('')
  const [logSearchTerm, setLogSearchTerm] = useState('')

  // ── Stable debounced setters ──────────────────────────────────────────────
  // Stored in refs so the same instance is reused across renders and cleanup
  // always cancels the right timer.
  const debouncedSetSearch = useRef(debounce(setSearchTerm, 300))
  const debouncedSetLogSearch = useRef(debounce(setLogSearchTerm, 300))

  useEffect(() => () => {
    debouncedSetSearch.current.cancel()
    debouncedSetLogSearch.current.cancel()
  }, [])

  // ── Queries ───────────────────────────────────────────────────────────────

  const {
    data: liveData,
    isLoading: liveLoading,
    isRefetching: liveRefetching,
    error: liveError,
    refetch: refetchLive,
  } = useQuery({
    queryKey: ['admin', 'live'],
    queryFn: async () => {
      const [liveRes, logsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .neq('current_stage', 'Completed')
          .order('created_at', { ascending: true }),
        supabase
          .from('production_logs')
          .select('*, orders(vtiger_id)')
          .order('created_at', { ascending: false })
          .limit(50),
      ])
      if (liveRes.error) throw new Error(liveRes.error.message)
      if (logsRes.error) throw new Error(logsRes.error.message)
      return { wipJobs: liveRes.data, logs: logsRes.data }
    },
    enabled: activeTab === 'live',
  })

  const {
    data: archiveData,
    isLoading: archiveLoading,
    isRefetching: archiveRefetching,
    error: archiveError,
    refetch: refetchArchive,
  } = useQuery({
    queryKey: ['admin', 'archive'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .ilike('current_stage', '%completed%')
        .order('updated_at', { ascending: false })
        .limit(100)
      if (error) throw new Error(error.message)

      let durations: Record<string, Record<string, number>> = {}
      if (data?.length) {
        const orderIds = data.map(j => j.id)
        const { data: logsData, error: logsError } = await supabase
          .from('production_logs')
          .select('order_id, previous_stage, duration_seconds')
          .in('order_id', orderIds)

        if (!logsError && logsData) {
          for (const log of logsData) {
            const id = log.order_id
            const stage = log.previous_stage
            const secs = Number(log.duration_seconds) || 0
            if (!durations[id]) durations[id] = { Total: 0 }
            if (stage) durations[id][stage] = (durations[id][stage] || 0) + secs
            durations[id].Total += secs
          }
        }
      }
      return { completedJobs: data, stageDurations: durations }
    },
    enabled: activeTab === 'completed',
  })

  const wJobs = liveData?.wipJobs ?? []
  const auditLogs = liveData?.logs ?? []
  const cJobs = archiveData?.completedJobs ?? []
  const sDurations = archiveData?.stageDurations ?? {}

  const loading = activeTab === 'live' ? liveLoading : archiveLoading
  const isRefreshing = activeTab === 'live' ? liveRefetching : archiveRefetching
  const qError = activeTab === 'live' ? liveError : archiveError
  const error = qError ? qError.message : null

  const fetchData = useCallback(() => {
    if (activeTab === 'live') {
      refetchLive()
    } else {
      refetchArchive()
    }
  }, [activeTab, refetchLive, refetchArchive])

  // ── Derived / memoized data ───────────────────────────────────────────────

  /** WIP jobs grouped by kanban column key. */
  const stagesMap = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const col of KANBAN_COLUMNS) {
      map[col.key] = wJobs.filter((j: any) => col.stages.includes(j.current_stage))
    }
    return map
  }, [wJobs])

  /** Completed jobs filtered by the archive search input. */
  const filteredArchive = useMemo(() => {
    const term = searchTerm.trim().toUpperCase()
    if (!term) return cJobs
    return cJobs.filter((job: any) =>
      job.vtiger_id?.toUpperCase().includes(term) ||
      job.article_code?.toUpperCase().includes(term)
    )
  }, [cJobs, searchTerm])

  /** Audit log entries filtered by the log search input. */
  const filteredLogs = useMemo(() => {
    const term = logSearchTerm.trim().toLowerCase()
    if (!term) return auditLogs
    return auditLogs.filter((log: any) =>
      log.orders?.vtiger_id?.toLowerCase().includes(term) ||
      log.staff_name?.toLowerCase().includes(term) ||
      log.previous_stage?.toLowerCase().includes(term) ||
      log.new_stage?.toLowerCase().includes(term)
    )
  }, [auditLogs, logSearchTerm])

  // ── Handlers ──────────────────────────────────────────────────────────────

  /** Toggle the detail modal — clicking the same job again closes it. */
  const handleSelectJob = useCallback((job: any) => setSelectedOrder((prev: any) => prev?.id === job.id ? null : job), [])
  const handleCloseModal = useCallback(() => setSelectedOrder(null), [])

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    // Tab
    activeTab, setActiveTab,

    // Data
    // Data
    wipJobs: wJobs,
    completedJobs: cJobs,
    stageDurations: sDurations,
    stagesMap, filteredArchive, filteredLogs,

    // UI
    loading, isRefreshing, error,
    selectedOrder,

    // Debounced search setters (pass directly to input onChange)
    onSearchChange: (e) => debouncedSetSearch.current(e.target.value),
    onLogSearchChange: (e) => debouncedSetLogSearch.current(e.target.value),

    // Handlers
    fetchData,
    handleSelectJob,
    handleCloseModal,
  }
}
