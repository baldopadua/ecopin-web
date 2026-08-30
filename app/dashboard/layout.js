'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { UserProvider } from '@/components/auth/UserContext'
import { SessionProvider } from '@/components/auth/SessionProvider'

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
        } else if (userRole === 'field_crew' && pathname === '/dashboard') {
          router.push('/dashboard/field-crew')
        } else if (userRole === 'officer' && pathname === '/dashboard') {
          // console.log("Officer: ", userRole);
          router.push('/dashboard/officer')
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error)
        localStorage.removeItem('authToken')
        router.push('/auth')
      }
    }

    checkAuth()
  }, [pathname])

  if (!user) return (
    <div className="flex h-screen bg-background dark:bg-[#0a0f08]">
      <aside className="w-64 bg-surface dark:bg-[#0a0f08] border-r border-border h-screen flex flex-col animate-pulse">
        <div className="p-6 border-b border-border">
          <div className="h-6 w-24 rounded bg-border/50" />
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl">
              <div className="w-5 h-5 rounded bg-border/50" />
              <div className="h-3 flex-1 rounded bg-border/50" />
            </div>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto bg-surface dark:bg-[#0a0f08] p-8">
        <div className="mb-8 animate-pulse">
          <div className="h-8 w-48 rounded bg-border/50 mb-2" />
          <div className="h-4 w-64 rounded bg-border/50" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-3 w-20 rounded bg-border/50 mb-3" />
              <div className="h-8 w-12 rounded bg-border/50 mb-2" />
              <div className="h-3 w-16 rounded bg-border/50" />
            </div>
          ))}
        </div>
        <div className="card animate-pulse">
          <div className="h-6 w-32 rounded bg-border/50 mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 py-3 border-b border-border/30">
              <div className="h-3 flex-1 rounded bg-border/50" />
              <div className="h-3 flex-1 rounded bg-border/50" />
              <div className="h-3 w-20 rounded bg-border/50" />
              <div className="h-3 w-20 rounded bg-border/50" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )

  return (
    <SessionProvider>
      <UserProvider user={user}>
        <div className="flex h-screen bg-background dark:bg-[#0a0f08]">
          <Sidebar />
          <main className="flex-1 overflow-auto bg-surface dark:bg-[#0a0f08]">
            {children}
          </main>
        </div>
      </UserProvider>
    </SessionProvider>
  )
}
