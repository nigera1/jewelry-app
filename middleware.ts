import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = ['/login', '/signup', '/api/health']

/**
 * Routes that should redirect authenticated users away
 */
const AUTH_ROUTES = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Log request
  logger.debug(
    {
      method: request.method,
      path: pathname,
      userAgent: request.headers.get('user-agent'),
    },
    'Incoming request'
  )

  // Create response with security headers
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  )
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=()')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public routes - allow all
  if (PUBLIC_ROUTES.includes(pathname)) {
    // But redirect authenticated users away from auth routes
    if (user && AUTH_ROUTES.includes(pathname)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
  }

  // Protected routes - require auth
  if (!user) {
    logger.warn({ path: pathname }, 'Unauthorized access attempt')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Match all routes except static files and images
    '/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:png|jpg|jpeg|gif|svg|webp)).*)',
  ],
}


