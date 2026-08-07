'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import PublicLayout from '@/components/layout/PublicLayout'

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL + '/api/auth';

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <PublicLayout>
      <div className="relative z-10 flex items-center justify-center px-10 sm:px-16 py-20 min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-4xl">
          <div className="grid md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl border border-border/50">
            {/* Left Panel - Branding */}
            <div className="hidden md:flex flex-col justify-between p-10 bg-primary text-white dark:text-black relative overflow-hidden">
              <div>
                <a href="/" className="text-2xl font-bold tracking-tight">
                  EcoPin<span className="text-accent dark:text-black">.AI</span>
                </a>
              </div>

              <div className="relative z-10">
                <h2 className="text-3xl font-extrabold leading-tight mb-4">
                  Welcome back to<br />Pasig&apos;s SWMO Portal
                </h2>
                <p className="text-white/80 dark:text-black/60 text-sm leading-relaxed max-w-xs">
                  Monitor, manage, and resolve environmental concerns across the city with AI-powered reporting.
                </p>
              </div>

              <div className="relative z-10 flex items-center gap-3 text-white/60 dark:text-black/50 text-xs">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <span>Secured &amp; managed by Pasig City LGU</span>
              </div>

              {/* Decorative circles */}
              <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/10 dark:bg-black/10"></div>
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 dark:bg-black/5"></div>
            </div>

            {/* Right Panel - Form */}
            <div className="bg-white dark:bg-black/80 backdrop-blur-sm p-8 sm:p-10 flex flex-col justify-center">
              {/* Mobile-only brand */}
              <div className="md:hidden text-center mb-8">
                <a href="/" className="text-xl font-bold tracking-tight text-text-primary">
                  EcoPin<span className="text-accent-green">.AI</span>
                </a>
              </div>

              <div className="mb-8">
                <div className="w-12 h-12 bg-accent-green/10 rounded-xl flex items-center justify-center text-primary mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-text-primary mb-1">
                  Sign In
                </h1>
                <p className="text-sm text-text-muted">
                  Enter your credentials to access the dashboard
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5 ml-1">Email</label>
                  <input
                    ref={emailRef}
                    type="email"
                    placeholder="you@pasigcity.gov.ph"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={handleEmailKeyDown}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5 ml-1">Password</label>
                  <div className="relative">
                    <input
                      ref={passwordRef}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={handlePasswordKeyDown}
                      className="input pr-10"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                    >
                      {showPassword ? (
                        <img src="/icons/eye-crossed.svg" alt="Hide password" className="w-5 h-5" />
                      ) : (
                        <img src="/icons/eye.svg" alt="Show password" className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-error/10 border border-error/30 rounded-lg">
                    <svg className="w-4 h-4 text-error mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <p className="text-sm text-error">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : 'Sign In'}
                </button>

                <div className="pt-2">
                  <p className="text-center text-xs text-text-muted">
                    Authorized personnel only. Contact an administrator for account access.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
