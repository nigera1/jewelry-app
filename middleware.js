import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

/**
 * Enhanced middleware with security headers and auth validation
 * Runs on every request to enforce authentication and security policies
 */

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  // Public routes that don't require authentication
  const isAuthRoute = url.pathname.startsWith('/login') || url.pathname.startsWith('/signup')
  const isApiRoute = url.pathname.startsWith('/api')
  const isHealthCheck = url.pathname === '/health' || url.pathname === '/_health'
  const isStaticAsset =
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api/auth') ||
    url.pathname.includes('.') // Any file with extension

  // Redirect unauthenticated users to login
  if (!user && !isAuthRoute && !isApiRoute && !isHealthCheck && !isStaticAsset) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login
  if (user && isAuthRoute) {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Add security headers to all responses
  supabaseResponse.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://cdn.jsdelivr.net"
  )
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff')
  supabaseResponse.headers.set('X-Frame-Options', 'DENY')
  supabaseResponse.headers.set('X-XSS-Protection', '1; mode=block')
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run middleware on all routes except static routes
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}


export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
