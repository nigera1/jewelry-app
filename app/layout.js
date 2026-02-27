import './globals.css'
import Link from 'next/link'
import { Analytics } from '@vercel/analytics/next'
import { createClient } from '@/utils/supabase/server'
import { logout } from '@/app/login/actions'

export const metadata = {
  title: 'Atelier OS — Jewelry Production Management',
  description: 'End-to-end jewelry production tracker: order entry, casting queue, workshop floor, and admin dashboard with real-time Kanban boards.',
  icons: { icon: '/favicon.ico' },
}

export default async function RootLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en">
      <body className="bg-gray-50">
        <nav className="bg-black text-white p-4 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/" className="font-black italic text-xl tracking-tighter hover:text-blue-400 transition-colors">
              ATELIER OS
            </Link>

            <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest">
              <Link href="/order-entry" className="hover:text-blue-400">Order Entry</Link>

              {user && (
                <>
                  <Link href="/casting" className="hover:text-blue-400">Casting</Link>
                  <Link href="/workshop" className="hover:text-blue-400">Workshop</Link>
                  <Link href="/admin" className="hover:text-blue-400">Admin</Link>

                  <form action={logout}>
                    <button type="submit" className="bg-white text-black px-3 py-1 rounded hover:bg-gray-200 transition-colors">
                      Logout
                    </button>
                  </form>
                </>
              )}

              {!user && (
                <Link href="/login" className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-500 transition-colors">
                  Login
                </Link>
              )}
            </div>
          </div>
        </nav>
        <main>{children}</main>
        <Analytics />
      </body>
    </html>
  )
}