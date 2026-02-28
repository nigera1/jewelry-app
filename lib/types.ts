/**
 * Core type definitions for the application
 */

// ─ User & Auth ─────────────────────────────────────────────────────
export type User = {
  id: string
  email: string
  createdAt: string
}

// ─ Orders ──────────────────────────────────────────────────────────
export type OrderStage =
  | 'entry'
  | 'design'
  | 'casting'
  | 'finishing'
  | 'qc'
  | 'shipping'
  | 'completed'

export type Order = {
  id: string
  client_name: string
  product_type: string
  current_stage: OrderStage
  is_rush: boolean
  is_external: boolean
  timer_started_at?: string
  redo_reason?: string
  created_at: string
  updated_at: string
  setting_central?: string[]
  setting_small?: string[]
  finish?: string[]
  stone_count?: number
  stone_type?: string
  estimated_weight?: number
  metal_type?: string
}

// ─ Production Logs ─────────────────────────────────────────────────
export type ProductionLog = {
  id: string
  order_id: string
  stage: OrderStage
  staff_member: string
  duration_ms: number
  notes?: string
  redo_reason?: string
  created_at: string
}

// ─ Workshop ────────────────────────────────────────────────────────
export type WorkshopStats = {
  totalOrders: number
  rushOrders: number
  completedToday: number
  avgStageTime: Record<OrderStage, number>
  bottleneckStage: OrderStage
}

// ─ Analytics ───────────────────────────────────────────────────────
export type AnalyticsMetrics = {
  throughput: number
  avgCycleTime: number
  defectRate: number
  staffProductivity: Record<string, number>
  stageBreakdown: Record<OrderStage, number>
  bottleneckStage?: OrderStage
}

// ─ API Responses ───────────────────────────────────────────────────
export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

// ─ Pagination ──────────────────────────────────────────────────────
export type PaginationParams = {
  page: number
  perPage: number
}

export type PaginatedResponse<T> = {
  items: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}
