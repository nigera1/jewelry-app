import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * Health check endpoint
 * Used for monitoring and deployment verification
 */
export async function GET() {
  try {
    logger.debug('Health check requested')
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    })
  } catch (err) {
    logger.error({ err }, 'Health check failed')
    return NextResponse.json(
      { status: 'error', message: 'Health check failed' },
      { status: 500 }
    )
  }
}
