'use client'
import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check for session expiration on mount
    const checkSession = () => {
      const token = localStorage.getItem('authToken')
      if (!token) {
        // No token, redirect to login
        router.push('/auth')
      }
    }

    checkSession()

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
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('session-expired', handleSessionExpiredEvent)
    }
  }, [router])

  const handleSessionExpired = () => {
    localStorage.removeItem('authToken')
    setShowSessionExpiredModal(true)
  }

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
