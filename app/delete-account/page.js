'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldAlert,
  Trash2,
  Database
} from 'lucide-react'
import LandingNavigation from '@/components/landing/LandingNavigation'
import usePublicTheme from '@/components/landing/usePublicTheme'
import publicStyles from '@/components/landing/LandingPage.module.css'
import motion from '@/components/ui/PublicMotion.module.css'
import styles from './DeleteAccount.module.css'

export default function DeleteAccountPage() {
  const { isDark, toggleTheme } = usePublicTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [deleted, setDeleted] = useState(false)

  async function handleDelete(event) {
    event.preventDefault()
    if (!acknowledged || loading) return

    const confirmed = window.confirm(
      'Are you sure you want to permanently delete your EcoPin citizen account? This action cannot be undone.'
    )
    if (!confirmed) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/backend/api/auth/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'Failed to delete account. Please verify your credentials and try again.')
      }

      setDeleted(true)
    } catch (err) {
      setError(err.message || 'An unexpected error occurred while deleting your account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={publicStyles.page}>
      <a href="#delete-section" className={publicStyles.skipLink}>Skip to account deletion</a>
      <LandingNavigation isDark={isDark} toggleTheme={toggleTheme} activePage="Delete Account" />

      <main id="delete-section" className={`${styles.main} ${motion.enter}`}>
        {deleted ? (
          <section className={styles.successCard} role="status" aria-live="polite">
            <CheckCircle2 size={48} className={styles.successIcon} />
            <h2>Account Successfully Deleted</h2>
            <p>
              Your EcoPin account credentials, personal profile, and notification history have been permanently deleted from our systems.
            </p>
            <p>
              In accordance with Google Play User Data policies and Pasig City environmental guidelines, your submitted waste reports have been preserved without personal identifying information to maintain public cleanup statistics.
            </p>
            <Link href="/" className={publicStyles.primaryButton}>
              Return to Home <ArrowRight size={18} />
            </Link>
          </section>
        ) : (
          <>
            <div className={styles.hero}>
              <div className={styles.heroCopy}>
                <span className={publicStyles.sectionLabel}>
                  <ShieldAlert size={16} /> Google Play Policy Compliance
                </span>
                <h1>Citizen Account Deletion & Data Privacy</h1>
                <p>
                  EcoPin gives you full ownership over your personal data. You can delete your citizen account at any time either through the mobile app or using this web deletion portal.
                </p>

                <div className={styles.disclosureCards}>
                  <div className={styles.disclosureCard}>
                    <Trash2 size={24} className={styles.deleteIcon} />
                    <div className={styles.disclosureContent}>
                      <h3>What is permanently erased</h3>
                      <p>
                        Your sign-in credentials (email, password hash), profile details (name, avatar, consent records), active login tokens, notifications, and verification records are permanently scrubbed from our servers.
                      </p>
                    </div>
                  </div>

                  <div className={styles.disclosureCard}>
                    <Database size={24} className={styles.preserveIcon} />
                    <div className={styles.disclosureContent}>
                      <h3>What is retained anonymously</h3>
                      <p>
                        Submitted environmental waste reports remain in the municipal dataset to preserve public cleanup history and city waste management statistics. All personal links are permanently removed (user ID unlinked/anonymized).
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.formCard}>
                <h2>Request Account Deletion</h2>
                <p>Verify your credentials to immediately and permanently delete your account.</p>

                <form onSubmit={handleDelete} className={styles.form}>
                  <div className={styles.field}>
                    <label htmlFor="delete-email">Account Email Address</label>
                    <input
                      id="delete-email"
                      type="email"
                      required
                      autoComplete="username"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="citizen@example.com"
                      disabled={loading}
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="delete-password">Current Password</label>
                    <div className={styles.passwordWrapper}>
                      <input
                        id="delete-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className={styles.eyeButton}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={e => setAcknowledged(e.target.checked)}
                      disabled={loading}
                      required
                    />
                    <span>
                      I understand that deleting my account is permanent and irreversible. My login and personal profile will be deleted immediately, while my past waste reports will be preserved anonymously for public records.
                    </span>
                  </label>

                  {error && (
                    <div role="alert" className={styles.errorMessage}>
                      <AlertCircle size={20} />
                      <p>{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    className={styles.deleteButton}
                    disabled={!acknowledged || !email || !password || loading}
                  >
                    <Trash2 size={18} />
                    {loading ? 'Deleting account…' : 'Permanently Delete Account'}
                  </button>
                </form>
              </div>
            </div>

            <footer className={styles.footer}>
              <Link href="/">
                <ArrowLeft size={16} /> Back to EcoPin Home
              </Link>
              <span>EcoPin · Pasig Solid Waste Management Platform</span>
              <Link href="/explore">
                Explore Public Reports <ArrowRight size={16} />
              </Link>
            </footer>
          </>
        )}
      </main>
    </div>
  )
}
