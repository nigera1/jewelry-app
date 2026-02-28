'use client'

import React, { ReactNode } from 'react'
import { logger } from '@/lib/logger'
import { AlertCircle } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary component for catching React errors
 * Prevents entire app from crashing on component errors
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error(
      {
        componentStack: errorInfo.componentStack,
      },
      `Error caught by boundary: ${error.message}`
    )

    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="text-red-600" size={24} />
                <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
              </div>
              <p className="text-gray-600 mb-4">
                An unexpected error occurred. Please try refreshing the page.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4 p-3 bg-gray-100 rounded text-sm">
                  <summary className="cursor-pointer font-mono text-gray-700">
                    Error details
                  </summary>
                  <pre className="mt-2 overflow-auto text-xs text-red-600">
                    {this.state.error?.toString()}
                  </pre>
                </details>
              )}
              <button
                onClick={() => window.location.reload()}
                className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Refresh page
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}

/**
 * Hook for throwing errors in functional components
 * Use with Suspense for error handling
 */
export function useErrorHandler() {
  return (error: Error) => {
    logger.error({ err: error }, 'Error in component')
    throw error
  }
}
