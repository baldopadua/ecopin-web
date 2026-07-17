'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL + '/api/auth'

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken')
      if (!token) {
        router.push('/auth')
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          localStorage.removeItem('authToken')
          router.push('/auth')
          return
        }

        const data = await response.json()
        const userRole = data.user.role || 'citizen'

        setUser(data.user)

        if (userRole === 'admin' && pathname === '/dashboard') {
          router.push('/dashboard/admin')
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error)
        localStorage.removeItem('authToken')
        router.push('/auth')
      }
    }

    checkAuth()
  }, [pathname])

  async function logout() {
    localStorage.removeItem('authToken')
    router.push('/auth')
  }

  if (!user) return <p className="text-center text-text-primary mt-8">Loading...</p>

  return (
    <div className="flex h-screen bg-background dark:bg-[#0a0f08]">
      <Sidebar user={user} onLogout={logout} />
      <main className="flex-1 overflow-auto bg-surface dark:bg-[#0a0f08]">
        {children}
      </main>
    </div>
  )
}
