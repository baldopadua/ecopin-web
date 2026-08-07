'use client'
import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getTimeoutMinutes } from '@/lib/api/system'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false)
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(60) // Default 60 minutes
  const router = useRouter()
  const activityTimeoutRef = useRef(null)
  const refreshIntervalRef = useRef(null)

  const handleSessionExpired = () => {
    localStorage.removeItem('authToken')
    setShowSessionExpiredModal(true)
  }

  useEffect(() => {
    // Fetch system settings to get session timeout (only if token exists)
    const token = localStorage.getItem('authToken')
    if (!token) return

    const fetchSessionTimeout = async () => {
      const timeout = await getTimeoutMinutes()
      if (timeout && timeout.session_timeout_minutes) {
        setSessionTimeoutMinutes(timeout.session_timeout_minutes)
      }
    }

    fetchSessionTimeout()
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const pathname = window.location.pathname
    const isPublicRoute = !pathname.startsWith('/dashboard') && !pathname.startsWith('/map')

    // Public routes: no session management needed
    if (isPublicRoute) return

    // Protected route with no token: redirect to login
    if (!token) {
      router.push('/auth')
      return
    }

    // Function to refresh the session
    const refreshSession = async (isInitial = false) => {
      try {
        const storedToken = localStorage.getItem('authToken')

        if (!storedToken) {
          if (!isInitial) {
            handleSessionExpired()
          }
          return
        }

        // Check if token is expired by decoding JWT
        try {
          const payload = JSON.parse(atob(storedToken.split('.')[1]))
          const currentTime = Math.floor(Date.now() / 1000)

          if (payload.exp && payload.exp < currentTime) {
            if (!isInitial) {
              handleSessionExpired()
            }
            return
          }
        } catch (e) {
          if (!isInitial) {
            handleSessionExpired()
          }
          return
        }
      } catch (error) {
        if (!isInitial) {
          handleSessionExpired()
        }
      }
    }

    // Activity tracking - refresh session on user activity
    const handleUserActivity = () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }
      activityTimeoutRef.current = setTimeout(() => {
        refreshSession(false)
      }, 30000)
    }

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity)
    })

    refreshSession(true)

    const refreshIntervalMs = (sessionTimeoutMinutes * 60 * 1000) * 0.8
    refreshIntervalRef.current = setInterval(() => {
      refreshSession(false)
    }, refreshIntervalMs)

    const handleStorageChange = (e) => {
      if (e.key === 'authToken' && e.newValue === null) {
        setShowSessionExpiredModal(true)
      }
    }

    const handleSessionExpiredEvent = () => {
      localStorage.removeItem('authToken')
      setShowSessionExpiredModal(true)
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('session-expired', handleSessionExpiredEvent)

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity)
      })
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('session-expired', handleSessionExpiredEvent)
    }
  }, [router, sessionTimeoutMinutes])

  const handleModalClose = () => {
    setShowSessionExpiredModal(false)
    router.push('/auth')
  }

  return (
    <SessionContext.Provider value={{ handleSessionExpired }}>
      {children}
      {showSessionExpiredModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <div className="text-center">
              <div className="mb-4">
                <svg
                  className="w-16 h-16 mx-auto text-warning"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-text-primary mb-2">Session Expired</h2>
              <p className="text-text-secondary mb-6">
                You have been logged out due to inactivity. Please sign in again to continue.
              </p>
              <button
                onClick={handleModalClose}
                className="btn-primary w-full"
              >
                Return to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}

// Helper function to trigger session expired from non-React code
export function triggerSessionExpired() {
  window.dispatchEvent(new CustomEvent('session-expired'))
}
