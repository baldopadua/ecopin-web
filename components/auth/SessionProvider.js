'use client'
import { createContext, useContext, useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { getSessionMetadata, readSessionKey, subscribeSession, clearSessionMetadata, loadSessionMetadata } from '@/lib/auth-token.mjs'
import { logout } from '@/lib/api/auth'
import Dialog from '@/components/ui/Dialog'
import { Clock } from 'lucide-react'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false)
  const session = useSyncExternalStore(subscribeSession, getSessionMetadata, () => null)
  const showing = useRef(false)
  const router = useRouter()

  const handleSessionExpired = useCallback(() => {
    if (showing.current) return
    showing.current = true
    clearSessionMetadata()
    void logout().catch(() => {})
    setShowSessionExpiredModal(true)
  }, [])

  const validateSessionWithServer = useCallback(async () => {
    const key = readSessionKey()
    const current = await loadSessionMetadata()
    if (current?.state === 'full') return true
    if (readSessionKey() === key || !readSessionKey()) handleSessionExpired()
    return false
  }, [handleSessionExpired])

  useEffect(() => {
    const check = () => {
      if (!session) return
      if (session?.expiresAt <= Date.now()) handleSessionExpired()
      else void validateSessionWithServer()
    }
    const visible = () => { if (document.visibilityState === 'visible') check() }
    const timer = setInterval(check, 60000)
    document.addEventListener('visibilitychange', visible)
    window.addEventListener('session-expired', handleSessionExpired)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', visible)
      window.removeEventListener('session-expired', handleSessionExpired)
    }
  }, [session, handleSessionExpired, validateSessionWithServer])

  return <SessionContext.Provider value={{ handleSessionExpired, validateSessionWithServer, showSessionExpiredModal }}>
    {children}
    {showSessionExpiredModal && <Dialog open labelledBy="session-expired-title" dismissible={false}>
      <div className="card max-w-md w-full text-center">
        <Clock size={64} strokeWidth={1.5} className="mx-auto text-warning mb-4" aria-hidden="true" />
        <h2 id="session-expired-title" className="text-xl font-medium text-text-primary mb-2">Sign in to continue</h2>
        <p className="text-text-secondary mb-6">Your session has ended. Sign in again to open your workspace.</p>
        <button onClick={() => router.push('/auth')} className="btn-primary w-full min-h-12">Return to sign in</button>
      </div>
    </Dialog>}
  </SessionContext.Provider>
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) throw new Error('useSession must be used within a SessionProvider')
  return context
}

export { triggerSessionExpired } from '@/lib/auth-token.mjs'
