'use client'
import { useState, useEffect } from 'react'
import { useSession } from '@/components/auth/SessionProvider'

export default function TestSessionPage() {
  const { validateSessionWithServer } = useSession()
  const [lastActivity, setLastActivity] = useState(null)
  const [sessionTimeout, setSessionTimeout] = useState(60)
  const [timeUntilExpiry, setTimeUntilExpiry] = useState(null)
  const [validationResult, setValidationResult] = useState(null)

  useEffect(() => {
    const updateTimer = () => {
      const activity = localStorage.getItem('lastActivity')
      if (activity) {
        setLastActivity(new Date(parseInt(activity)).toLocaleTimeString())
        
        const timeout = localStorage.getItem('sessionTimeoutMinutes') || 60
        setSessionTimeout(timeout)
        
        const timeSince = Date.now() - parseInt(activity)
        const timeLeft = (timeout * 60 * 1000) - timeSince
        setTimeUntilExpiry(Math.max(0, Math.floor(timeLeft / 1000)))
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleServerValidation = async () => {
    const result = await validateSessionWithServer()
    setValidationResult(result)
  }

  const forceExpireSession = () => {
    // Set last activity to past to force expiry
    localStorage.setItem('lastActivity', Date.now() - (61 * 60 * 1000))
    window.location.reload()
  }

  const resetActivity = () => {
    localStorage.setItem('lastActivity', Date.now())
    window.location.reload()
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Session Timeout Test Page</h1>
      
      <div className="space-y-4">
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-2">Current Session Status</h2>
          <div className="space-y-2">
            <p><strong>Last Activity:</strong> {lastActivity || 'Not set'}</p>
            <p><strong>Session Timeout:</strong> {sessionTimeout} minutes</p>
            <p><strong>Time Until Expiry:</strong> {timeUntilExpiry !== null ? `${Math.floor(timeUntilExpiry / 60)}m ${timeUntilExpiry % 60}s` : 'Calculating...'}</p>
            <p><strong>Auth Token:</strong> {localStorage.getItem('authToken') ? 'Present' : 'Missing'}</p>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-2">Server Validation</h2>
          <button 
            onClick={handleServerValidation}
            className="btn-primary px-4 py-2 mr-2"
          >
            Validate Session with Server
          </button>
          {validationResult && (
            <div className="mt-2">
              <p><strong>Result:</strong> {validationResult ? 'Valid' : 'Invalid'}</p>
              <p className="text-sm text-gray-600">{JSON.stringify(validationResult)}</p>
            </div>
          )}
        </div>

        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-2">Test Controls</h2>
          <button 
            onClick={forceExpireSession}
            className="btn-danger px-4 py-2 mr-2"
          >
            Force Session Expire
          </button>
          <button 
            onClick={resetActivity}
            className="btn-secondary px-4 py-2"
          >
            Reset Activity
          </button>
        </div>

        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-2">Instructions</h2>
          <ol className="list-decimal list-inside space-y-1">
            <li>Check current session status above</li>
            <li>Test server validation by clicking the button</li>
            <li>To test timeout: Click "Force Session Expire" and wait for the session check (every 60s) or refresh the page</li>
            <li>The session expired modal should appear when session is expired</li>
            <li>Use "Reset Activity" to restore a valid session</li>
            <li>Try switching tabs and coming back to test visibility API</li>
          </ol>
        </div>
      </div>
    </div>
  )
}