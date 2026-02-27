import { NextResponse } from 'next/server'
import { createClient } from './utils/supabase/middleware'

export async function middleware(request) {
    // Initialize the response object
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // Create the unauthenticated Supabase client, attaching the request/response 
    // so cookies can be managed via the Next.js standard API.
    const supabase = createClient(request, response)

    // Get the user session
    // This automatically refreshes the session if expired and updates the cookies.
    const { data: { user } } = await supabase.auth.getUser()

    // Protect the following routes
    const protectedPaths = ['/admin', '/workshop', '/casting']
    const isProtectedPath = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path))

    if (isProtectedPath && !user) {
        // Redirect unauthenticated users to the login page
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = '/login'
        loginUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Redirect users who are logged in away from the login page
    if (request.nextUrl.pathname === '/login' && user) {
        const defaultUrl = request.nextUrl.clone()
        defaultUrl.pathname = '/admin'
        return NextResponse.redirect(defaultUrl)
    }

    return response
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
