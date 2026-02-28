'use client'

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { OrderDAO } from '@/lib/data-access'
import { useCustomQueryClient } from '@/lib/query-client'
import { validateData, CreateOrderSchema } from '@/lib/validation'
import { handleError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { INITIAL_FORM } from '../constants'
import type { Order } from '@/lib/types'

/**
 * Enhanced Order Form Hook with validation and React Query
 * Manages form state, validation, and submission
 */
export function useOrderForm() {
  const { invalidateOrders } = useCustomQueryClient()

  const [formData, setFormData] = useState(INITIAL_FORM)
  const [savedOrder, setSavedOrder] = useState<Order | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  /**
   * Create order mutation
   */
  const createOrderMutation = useMutation({
    mutationFn: async (data: Partial<Order>) => {
      // Validate before submission
      const validation = validateData(data, CreateOrderSchema)
      if (!validation.success || !validation.data) {
        throw new Error(validation.error || 'Validation failed')
      }

      logger.info({ data }, 'Creating order')
      return OrderDAO.createOrder(validation.data)
    },
    onSuccess: (order) => {
      setSavedOrder(order)
      setFormData(INITIAL_FORM)
      setValidationErrors({})
      invalidateOrders()
      logger.info({ orderId: order.id }, 'Order created successfully')
    },
    onError: (error) => {
      const err = handleError(error)
      logger.error(err, 'Order creation failed')
      setValidationErrors({ submit: err.message })
    },
  })

  /**
   * Update a single form field
   */
  const updateField = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear validation error for this field
    setValidationErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  /**
   * Toggle value in array field
   */
  const toggleArray = useCallback((field: string, option: string) => {
    setFormData((prev) => {
      const current = (prev[field as keyof typeof prev] as any[]) ?? []
      return {
        ...prev,
        [field]: current.includes(option)
          ? current.filter((i) => i !== option)
          : [...current, option],
      }
    })
  }, [])

  /**
   * Validate and submit form
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate entire form
    const validation = validateData(formData, CreateOrderSchema)
    if (!validation.success) {
      setValidationErrors({ submit: validation.error || 'Validation failed' })
      return
    }

    await createOrderMutation.mutateAsync(formData as Partial<Order>)
  }, [formData, createOrderMutation])

  /**
   * Reset saved order to create another
   */
  const resetSaved = useCallback(() => {
    setSavedOrder(null)
  }, [])

  /**
   * Reset entire form
   */
  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM)
    setValidationErrors({})
  }, [])

  return {
    formData,
    savedOrder,
    loading: createOrderMutation.isPending,
    error: validationErrors.submit || null,
    validationErrors,
    updateField,
    toggleArray,
    handleSubmit,
    resetSaved,
    resetForm,
  }
}
