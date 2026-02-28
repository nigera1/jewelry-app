import { logger } from './logger'

/**
 * Performance monitoring and profiling utilities
 */

/**
 * Measure execution time of async function
 */
export async function measureAsync<T>(
  label: string,
  fn: () => Promise<T>,
  warnThreshold = 1000
): Promise<T> {
  const start = performance.now()
  try {
    const result = await fn()
    const duration = performance.now() - start

    if (duration > warnThreshold) {
      logger.warn({ label, duration }, 'Slow operation')
    } else {
      logger.debug({ label, duration }, 'Operation completed')
    }

    return result
  } catch (err) {
    const duration = performance.now() - start
    logger.error({ label, duration, err }, 'Operation failed')
    throw err
  }
}

/**
 * Measure execution time of sync function
 */
export function measureSync<T>(label: string, fn: () => T, warnThreshold = 100): T {
  const start = performance.now()
  const result = fn()
  const duration = performance.now() - start

  if (duration > warnThreshold) {
    logger.warn({ label, duration }, 'Slow operation')
  }

  return result
}

/**
 * Performance marks and measures (for browser profiling)
 */
export function markStart(label: string) {
  if (typeof window !== 'undefined' && window.performance) {
    performance.mark(`${label}-start`)
  }
}

export function markEnd(label: string) {
  if (typeof window !== 'undefined' && window.performance) {
    performance.mark(`${label}-end`)
    try {
      performance.measure(label, `${label}-start`, `${label}-end`)
      const measure = performance.getEntriesByName(label)[0]
      logger.debug({ label, duration: measure.duration }, 'Marked operation')
    } catch (err) {
      logger.warn({ label }, 'Failed to measure')
    }
  }
}

/**
 * Debounce high-frequency operations
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return function (...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Throttle high-frequency operations
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function (...args: Parameters<T>) {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Report Web Vitals
 */
export function reportWebVitals(metric: any) {
  const { name, value, id, delta } = metric

  // Log to external service if needed
  logger.debug(
    {
      metric: name,
      value: value.toFixed(2),
      id,
      delta: delta?.toFixed(2),
    },
    'Web Vital'
  )

  // Send to analytics service
  // if (window.gtag) {
  //   window.gtag.event(name, { value: Math.round(value), id })
  // }
}

/**
 * Memory usage tracking (if available)
 */
export function reportMemoryUsage() {
  if (typeof window !== 'undefined' && (performance as any).memory) {
    const memory = (performance as any).memory
    logger.debug(
      {
        usedJSHeapSize: (memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        totalJSHeapSize: (memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
        jsHeapSizeLimit: (memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB',
      },
      'Memory usage'
    )
  }
}
