/**
 * Utility functions for data formatting, parsing, and common operations
 */

import type { OrderStage } from './types'

// ─ Date Utilities ──────────────────────────────────────────────────
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`
  return `${(ms / 3600000).toFixed(1)}h`
}

// ─ String Utilities ────────────────────────────────────────────────
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + '...' : str
}

// ─ Number Utilities ────────────────────────────────────────────────
export function formatNumber(num: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function percentageChange(old: number, new_value: number): number {
  if (old === 0) return new_value === 0 ? 0 : 100
  return ((new_value - old) / old) * 100
}

// ─ Array Utilities ────────────────────────────────────────────────
export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const groupKey = String(item[key])
      if (!acc[groupKey]) acc[groupKey] = []
      acc[groupKey].push(item)
      return acc
    },
    {} as Record<string, T[]>
  )
}

export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

export function flatten<T>(arr: T[][]): T[] {
  return arr.flat()
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

// ─ Object Utilities ───────────────────────────────────────────────
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return keys.reduce(
    (acc, key) => {
      acc[key] = obj[key]
      return acc
    },
    {} as Pick<T, K>
  )
}

export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  return Object.entries(obj).reduce(
    (acc, [key, value]) => {
      if (!keys.includes(key as K)) {
        acc[key as Exclude<keyof T, K>] = value
      }
      return acc
    },
    {} as Omit<T, K>
  )
}

export function merge<T extends object>(target: T, source: Partial<T>): T {
  return { ...target, ...source }
}

// ─ Validation Utilities ────────────────────────────────────────────
export function isEmail(str: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)
}

export function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export function isValidURL(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

// ─ Enum/List Utilities ────────────────────────────────────────────
export const StageLabels: Record<OrderStage, string> = {
  entry: 'Entry',
  design: 'Design',
  casting: 'Casting',
  finishing: 'Finishing',
  qc: 'Quality Check',
  shipping: 'Shipping',
  completed: 'Completed',
}

export function getStageLabel(stage: OrderStage): string {
  return StageLabels[stage] || stage
}

export const StageColors: Record<OrderStage, string> = {
  entry: 'bg-gray-100 text-gray-800',
  design: 'bg-blue-100 text-blue-800',
  casting: 'bg-purple-100 text-purple-800',
  finishing: 'bg-yellow-100 text-yellow-800',
  qc: 'bg-orange-100 text-orange-800',
  shipping: 'bg-green-100 text-green-800',
  completed: 'bg-emerald-100 text-emerald-800',
}

export function getStageColor(stage: OrderStage): string {
  return StageColors[stage] || 'bg-gray-100'
}
