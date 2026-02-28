'use client'

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { OrderDAO } from '@/lib/data-access'
import { useCustomQueryClient } from '@/lib/query-client'
import { logger } from '@/lib/logger'
import { INITIAL_FORM } from '@/app/(protected)/order-entry/constants'

/**
 * Enhanced Order Form Hook with React Query & Validation
 * - Centralized form state management
 * - Server-side persistence with optimistic updates
 * - Comprehensive error handling
 * - Validation before submission
 */

export function useOrderForm() {
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [savedOrder, setSavedOrder] = useState(null)
  const [error, setError] = useState(null)

  const { invalidateOrders } = useCustomQueryClient()

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: (data) => OrderDAO.createOrder(data),
    onMutate: async () => {
      setError(null)
    },
    onSuccess: (data) => {
      setSavedOrder(data)
      setFormData(INITIAL_FORM)
      invalidateOrders()
      logger.info({ id: data.id }, 'Order created successfully')
    },
    onError: (err) => {
      const message = err?.message || 'Failed to create order'
      setError(message)
      logger.error({ err }, `Order creation failed: ${message}`)
    },
  })

  /**
   * Update a single form field
   */
  const updateField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  /**
   * Toggle a value in multi-select array fields
   */
  const toggleArray = useCallback((field, option) => {
    setFormData((prev) => {
      const current = prev[field] ?? []
      if (Array.isArray(current)) {
        return {
          ...prev,
          [field]: current.includes(option)
            ? current.filter((i) => i !== option)
            : [...current, option],
        }
      }
      return prev
    })
  }, [])

  /**
   * Validate and submit the form
   */
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()

      // Basic validation
      if (!formData.client_name?.trim()) {
        setError('Client name is required')
        return
      }
      if (!formData.product_type?.trim()) {
        setError('Product type is required')
        return
      }

      try {
        await createOrderMutation.mutateAsync(formData)
      } catch (err) {
        logger.error({ err }, 'Form submission failed')
      }
    },
    [formData, createOrderMutation]
  )

  /**
   * Clear saved order to create another
   */
  const resetSaved = useCallback(() => {
    setSavedOrder(null)
    setError(null)
  }, [])

  return {
    formData,
    savedOrder,
    loading: createOrderMutation.isPending,
    error,
    updateField,
    toggleArray,
    handleSubmit,
    resetSaved,
  }
}

