'use client'
import { clearSessionMetadata, getSessionMetadata, loadSessionMetadata, subscribeSession } from '@/lib/auth-token.mjs'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import { UserProvider } from '@/components/auth/UserContext'
import { SessionProvider, useSession } from '@/components/auth/SessionProvider'
import { TaskProvider } from '@/components/context/TaskContext'
import DashboardQueryProvider from '@/components/context/DashboardQueryProvider'
import UrgencyAlert from '@/components/reports/UrgencyAlert'
import styles from '@/components/layout/DashboardShell.module.css'
import { useNavigationLoading } from '@/components/context/NavigationLoadingContext'
import { reportDiagnostic } from '../../lib/diagnostics.mjs';

export default function DashboardLayout({ children }) {
  return (
    <SessionProvider>
      <DashboardContent>{children}</DashboardContent>
    </SessionProvider>
  )
}

function DashboardContent({ children }) {
  const session = useSyncExternalStore(subscribeSession, getSessionMetadata, () => null)
  const [authReady, setAuthReady] = useState(false)
  const { showSessionExpiredModal } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { stopLoading } = useNavigationLoading()
  const user = session?.state === 'full' ? session.user : null
  const role = user?.role || 'citizen'
  const redirectTo = !authReady || showSessionExpiredModal ? null
    : !user || role === 'citizen' || role === 'field_crew' ? '/auth'
      : pathname.startsWith('/dashboard/admin') && role !== 'admin' && role !== 'sysadmin' ? '/dashboard/officer'
        : pathname === '/dashboard' && (role === 'admin' || role === 'sysadmin') ? '/dashboard/admin'
          : pathname === '/dashboard' && role === 'officer' ? '/dashboard/officer'
            : null

  useEffect(() => {
    let active = true
    const cached = getSessionMetadata()
    const validCachedSession = cached?.state === 'full' && cached.expiresAt > Date.now()
    void Promise.resolve(validCachedSession ? cached : loadSessionMetadata()).then((loadedSession) => {
      if (!active) return
      if (loadedSession?.state === 'full' && loadedSession.expiresAt <= Date.now()) clearSessionMetadata()
      setAuthReady(true)
    }).catch((error) => {
      if (active) {
        reportDiagnostic('error', 'other', 'Failed to fetch user data:', error)
        clearSessionMetadata()
        setAuthReady(true)
      }
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!authReady) return
    if (session && (!user || role === 'citizen' || role === 'field_crew')) clearSessionMetadata()
    // replace keeps the gated URL out of history so Back does not bounce forward again.
    if (redirectTo) router.replace(redirectTo)
    // The sidebar overlay only clears on a pathname change; a redirect back to the page the
    // user was already on never produces one, so release it once routing has settled.
    else stopLoading()
  }, [authReady, redirectTo, role, router, session, user, stopLoading])

  if (!authReady || !user || redirectTo) return (
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
      <UserProvider user={user}>
        <DashboardQueryProvider>
        <TaskProvider>
          <div className={styles.shell}>
            <a href="#workspace-content" className={styles.skip}>Skip to workspace</a>
                        <Sidebar />
            <main id="workspace-content" tabIndex={-1} className={styles.main}>
              {pathname !== '/dashboard/officer/urgent-verification' && <UrgencyAlert />}
              {children}
            </main>
          </div>
        </TaskProvider>
        </DashboardQueryProvider>
      </UserProvider>
  )
}
