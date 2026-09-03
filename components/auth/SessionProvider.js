'use client'
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getTimeoutMinutes } from '@/lib/api/system'
import { validateSession } from '@/lib/api/auth'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false)
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(60) // Default 60 minutes
  const isShowingModalRef = useRef(false) // Prevent duplicate modals using ref
  const router = useRouter()
  const sessionCheckRef = useRef(null)

  const handleSessionExpired = useCallback(() => {
    if (isShowingModalRef.current) return // Prevent duplicate modals
    
    localStorage.removeItem('authToken')
    localStorage.removeItem('lastActivity')
    isShowingModalRef.current = true
    setShowSessionExpiredModal(true)
  }, [])

  const updateLastActivity = () => {
    localStorage.setItem('lastActivity', Date.now())
  }

  // Function to validate session with server (for critical operations)
  const validateSessionWithServer = useCallback(async () => {
    try {
      const validationResult = await validateSession()
      if (!validationResult.valid) {
        localStorage.removeItem('authToken')
        localStorage.removeItem('lastActivity')
        if (!isShowingModalRef.current) {
          isShowingModalRef.current = true
          setShowSessionExpiredModal(true)
        }
        return false
      }
      return true
    } catch (error) {
      console.error('Server validation failed:', error)
      // Assume valid on network errors to avoid false logouts
      return true
    }
  }, [])

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

    // Initialize last activity if not exists
    if (!localStorage.getItem('lastActivity')) {
      updateLastActivity()
    }

    // Function to check session expiry based on last activity
    const checkSessionExpiry = () => {
      const lastActivity = localStorage.getItem('lastActivity')
      const currentTime = Date.now()
      const timeoutMs = sessionTimeoutMinutes * 60 * 1000

      if (!lastActivity) {
        localStorage.removeItem('authToken')
        if (!isShowingModalRef.current) {
          isShowingModalRef.current = true
          setShowSessionExpiredModal(true)
        }
        return
      }

      const timeSinceActivity = currentTime - parseInt(lastActivity)
      
      // Check if session has expired
      if (timeSinceActivity > timeoutMs) {
        localStorage.removeItem('authToken')
        localStorage.removeItem('lastActivity')
        if (!isShowingModalRef.current) {
          isShowingModalRef.current = true
          setShowSessionExpiredModal(true)
        }
        return
      }

      // Also check JWT expiration
      try {
        const storedToken = localStorage.getItem('authToken')
        if (storedToken) {
          const payload = JSON.parse(atob(storedToken.split('.')[1]))
          const jwtExpTime = payload.exp * 1000 // Convert to milliseconds
          
          if (jwtExpTime < currentTime) {
            localStorage.removeItem('authToken')
            localStorage.removeItem('lastActivity')
            if (!isShowingModalRef.current) {
              isShowingModalRef.current = true
              setShowSessionExpiredModal(true)
            }
            return
          }
        }
      } catch (e) {
        // If JWT parsing fails, consider session expired
        localStorage.removeItem('authToken')
        localStorage.removeItem('lastActivity')
        if (!isShowingModalRef.current) {
          isShowingModalRef.current = true
          setShowSessionExpiredModal(true)
        }
        return
      }
    }

    // Activity tracking - update last activity timestamp
    const handleUserActivity = () => {
      updateLastActivity()
    }

    // Enhanced activity events for better detection
    const activityEvents = [
      'mousedown', 'keydown', 'scroll', 'touchstart', 'click',
      'focus', 'pageshow'
    ]
    
    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity)
    })

    // Handle visibility change specifically
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // First do client-side check
        checkSessionExpiry()
        
        // Then do server-side validation for additional security (async)
        validateSession().then(validationResult => {
          if (!validationResult.valid) {
            localStorage.removeItem('authToken')
            localStorage.removeItem('lastActivity')
            if (!isShowingModalRef.current) {
              isShowingModalRef.current = true
              setShowSessionExpiredModal(true)
            }
          }
        }).catch(error => {
          console.error('Server validation failed on visibility change:', error)
          // Don't logout on network errors, rely on client-side check
        })
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Single session check interval (every 60 seconds)
    sessionCheckRef.current = setInterval(() => {
      checkSessionExpiry()
    }, 60000)

    // Initial check
    checkSessionExpiry()

    const handleStorageChange = (e) => {
      if (e.key === 'authToken' && e.newValue === null) {
        localStorage.removeItem('lastActivity')
        if (!isShowingModalRef.current) {
          isShowingModalRef.current = true
          setShowSessionExpiredModal(true)
        }
      }
    }

    const handleSessionExpiredEvent = () => {
      localStorage.removeItem('authToken')
      localStorage.removeItem('lastActivity')
      if (!isShowingModalRef.current) {
        isShowingModalRef.current = true
        setShowSessionExpiredModal(true)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('session-expired', handleSessionExpiredEvent)

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current)
      }
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('session-expired', handleSessionExpiredEvent)
    }
  }, [router, sessionTimeoutMinutes, handleSessionExpired])

  const handleModalClose = () => {
    setShowSessionExpiredModal(false)
    isShowingModalRef.current = false
    router.push('/auth')
  }

  return (
    <SessionContext.Provider value={{ handleSessionExpired, validateSessionWithServer }}>
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
