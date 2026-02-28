import pino from 'pino'

/**
 * Structured logging system using Pino
 * Provides consistent log formatting across server and client
 *
 * Usage:
 *   logger.info({ orderId: '123' }, 'Order created')
 *   logger.error({ err }, 'Request failed')
 *   logger.warn('Performance issue detected')
 */

const isDev = process.env.NODE_ENV === 'development'

const pinoConfig = {
  level: isDev ? 'debug' : 'info',
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        singleLine: false,
      },
    },
  }),
}

export const logger = pino(pinoConfig)

/**
 * Create a child logger with predefined context
 */
export function createLogger(context: Record<string, any>) {
  return logger.child(context)
}

/**
 * Log levels:
 * - trace: Very detailed diagnostic info
 * - debug: Diagnostic info for developers
 * - info: General informational messages
 * - warn: Warning messages  
 * - error: Error conditions
 * - fatal: Fatal errors
 */
