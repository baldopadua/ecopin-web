'use client'
import { updateAuthToken } from '@/lib/auth-token.mjs'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff, Moon, Sun, ShieldCheck, Check, AlertCircle } from 'lucide-react'
import { forceChangePassword } from '@/lib/api/auth'
import { getSystemSettings } from '@/lib/api'
import usePublicTheme from '@/components/landing/usePublicTheme'
import PublicLoadingState from '@/components/ui/PublicLoadingState'
import publicStyles from '@/components/landing/LandingPage.module.css'
import authStyles from '../auth/Auth.module.css'
import styles from './Password.module.css'

export default function ForceChangePasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isChecking, setIsChecking] = useState(true)
  const router = useRouter()
  const { isDark, toggleTheme } = usePublicTheme()
  const [passwordSettings, setPasswordSettings] = useState({
    password_min_length: 8,
    password_require_uppercase: true,
    password_require_lowercase: true,
    password_require_numbers: true,
    password_require_special_chars: true,
  })

  useEffect(() => {
    if (!localStorage.getItem('tempAuthToken')) { router.replace('/auth'); return }
    let active = true
    getSystemSettings().then(settings => { if (active && settings) setPasswordSettings(settings) })
      .catch(err => console.error('Failed to load system settings:', err))
      .finally(() => { if (active) setIsChecking(false) })
    return () => { active = false }
  }, [router])
  const validatePassword = (password) => {
    const { 
      password_min_length, 
      password_require_uppercase, 
      password_require_lowercase, 
      password_require_numbers, 
      password_require_special_chars 
    } = passwordSettings;

    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    const requirements = [
      { met: password.length >= password_min_length, text: `At least ${password_min_length} characters long` }
    ]

    if (password_require_uppercase) requirements.push({ met: hasUpperCase, text: 'At least one uppercase letter' })
    if (password_require_lowercase) requirements.push({ met: hasLowerCase, text: 'At least one lowercase letter' })
    if (password_require_numbers) requirements.push({ met: hasNumbers, text: 'At least one number' })
    if (password_require_special_chars) requirements.push({ met: hasSpecialChar, text: 'At least one special character' })

    const allMet = requirements.every(r => r.met)
    return { requirements, allMet }
  }

  async function handleSubmit() {
    if (loading) return
    setError(null)

    if (!newPassword) {
      setError('Please enter a new password.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.allMet) {
      setError('Password does not meet all requirements.')
      return
    }

    try {
      setLoading(true)
      await forceChangePassword(newPassword)
      
      const token = localStorage.getItem('tempAuthToken')
      updateAuthToken(token)
      localStorage.removeItem('tempAuthToken')
      localStorage.setItem('lastActivity', Date.now().toString())

      router.push('/dashboard')
    } catch (err) {
      setError(err.message || 'Failed to change password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleBack() {
    localStorage.removeItem('tempAuthToken')
    router.push('/auth')
  }
  const validation = validatePassword(newPassword)
  const mismatch = Boolean(confirmPassword && confirmPassword !== newPassword)

  return <div className={`${publicStyles.page} ${authStyles.page}`}>
    <header className={authStyles.topBar}>
      <button type="button" onClick={handleBack} disabled={loading} className={authStyles.back}><ArrowLeft size={16} aria-hidden="true" />Back to sign in</button>
      <button type="button" className={authStyles.theme} onClick={toggleTheme} aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
        {isDark ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
      </button>
    </header>
    <main className={styles.main}>
      {isChecking ? <PublicLoadingState label="Checking your password requirements…" /> : <section className={styles.content} aria-labelledby="password-heading">
        <span className={styles.icon}><ShieldCheck size={28} aria-hidden="true" /></span>
        <h1 id="password-heading">Choose a new password</h1>
        <p className={authStyles.description}>Update your temporary password to continue to your EcoPin workspace.</p>
        <form className={authStyles.form} onSubmit={event => { event.preventDefault(); handleSubmit() }} aria-busy={loading}>
          <div>
            <label htmlFor="new-password">New password</label>
            <div className={authStyles.password}>
              <input id="new-password" type={showNewPassword ? 'text' : 'password'} autoComplete="new-password" required
                value={newPassword} disabled={loading} onChange={event => setNewPassword(event.target.value)}
                aria-describedby="password-requirements" />
              <button type="button" aria-label={showNewPassword ? 'Hide new password' : 'Show new password'} onClick={() => setShowNewPassword(value => !value)}>
                {showNewPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirm-password">Confirm new password</label>
            <div className={authStyles.password}>
              <input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" required
                value={confirmPassword} disabled={loading} onChange={event => setConfirmPassword(event.target.value)}
                aria-invalid={mismatch} aria-describedby={mismatch ? 'confirm-error' : undefined} />
              <button type="button" aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'} onClick={() => setShowConfirmPassword(value => !value)}>
                {showConfirmPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
              </button>
            </div>
            {mismatch && <p id="confirm-error" className={styles.mismatch}>Passwords do not match.</p>}
          </div>
          <div id="password-requirements" className={styles.requirements}>
            <h2>Password requirements</h2>
            <ul>{validation.requirements.map(requirement => <li key={requirement.text}>
              <span aria-hidden="true" className={requirement.met ? styles.met : styles.pending}>{requirement.met ? <Check size={16} /> : '○'}</span>
              <span><span className="sr-only">{requirement.met ? 'Met: ' : 'Required: '}</span>{requirement.text}</span>
            </li>)}</ul>
          </div>
          {error && <div role="alert" className={authStyles.error}><AlertCircle size={20} aria-hidden="true" /><p>{error}</p></div>}
          <button type="submit" disabled={loading} className={publicStyles.primaryButton}>{loading ? 'Updating password…' : 'Update password'}</button>
        </form>
      </section>}
    </main>
  </div>
}
