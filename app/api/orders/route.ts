import { NextRequest, NextResponse } from 'next/server'
import { OrderDAO } from '@/lib/data-access'
import { validateData, CreateOrderSchema } from '@/lib/validation'
import { handleError } from '@/lib/errors'
import { logger } from '@/lib/logger'

/**
 * GET /api/orders
 * Fetch all active orders with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const stage = searchParams.get('stage') || undefined
    const isRush = searchParams.get('rush') === 'true'

    logger.debug({ stage, isRush }, 'Fetching orders')

    const orders = await OrderDAO.getActiveOrders({
      stage,
      isRush: isRush || undefined,
    })

    return NextResponse.json({ success: true, data: orders })
  } catch (err) {
    const error = handleError(err)
    logger.error({ err }, `Failed to fetch orders: ${error.message}`)
    return NextResponse.json(
      { success: false, error },
      { status: error.statusCode }
    )
  }
}

/**
 * POST /api/orders
 * Create a new order
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    logger.debug({ clientName: body.client_name }, 'Creating order')

    // Validate input
    const validation = validateData(body, CreateOrderSchema)
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: validation.error } },
        { status: 400 }
      )
    }

    const order = await OrderDAO.createOrder(validation.data!)
    logger.info({ id: order.id }, 'Order created via API')

    return NextResponse.json({ success: true, data: order }, { status: 201 })
  } catch (err) {
    const error = handleError(err)
    logger.error({ err }, `Failed to create order: ${error.message}`)
    return NextResponse.json(
      { success: false, error },
      { status: error.statusCode }
    )
  }
}
