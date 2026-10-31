'use client'
import { useState } from 'react'
import { ArrowLeft, Moon, Sun, Mail, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { requestPasswordReset } from '@/lib/api/auth'
import usePublicTheme from '@/components/landing/usePublicTheme'
import publicStyles from '@/components/landing/LandingPage.module.css'
import authStyles from '../auth/Auth.module.css'
import styles from '../force-change-password/Password.module.css'

export default function ForgotPasswordPage() {
  const { isDark, toggleTheme } = usePublicTheme()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch (err) {
      setError(err.message || 'We could not send the reset link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return <div className={`${publicStyles.page} ${authStyles.page}`}>
    <header className={authStyles.topBar}>
      <Link href="/auth" className={authStyles.back}><ArrowLeft size={16} aria-hidden="true" />Back to sign in</Link>
      <button type="button" className={authStyles.theme} onClick={toggleTheme} aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
        {isDark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
      </button>
    </header>
    <main className={styles.main}>
      <section className={styles.content} aria-labelledby="forgot-heading">
        <span className={styles.icon}><Mail size={28} aria-hidden="true" /></span>
        <h1 id="forgot-heading">Reset your password</h1>
        <p className={authStyles.description}>Enter the email for your EcoPin account. If it matches an account, we will send a link to choose a new password.</p>
        {sent ? <div role="status" className={authStyles.notice}>
          <p>If an account exists for <strong>{email.trim()}</strong>, a reset link is on its way. It expires after a short time, so open it soon. Check your spam folder if you do not see it.</p>
        </div> : <form className={authStyles.form} onSubmit={handleSubmit} aria-busy={loading}>
          <div>
            <label htmlFor="forgot-email">Email address</label>
            <input id="forgot-email" type="email" autoComplete="username" required value={email} disabled={loading} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" />
          </div>
          {error && <div role="alert" className={authStyles.error}><AlertCircle size={20} aria-hidden="true" /><p>{error}</p></div>}
          <button type="submit" disabled={loading} className={publicStyles.primaryButton}>{loading ? 'Sending link…' : 'Send reset link'}</button>
        </form>}
      </section>
    </main>
  </div>
}
