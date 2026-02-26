'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { LogOut } from 'lucide-react'

export function Navbar() {
    const pathname = usePathname()
    const { user, signOut } = useAuth()

    // Hide navbar on login page
    if (pathname === '/login') return null
    // Hide navbar when not authenticated
    if (!user) return null

    return (
        <nav className="bg-black text-white p-4 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <Link
                    href="/"
                    className="font-black italic text-xl tracking-tighter hover:text-blue-400 transition-colors"
                >
                    ATELIER OS
                </Link>

                <div className="flex items-center gap-6">
                    <div className="flex gap-6 text-[10px] font-black uppercase tracking-widest">
                        <Link href="/order-entry" className="hover:text-blue-400">Order Entry</Link>
                        <Link href="/casting" className="hover:text-blue-400">Casting</Link>
                        <Link href="/workshop" className="hover:text-blue-400">Workshop</Link>
                        <Link href="/admin" className="hover:text-blue-400">Admin</Link>
                    </div>

                    <button
                        onClick={signOut}
                        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-400 transition-colors ml-2"
                        title="Log out"
                    >
                        <LogOut size={14} />
                        <span className="hidden sm:inline">Logout</span>
                    </button>
                </div>
            </div>
        </nav>
    )
}
