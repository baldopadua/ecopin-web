'use client'
import { useEffect, useState } from 'react'
import { ArrowLeft, Eye, EyeOff, Moon, Sun, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { resetPassword } from '@/lib/api/auth'
import usePublicTheme from '@/components/landing/usePublicTheme'
import publicStyles from '@/components/landing/LandingPage.module.css'
import authStyles from '../auth/Auth.module.css'
import styles from '../force-change-password/Password.module.css'

// The emailed recovery link carries the short-lived token in the URL fragment (never sent to servers or logs).
function readRecoveryToken() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return params.get('type') === 'recovery' ? params.get('access_token') : null
}

export default function ResetPasswordPage() {
  const { isDark, toggleTheme } = usePublicTheme()
  const [token, setToken] = useState(undefined)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setToken(readRecoveryToken())
    // Remove the token from the address bar and history once it is in memory.
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname)
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    if (loading) return
    setError(null)
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Use at least 8 characters.'); return }
    setLoading(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err.message || 'We could not reset your password. Request a new link and try again.')
    } finally {
      setLoading(false)
    }
  }

  const mismatch = Boolean(confirm && confirm !== password)
  let content
  if (token === undefined) content = null
  else if (done) content = <div role="status" className={authStyles.notice}>
    <CheckCircle2 size={22} aria-hidden="true" />
    <p>Your password was updated. <Link href="/auth">Sign in</Link> on the web, or open the EcoPin app and sign in with the new password.</p>
  </div>
  else if (!token) content = <div role="alert" className={authStyles.error}>
    <AlertCircle size={20} aria-hidden="true" />
    <p>This reset link is missing or has expired. <Link href="/forgot-password">Request a new link</Link>.</p>
  </div>
  else content = <form className={authStyles.form} onSubmit={handleSubmit} aria-busy={loading}>
    <div>
      <label htmlFor="reset-password">New password</label>
      <div className={authStyles.password}>
        <input id="reset-password" type={show ? 'text' : 'password'} autoComplete="new-password" required value={password} disabled={loading} onChange={event => setPassword(event.target.value)} />
        <button type="button" aria-label={show ? 'Hide passwords' : 'Show passwords'} onClick={() => setShow(value => !value)}>
          {show ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
        </button>
      </div>
    </div>
    <div>
      <label htmlFor="reset-confirm">Confirm new password</label>
      <input id="reset-confirm" type={show ? 'text' : 'password'} autoComplete="new-password" required value={confirm} disabled={loading} aria-invalid={mismatch} onChange={event => setConfirm(event.target.value)} />
      {mismatch && <p className={styles.mismatch}>Passwords do not match.</p>}
    </div>
    <p className={authStyles.description} style={{ margin: 0 }}>Use at least 8 characters. Your account may also require upper and lower case letters, a number and a symbol; we will tell you if something is missing.</p>
    {error && <div role="alert" className={authStyles.error}><AlertCircle size={20} aria-hidden="true" /><p>{error}</p></div>}
    <button type="submit" disabled={loading} className={publicStyles.primaryButton}>{loading ? 'Updating password…' : 'Update password'}</button>
  </form>

  return <div className={`${publicStyles.page} ${authStyles.page}`}>
    <header className={authStyles.topBar}>
      <Link href="/auth" className={authStyles.back}><ArrowLeft size={16} aria-hidden="true" />Back to sign in</Link>
      <button type="button" className={authStyles.theme} onClick={toggleTheme} aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
        {isDark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
      </button>
    </header>
    <main className={styles.main}>
      <section className={styles.content} aria-labelledby="reset-heading">
        <span className={styles.icon}><ShieldCheck size={28} aria-hidden="true" /></span>
        <h1 id="reset-heading">Choose a new password</h1>
        {content}
      </section>
    </main>
  </div>
}
