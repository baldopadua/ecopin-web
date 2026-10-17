'use client'
import { clearSessionMetadata, loadSessionMetadata } from '@/lib/auth-token.mjs'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { UserProvider } from '@/components/auth/UserContext'
import { SessionProvider } from '@/components/auth/SessionProvider'
import { TaskProvider } from '@/components/context/TaskContext'
import styles from '@/components/layout/DashboardShell.module.css'
import { reportDiagnostic } from '../../lib/diagnostics.mjs';

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await loadSessionMetadata()
        if (session?.state !== 'full') {
          clearSessionMetadata()
          router.push('/auth')
          return
        }

        const data = { user: session.user }
        const userRole = data.user?.role || 'citizen'

        if (userRole === 'citizen' || userRole === 'field_crew') {
          // Immediately block citizen and field crew from any web dashboard pages
          clearSessionMetadata()
          router.push('/auth')
          return
        }

        if (pathname.startsWith('/dashboard/admin') && userRole !== 'admin' && userRole !== 'sysadmin') {
          setIsRedirecting(true)
          router.push('/dashboard/officer')
          return
        }

        setUser(data.user)

        if ((userRole === 'admin' || userRole === 'sysadmin') && pathname === '/dashboard') {
          setIsRedirecting(true)
          router.push('/dashboard/admin')
        } else if (userRole === 'officer' && pathname === '/dashboard') {
          setIsRedirecting(true)
          router.push('/dashboard/officer')
        } else {
          setIsRedirecting(false)
        }
      } catch (error) {
        reportDiagnostic('error', 'other', 'Failed to fetch user data:', error)
        clearSessionMetadata()
        router.push('/auth')
      }
    }

    checkAuth()
  }, [pathname, router])

  if (!user || isRedirecting) return (
    <div className={styles.shell} aria-busy="true" aria-label="Loading workspace">
      <div className={styles.mobileBar} aria-hidden="true"><div className="h-7 w-28 rounded-lg bg-border/50 animate-pulse" /></div>
            <aside className={`${styles.sidebar} ${styles.desktopSidebar} animate-pulse`}>
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
      <main className={styles.main}>
        <div className="p-8">
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
        </div>
      </main>
    </div>
  )

  return (
    <SessionProvider>
      <UserProvider user={user}>
        <TaskProvider>
          <div className={styles.shell}>
            <a href="#workspace-content" className={styles.skip}>Skip to workspace</a>
                        <Sidebar />
            <main id="workspace-content" tabIndex={-1} className={styles.main}>
              {children}
            </main>
          </div>
        </TaskProvider>
      </UserProvider>
    </SessionProvider>
  )
}
