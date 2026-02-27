import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { INITIAL_FORM, orderFormSchema, OrderFormValues } from '@/app/(protected)/order-entry/constants'

/**
 * Manages all form state and submission logic for the order entry page.
 *
 * Keeps field updates, array toggles, and Supabase insertion in one place
 * so the form component stays a pure render layer.
 *
 * @returns {{
 *   formData:      object,
 *   savedOrder:    object | null,
 *   loading:       boolean,
 *   error:         string | null,
 *   updateField:   (field: string, value: any) => void,
 *   toggleArray:   (field: string, option: string) => void,
 *   handleSubmit:  (e: React.FormEvent) => Promise<void>,
 *   resetSaved:    () => void,
 * }}
 */
export function useOrderForm() {
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema) as any,
    defaultValues: INITIAL_FORM,
  })
  const [savedOrder, setSavedOrder] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateField = useCallback((field: keyof OrderFormValues, value: any) => {
    form.setValue(field, value, { shouldValidate: true, shouldDirty: true })
  }, [form])

  const toggleArray = useCallback((field: 'setting_central' | 'setting_small' | 'finish', option: string) => {
    const current = form.getValues(field) ?? []
    const next = current.includes(option)
      ? current.filter(i => i !== option)
      : [...current, option]
    form.setValue(field, next, { shouldValidate: true, shouldDirty: true })
  }, [form])

  const onSubmit = form.handleSubmit(async (data) => {
    setLoading(true)
    setError(null)

    const { data: savedData, error: sbError } = await supabase
      .from('orders')
      .insert([data])
      .select()
      .single()

    if (sbError) {
      setError(sbError.message as string)
    } else {
      setSavedOrder(savedData as any)
      form.reset(INITIAL_FORM)
    }
    setLoading(false)
  })

  /** Clear the saved order so the user can create another one. */
  const resetSaved = useCallback(() => setSavedOrder(null), [])

  return { form, savedOrder, loading, error, updateField, toggleArray, onSubmit, resetSaved }
}
