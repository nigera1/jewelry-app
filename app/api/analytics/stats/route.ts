import { NextRequest, NextResponse } from 'next/server'
import { ProductionLogDAO } from '@/lib/data-access'
import { handleError } from '@/lib/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/analytics/stats
 * Get production statistics for a time period
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_PARAMS', message: 'startDate and endDate required' },
        },
        { status: 400 }
      )
    }

    logger.debug({ startDate, endDate }, 'Fetching analytics stats')

    const stats = await ProductionLogDAO.getStats(startDate, endDate)

    return NextResponse.json({ success: true, data: stats })
  } catch (err) {
    const error = handleError(err)
    logger.error({ err }, `Failed to fetch stats: ${error.message}`)
    return NextResponse.json(
      { success: false, error },
      { status: error.statusCode }
    )
  }
}
