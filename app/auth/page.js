'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL + '/api/auth';

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const router = useRouter()

  const emailRef = useRef(null)
  const passwordRef = useRef(null)
  const confirmPasswordRef = useRef(null)

  const validatePassword = (password) => {
    const minLength = 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    const requirements = [
      { met: password.length >= minLength, text: `At least ${minLength} characters long` },
      { met: hasUpperCase, text: 'At least one uppercase letter' },
      { met: hasLowerCase, text: 'At least one lowercase letter' },
      { met: hasNumbers, text: 'At least one number' },
      { met: hasSpecialChar, text: 'At least one special character' }
    ]

    const allMet = requirements.every(r => r.met)

    if (!allMet) {
      return requirements
    }
    return null
  }

  async function handleSubmit() {
    setLoading(true); setError(null)

    // Validate password for registration
    if (!isLogin) {
      const passwordError = validatePassword(password)
      if (passwordError) {
        setError('Password does not meet all requirements')
        setLoading(false)
        return
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }
    }

    let endpoint = isLogin ? `${API_BASE_URL}/login` : `${API_BASE_URL}/register`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
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
        setError('Authorized personnel only')
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
      if (!isLogin) {
        confirmPasswordRef.current?.focus()
      } else {
        handleSubmit()
      }
    }
  }

  const handleConfirmPasswordKeyDown = (e) => {
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
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-sm text-text-secondary">
            {isLogin ? 'Sign in to access your dashboard' : 'Register to get started'}
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
          {!isLogin && (
            <input
              ref={confirmPasswordRef}
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onKeyDown={handleConfirmPasswordKeyDown}
              className="input"
            />
          )}

          {!isLogin && (
            <div className="text-xs space-y-2">
              <div className="flex justify-between items-center">
                <p className="font-medium text-text-secondary">Password requirements:</p>
                <span className="text-text-secondary">
                  {validatePassword(password) ?
                    `${validatePassword(password).filter(r => r.met).length}/5 met` :
                    '5/5 met'}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-accent-green h-2 rounded-full transition-all"
                  style={{
                    width: `${validatePassword(password) ?
                      (validatePassword(password).filter(r => r.met).length / 5) * 100 : 100}%`
                  }}
                ></div>
              </div>
              <ul className="space-y-1">
                {validatePassword(password) ? (
                  validatePassword(password).map((req, index) => (
                    <li
                      key={index}
                      className={`flex items-center gap-2 ${
                        req.met ? 'text-green-600 dark:text-green-400' : 'text-text-secondary'
                      }`}
                    >
                      <span>{req.met ? '✓' : '○'}</span>
                      <span>{req.text}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-green-600 dark:text-green-400 flex items-center gap-2">
                    <span>✓</span>
                    <span>All requirements met</span>
                  </li>
                )}
              </ul>
            </div>
          )}

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
            {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>

          <p
            className="text-center text-sm text-text-secondary cursor-pointer hover:text-accent-green transition-colors"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </p>
        </div>
      </div>
    </div>
  )
}