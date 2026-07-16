'use client'
import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getSystemSettings } from '@/lib/api'

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
      const settings = await getSystemSettings()
      if (settings && settings.session_timeout_minutes) {
        setSessionTimeoutMinutes(settings.session_timeout_minutes)
      }
    }

    fetchSessionTimeout()
  }, [])

  useEffect(() => {
    // Check for session expiration on mount (only for protected routes)
    const checkSession = () => {
      const token = localStorage.getItem('authToken')
      const pathname = window.location.pathname
      
      // Only check auth on protected routes (dashboard)
      if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/map')) {
        return true // Allow access to public routes
      }
      
      if (!token) {
        // No token, redirect to login
        router.push('/auth')
        return false
      }
      return true
    }

    if (!checkSession()) return

    // Function to refresh the session
    const refreshSession = async (isInitial = false) => {
      try {
        const storedToken = localStorage.getItem('authToken')
        
        if (!storedToken) {
          console.log('No token found in localStorage')
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
            console.log('Token has expired')
            if (!isInitial) {
              handleSessionExpired()
            }
            return
          }
          
          console.log('Token is valid, session active')
        } catch (e) {
          console.error('Error decoding token:', e)
          // If we can't decode the token, assume it's invalid
          if (!isInitial) {
            handleSessionExpired()
          }
          return
        }
      } catch (error) {
        console.error('Error refreshing session:', error)
        if (!isInitial) {
          handleSessionExpired()
        }
      }
    }

    // Activity tracking - refresh session on user activity
    const handleUserActivity = () => {
      // Clear existing timeout
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }

      // Set new timeout to refresh session after 30 seconds of inactivity
      // This ensures we refresh the session while the user is still active
      activityTimeoutRef.current = setTimeout(() => {
        refreshSession(false)
      }, 30000) // 30 seconds
    }

    // Set up activity listeners
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity)
    })

    // Initial refresh on mount (with isInitial flag to not trigger expired modal)
    refreshSession(true)

    // Calculate refresh interval based on session timeout (refresh at 80% of timeout)
    const refreshIntervalMs = (sessionTimeoutMinutes * 60 * 1000) * 0.8
    
    // Set up periodic refresh as a fallback
    refreshIntervalRef.current = setInterval(() => {
      refreshSession(false)
    }, refreshIntervalMs)

    // Listen for storage events (for multi-tab support)
    const handleStorageChange = (e) => {
      if (e.key === 'authToken' && e.newValue === null) {
        // Token was removed in another tab
        setShowSessionExpiredModal(true)
      }
    }

    // Listen for custom session expired event
    const handleSessionExpiredEvent = () => {
      localStorage.removeItem('authToken')
      setShowSessionExpiredModal(true)
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('session-expired', handleSessionExpiredEvent)

    return () => {
      // Clean up activity listeners
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity)
      })
      
      // Clear timeouts and intervals
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
