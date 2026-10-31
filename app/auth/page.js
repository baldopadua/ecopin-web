'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, Eye, EyeOff, Moon, Sun, ShieldCheck, Smartphone, AlertCircle } from 'lucide-react'
import { readSessionKey, subscribeSession, loadSessionMetadata } from '@/lib/auth-token.mjs'
import { login, logout } from '@/lib/api/auth'
import AuthPhotos from './AuthPhotos'
import motion from '@/components/ui/PublicMotion.module.css'
import usePublicTheme from '@/components/landing/usePublicTheme'
import publicStyles from '@/components/landing/LandingPage.module.css'
import styles from './Auth.module.css'

export default function AuthPage() {
  const router = useRouter()
  const token = useSyncExternalStore(subscribeSession, readSessionKey, () => null)
  const { isDark, toggleTheme } = usePublicTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Skip while a sign-in is in flight so a rejected mobile-only role is logged out before any redirect.
  useEffect(() => { if (token && !loading) router.replace('/dashboard') }, [token, loading, router])
  useEffect(() => { void loadSessionMetadata() }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const data = await login(email.trim(), password)
      if (data.state === 'temporary') {
        router.push('/force-change-password')
        return
      }
      const role = data.user?.role || 'citizen'
      const mobileOnlyMessage = role === 'citizen'
        ? 'This sign-in is for authorized personnel. Citizens can report through the EcoPin Android app.'
        : role === 'field_crew'
          ? 'Field crews sign in through the EcoPin mobile app. Web access is restricted.'
          : null
      if (mobileOnlyMessage) {
        // login() already stored the session; clear it before the redirect effect sees the token.
        await logout().catch(() => {})
        throw new Error(mobileOnlyMessage)
      }
      router.replace('/dashboard')
    } catch (err) {
      setError(err.message || 'We couldn’t sign you in. Please try again.')
    } finally { setLoading(false) }
  }

  return <div className={`${publicStyles.page} ${styles.page}`}>
    <a href="#sign-in" className={publicStyles.skipLink}>Skip to sign in</a>
    <div className={styles.topBar}><Link href="/" className={styles.back}><ArrowLeft size={18} /> Back to EcoPin</Link><button onClick={toggleTheme} className={styles.theme} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>{isDark ? <Sun size={20} /> : <Moon size={20} />}</button></div>
    <main id="sign-in" className={`${styles.main} ${motion.enter}`}>
      <section className={styles.formSection} aria-labelledby="login-heading">
        <span className={publicStyles.sectionLabel}><ShieldCheck size={16} /> Authorized personnel</span>
        <h1 id="login-heading">Welcome back.</h1>
        <p className={styles.description}>Sign in to your EcoPin workspace to help keep Pasig moving forward.</p>
        {token ? <p role="status">Opening your account…</p> : <form onSubmit={handleSubmit} className={styles.form} aria-busy={loading}>
          <div><label htmlFor="login-email">Email address</label><input id="login-email" name="email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@pasigcity.gov.ph" disabled={loading} /></div>
          <div><label htmlFor="login-password">Password</label><div className={styles.password}><input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" disabled={loading} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div></div>
          <Link href="/forgot-password" className={styles.forgotLink}>Forgot your password?</Link>
          {error && <div role="alert" className={styles.error}><AlertCircle size={20} /><p>{error}</p></div>}
          <button type="submit" disabled={loading} className={publicStyles.primaryButton}>{loading ? 'Signing in…' : 'Sign in'}{!loading && <ArrowRight size={18} />}</button>
        </form>}
        <div className={styles.citizenNote}><Smartphone size={22} /><div><h2>Here to report a concern?</h2><p>Use the EcoPin Android app to send and track your reports.</p><Link href="/#mobile-app">Get the app <ArrowRight size={16} /></Link></div></div>
        <p className={styles.help}>Need access to a workspace? Contact your EcoPin administrator.</p>
        <p className={styles.authPhotoCredit}>
          Photography courtesy of{' '}
          <a href="https://www.facebook.com/share/p/19hk6BA5W8/" target="_blank" rel="noopener noreferrer">Pasig Tayo</a>{' '}
          (<a href="https://www.facebook.com/jonah.talagtag.77" target="_blank" rel="noopener noreferrer">Jonah Talagtag</a>)
        </p>
      </section>
      <section className={styles.story} aria-label="Pasig field crews">
        <AuthPhotos />
        <Link href="/explore" className={publicStyles.textButton}>Explore public reports <ArrowRight size={18} /></Link>
      </section>
    </main>
  </div>
}
