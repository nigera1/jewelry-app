import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { Navbar } from '@/components/Navbar'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}