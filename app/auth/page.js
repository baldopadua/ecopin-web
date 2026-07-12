'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL + '/api/auth';

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  const emailRef = useRef(null)
  const passwordRef = useRef(null)

  async function handleSubmit() {
    setLoading(true); setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Login error response:', data);
        throw new Error(data.error || data.message || 'Authentication failed');
      }

      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      console.log('Authentication successful:', data);

      // Check user role before allowing dashboard access
      const userRole = data.user?.role || 'citizen'
      if (userRole === 'citizen') {
        localStorage.removeItem('authToken')
        setError('Authorized personnel only. Contact an administrator to create an account.')
        setLoading(false)
        return
      }

      router.push('/dashboard');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleEmailKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      passwordRef.current?.focus()
    }
  }

  const handlePasswordKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Welcome Back
          </h1>
          <p className="text-sm text-text-secondary">
            Sign in to access your dashboard
          </p>
        </div>

        <div className="space-y-4">
          <input
            ref={emailRef}
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={handleEmailKeyDown}
            className="input"
          />
          <input
            ref={passwordRef}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handlePasswordKeyDown}
            className="input"
          />

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Loading...' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-text-muted">
            Contact an administrator to create an account
          </p>
        </div>
      </div>
    </div>
  )
}