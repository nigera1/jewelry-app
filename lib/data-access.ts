'use client'

import { createClient } from './supabaseClient'
import { DatabaseError, NotFoundError, handleError } from './errors'
import { logger } from './logger'
import type { Order, ProductionLog } from './types'

/**
 * Data Access Layer for Orders
 * Provides a single interface for all order-related database operations
 * Includes error handling, logging, and validation
 */

export const OrderDAO = {
  /**
   * Fetch all active orders with optional filtering
   */
  async getActiveOrders(filters?: {
    stage?: string
    isRush?: boolean
  }): Promise<Order[]> {
    try {
      const supabase = createClient() as any
      let query = supabase.from('orders').select('*')

      if (filters?.stage) {
        query = query.eq('current_stage', filters.stage)
      }
      if (filters?.isRush !== undefined) {
        query = query.eq('is_rush', filters.isRush)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw new DatabaseError(`Failed to fetch orders: ${error.message}`, { error })

      logger.debug({ count: data?.length }, 'Fetched orders')
      return data || []
    } catch (err) {
      handleError(err)
      throw err
    }
  },

  /**
   * Fetch a single order by ID
   */
  async getOrder(id: string): Promise<Order> {
    try {
      const supabase = createClient() as any
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) throw new NotFoundError('Order', { id })

      logger.debug({ id }, 'Fetched order')
      return data
    } catch (err) {
      handleError(err)
      throw err
    }
  },

  /**
   * Create a new order
   */
  async createOrder(orderData: Partial<Order>): Promise<Order> {
    try {
      const supabase = createClient() as any
      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single()

      if (error) throw new DatabaseError(`Failed to create order: ${error.message}`, { error })

      logger.info({ id: data?.id }, 'Order created')
      return data
    } catch (err) {
      handleError(err)
      throw err
    }
  },

  /**
   * Update an existing order
   */
  async updateOrder(id: string, updates: Partial<Order>): Promise<Order> {
    try {
      const supabase = createClient() as any
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error || !data) throw new NotFoundError('Order', { id })

      logger.info({ id, updates }, 'Order updated')
      return data
    } catch (err) {
      handleError(err)
      throw err
    }
  },
}

/**
 * Data Access Layer for Production Logs
 * Tracks all stage transitions and work history
 */

export const ProductionLogDAO = {
  /**
   * Get logs for a specific order
   */
  async getOrderLogs(orderId: string): Promise<ProductionLog[]> {
    try {
      const supabase = createClient() as any
      const { data, error } = await supabase
        .from('production_logs')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })

      if (error) throw new DatabaseError(`Failed to fetch logs: ${error.message}`, { error })

      logger.debug({ orderId, count: data?.length }, 'Fetched production logs')
      return data || []
    } catch (err) {
      handleError(err)
      throw err
    }
  },

  /**
   * Create a production log entry
   */
  async createLog(logData: Partial<ProductionLog>): Promise<ProductionLog> {
    try {
      const supabase = createClient() as any
      const { data, error } = await supabase
        .from('production_logs')
        .insert([logData])
        .select()
        .single()

      if (error) throw new DatabaseError(`Failed to create log: ${error.message}`, { error })

      logger.debug({ orderId: data?.order_id }, 'Production log created')
      return data
    } catch (err) {
      handleError(err)
      throw err
    }
  },

  /**
   * Get statistics for a time period
   */
  async getStats(startDate: string, endDate: string) {
    try {
      const supabase = createClient() as any
      const { data, error } = await supabase
        .from('production_logs')
        .select('stage, duration_ms')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      if (error) throw new DatabaseError(`Failed to fetch stats: ${error.message}`, { error })

      // Calculate aggregates
      const stats = data?.reduce(
        (acc: any, log: any) => {
          if (!acc[log.stage]) {
            acc[log.stage] = { count: 0, totalDuration: 0, avgDuration: 0 }
          }
          acc[log.stage].count++
          acc[log.stage].totalDuration += log.duration_ms || 0
          acc[log.stage].avgDuration = acc[log.stage].totalDuration / acc[log.stage].count
          return acc
        },
        {} as Record<
          string,
          { count: number; totalDuration: number; avgDuration: number }
        >
      )

      logger.debug(stats, 'Calculated production stats')
      return stats
    } catch (err) {
      handleError(err)
      throw err
    }
  },
}
