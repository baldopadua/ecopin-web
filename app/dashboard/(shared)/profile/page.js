'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { clearSessionMetadata, readSessionKey } from '@/lib/auth-token.mjs'
import { logout } from '@/lib/api/auth'
import { getSystemSettings } from '@/lib/api'
import { useUser } from '@/components/auth/UserContext'
import PageHeader from '@/components/layout/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import SecureImage from '@/components/ui/SecureImage'
import Notification from '@/components/ui/Notification'
import Dialog from '@/components/ui/Dialog'
import { SkeletonCard } from '@/components/ui/Skeleton'
import {
  Camera,
  Trash2,
  KeyRound,
  Shield,
  Check,
  X,
  LogOut,
  Eye,
  EyeOff,
  Monitor,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Mail,
  User as UserIcon,
  Building2
} from 'lucide-react'
import styles from './Profile.module.css'
import logoutStyles from './LogoutDialog.module.css'
import { reportDiagnostic } from '../../../../lib/diagnostics.mjs';
import { backendFetch as fetch } from '../../../../lib/backend-fetch.mjs';


const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL + '/api'

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [removingAvatar, setRemovingAvatar] = useState(false)
  const [notification, setNotification] = useState(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const cancelLogoutRef = useRef(null)
  const fileInputRef = useRef(null)
  const router = useRouter()
  const userCtx = useUser()

  const [passwordSettings, setPasswordSettings] = useState({
    password_min_length: 8,
    password_require_uppercase: true,
    password_require_lowercase: true,
    password_require_numbers: true,
    password_require_special_chars: true
  })

  const [formData, setFormData] = useState({
    full_name: '',
    avatar_url: '',
    email: ''
  })
  const [originalName, setOriginalName] = useState('')

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const [theme, setTheme] = useState('system')
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  useEffect(() => {
    if (showLogoutModal) cancelLogoutRef.current?.focus()
  }, [showLogoutModal])

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'system'
    setTheme(saved)
    if (saved === 'dark' || (saved === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = (newTheme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    if (newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      clearSessionMetadata()
      router.push('/auth')
    }
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const token = readSessionKey()
    if (!token) {
      router.push('/auth')
      return
    }

    try {
      setLoading(true)
      const [response, settings] = await Promise.all([
        fetch(`${API_BASE_URL}/profile`, {
          headers: {
          },
        }),
        getSystemSettings().catch(() => null)
      ])

      if (!response.ok) {
        throw new Error('Failed to load profile')
      }

      const data = await response.json()
      const profile = data.profile || {}
      setUser(profile)
      setFormData({
        full_name: profile.full_name || '',
        avatar_url: profile.avatar_url || '',
        email: profile.email || ''
      })
      setOriginalName(profile.full_name || '')
      if (settings) {
        setPasswordSettings(settings)
      }
    } catch (err) {
      reportDiagnostic('error', 'other', 'Failed to load profile:', err)
      setNotification({ message: 'Unable to load profile data. Please refresh.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))
  }

  const validatePassword = (password) => {
    const minLength = passwordSettings.password_min_length || 8

    const requirements = [
      { met: password.length >= minLength, text: `At least ${minLength} characters long` }
    ]

    if (passwordSettings.password_require_uppercase) {
      requirements.push({ met: /[A-Z]/.test(password), text: 'At least one uppercase letter' })
    }
    if (passwordSettings.password_require_lowercase) {
      requirements.push({ met: /[a-z]/.test(password), text: 'At least one lowercase letter' })
    }
    if (passwordSettings.password_require_numbers) {
      requirements.push({ met: /\d/.test(password), text: 'At least one number' })
    }
    if (passwordSettings.password_require_special_chars) {
      requirements.push({ met: /[!@#$%^&*(),.?":{}|<>]/.test(password), text: 'At least one special character' })
    }

    const allMet = requirements.every(r => r.met)
    const metCount = requirements.filter(r => r.met).length

    return { requirements, allMet, metCount }
  }

  const handleRemoveAvatar = async () => {
    setRemovingAvatar(true)
    setNotification(null)


    try {
      const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
        method: 'DELETE',
        headers: {
        },
      })

      if (!response.ok) {
        throw new Error('Failed to remove avatar photo')
      }

      const data = await response.json()
      setUser(data.profile)
      setFormData(prev => ({ ...prev, avatar_url: '' }))
      setNotification({ message: 'Avatar photo removed successfully', type: 'success' })
    } catch (err) {
      reportDiagnostic('error', 'other', 'Failed to remove avatar:', err)
      setNotification({ message: err.message || 'Failed to remove avatar', type: 'error' })
    } finally {
      setRemovingAvatar(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    const passwordValidation = validatePassword(passwordData.new_password)

    if (!passwordValidation.allMet) {
      setNotification({ message: 'Password does not meet all security requirements', type: 'warning' })
      return
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setNotification({ message: 'New password and confirmation do not match', type: 'warning' })
      return
    }

    setChangingPassword(true)
    setNotification(null)


    try {
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to change password')
      }

      setNotification({ message: 'Your password has been changed successfully.', type: 'success' })
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      })
      setShowPasswordForm(false)
    } catch (err) {
      reportDiagnostic('error', 'other', 'Failed to change password:', err)
      setNotification({ message: err.message || 'Failed to change password', type: 'error' })
    } finally {
      setChangingPassword(false)
    }
  }

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault()
    if (!formData.full_name.trim()) {
      setNotification({ message: 'Please provide a valid full name.', type: 'warning' })
      return
    }

    setSaving(true)
    setNotification(null)


    try {
      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: formData.full_name.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to update profile')
      }

      const data = await response.json()
      setUser(data.profile)
      setOriginalName(data.profile.full_name || '')
      setNotification({ message: 'Profile details updated successfully.', type: 'success' })
    } catch (err) {
      reportDiagnostic('error', 'other', 'Failed to update profile:', err)
      setNotification({ message: err.message || 'Failed to update profile', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
      setNotification({ message: 'Please select a JPEG, PNG, or WEBP image under 5MB.', type: 'warning' })
      e.target.value = ''
      return
    }

    setUploadingAvatar(true)
    setNotification(null)


    const uploadFormData = new FormData()
    uploadFormData.append('avatar', file)

    try {
      const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
        method: 'POST',
        headers: {
        },
        body: uploadFormData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to upload photo')
      }

      const data = await response.json()
      setUser(data.profile)
      setFormData(prev => ({ ...prev, avatar_url: data.profile.avatar_url }))
      setNotification({ message: 'Profile photo uploaded successfully.', type: 'success' })
    } catch (err) {
      reportDiagnostic('error', 'other', 'Failed to upload avatar:', err)
      setNotification({ message: err.message || 'Failed to upload avatar photo', type: 'error' })
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const isNameChanged = formData.full_name.trim() !== originalName.trim()
  const passwordValidation = validatePassword(passwordData.new_password)
  const isPasswordValid =
    passwordValidation.allMet &&
    passwordData.current_password &&
    passwordData.new_password === passwordData.confirm_password

  if (loading) {
    return (
      <div className={styles.page}>
        <PageHeader
          title="Profile"
          subtitle="Loading your account settings…"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Profile' }
          ]}
        />
        <div className={styles.content}>
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <PageHeader
        title="Profile & account"
        subtitle="Manage your identity, security credentials, and workspace preferences."
        breadcrumbs={[
          {
            label: 'Dashboard',
            href: userCtx?.role === 'officer'
              ? '/dashboard/officer'
              : userCtx?.role === 'field_crew'
                ? '/dashboard/field-crew'
                : '/dashboard'
          },
          { label: 'Profile' }
        ]}
      />

      <div className={styles.content}>
        {/* 1. Hero Identity Card */}
        <section className={styles.heroCard} aria-labelledby="identity-heading">
          <div className={styles.avatarWrapper}>
            {formData.avatar_url ? (
              <SecureImage
                src={formData.avatar_url}
                alt={`Profile photo of ${formData.full_name || 'user'}`}
                className={styles.avatarImg}
              />
            ) : (
              <div className={styles.avatarFallback} aria-hidden="true">
                {formData.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>

          <div className={styles.heroDetails}>
            <h2 id="identity-heading" className={styles.heroName}>
              {formData.full_name || 'EcoPin User'}
            </h2>
            <p className={styles.heroEmail}>
              <Mail size={16} aria-hidden="true" className="text-text-muted flex-shrink-0" />
              <span>{formData.email || 'No email associated'}</span>
            </p>
            <div className={styles.heroBadges}>
              <StatusBadge type="role" status={user?.role} size="medium" />
              <span className={styles.agencyBadge}>
                <Building2 size={14} aria-hidden="true" />
                Pasig City · SWMO
              </span>
            </div>

            <div className={styles.avatarActions}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg, image/png, image/webp"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
                className="sr-only"
                id="avatar-upload"
              />
              <label htmlFor="avatar-upload" className={styles.photoButton}>
                {uploadingAvatar ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Camera size={16} aria-hidden="true" />
                )}
                <span>{uploadingAvatar ? 'Uploading…' : 'Change photo'}</span>
              </label>

              {formData.avatar_url && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={removingAvatar || uploadingAvatar}
                  className={styles.removePhotoButton}
                >
                  {removingAvatar ? (
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 size={16} aria-hidden="true" />
                  )}
                  <span>{removingAvatar ? 'Removing…' : 'Remove photo'}</span>
                </button>
              )}
            </div>
            <p className="text-xs text-text-muted mt-2">
              Accepts JPG, PNG, or WEBP up to 5MB.
            </p>
          </div>
        </section>

        {/* 2. Personal Information Card */}
        <section className={styles.card} aria-labelledby="personal-info-heading">
          <div className={styles.cardHeader}>
            <div>
              <h2 id="personal-info-heading">Personal information</h2>
              <p className={styles.cardDescription}>
                Update your display name as it appears to team members across assignments and logs.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="full_name" className={styles.label}>
                  Full name
                </label>
                <input
                  id="full_name"
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="e.g. Maria Santos"
                  className={styles.input}
                  required
                />
                <p className={styles.helperText}>
                  Shown on dispatch operations, notes, and activity records.
                </p>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email address
                </label>
                <div className="relative flex items-center">
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    disabled
                    className={styles.input}
                    aria-describedby="email-note"
                  />
                  <Lock size={16} className="absolute right-3.5 text-text-muted pointer-events-none" aria-hidden="true" />
                </div>
                <p id="email-note" className={styles.helperText}>
                  Managed by your system administrator. Cannot be changed here.
                </p>
              </div>

              <div className={styles.formGroupFull}>
                <label htmlFor="role-display" className={styles.label}>
                  Assigned permissions role
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="role-display"
                    type="text"
                    value={user?.role ? user.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Citizen'}
                    disabled
                    className={`${styles.input} max-w-xs`}
                  />
                  <span className="text-xs text-text-secondary">
                    {user?.role === 'admin'
                      ? 'Full platform administration and system configuration.'
                      : user?.role === 'officer'
                        ? 'Command center oversight, task planning, and operational reviews.'
                        : user?.role === 'field_crew'
                          ? 'Field cleanup execution and verification updates.'
                          : 'Public exploration and reporting access.'}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.actionBar}>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, full_name: originalName }))}
                disabled={!isNameChanged || saving}
                className={styles.btnSecondary}
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={!isNameChanged || saving}
                className={styles.btnPrimary}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                    Saving changes…
                  </>
                ) : (
                  'Save changes'
                )}
              </button>
            </div>
          </form>
        </section>

        {/* 3. Security & Password Card */}
        <section className={styles.card} aria-labelledby="security-heading">
          <div className={styles.cardHeader}>
            <div>
              <h2 id="security-heading">Security & password</h2>
              <p className={styles.cardDescription}>
                Keep your account protected with a strong, policy-compliant password.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowPasswordForm(!showPasswordForm)
                setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
              }}
              className={styles.btnSecondary}
            >
              <KeyRound size={16} aria-hidden="true" />
              <span>{showPasswordForm ? 'Cancel' : 'Change password'}</span>
            </button>
          </div>

          {!showPasswordForm ? (
            <div className={styles.securitySummary}>
              <div className={styles.securitySummaryLeft}>
                <span className={styles.securityIcon}>
                  <Shield size={20} aria-hidden="true" />
                </span>
                <div>
                  <strong className="block text-sm font-semibold text-text-primary">
                    Authentication password is active
                  </strong>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Meets SWMO security requirements. Change your password periodically to keep access secure.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-5">
              <div className={styles.formGroup}>
                <label htmlFor="current_password" className={styles.label}>
                  Current password
                </label>
                <div className={styles.passwordWrapper}>
                  <input
                    id="current_password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    name="current_password"
                    value={passwordData.current_password}
                    onChange={handlePasswordInputChange}
                    placeholder="Enter current password"
                    className={styles.input}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className={styles.passwordToggle}
                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  >
                    {showCurrentPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="new_password" className={styles.label}>
                  New password
                </label>
                <div className={styles.passwordWrapper}>
                  <input
                    id="new_password"
                    type={showNewPassword ? 'text' : 'password'}
                    name="new_password"
                    value={passwordData.new_password}
                    onChange={handlePasswordInputChange}
                    placeholder="Enter new password"
                    className={styles.input}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className={styles.passwordToggle}
                    aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  >
                    {showNewPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>

                {passwordData.new_password && (
                  <div className={styles.meterContainer}>
                    <div className={styles.meterTrack} aria-hidden="true">
                      {Array.from({ length: passwordValidation.requirements.length }, (_, i) => i + 1).map((i) => (
                        <div
                          key={i}
                          className={styles.meterSegment}
                          style={{
                            backgroundColor:
                              i <= passwordValidation.metCount
                                ? passwordValidation.allMet
                                  ? 'var(--success)'
                                  : 'var(--warning)'
                                : 'var(--border)'
                          }}
                        />
                      ))}
                    </div>
                    <ul className={styles.requirementsList} aria-label="Password requirements">
                      {passwordValidation.requirements.map((req, idx) => (
                        <li key={idx} className={`${styles.reqItem} ${req.met ? styles.reqItemMet : ''}`}>
                          {req.met ? (
                            <CheckCircle2 size={14} aria-hidden="true" className="text-success flex-shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border border-border flex-shrink-0" aria-hidden="true" />
                          )}
                          <span>{req.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="confirm_password" className={styles.label}>
                  Confirm new password
                </label>
                <div className={styles.passwordWrapper}>
                  <input
                    id="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirm_password"
                    value={passwordData.confirm_password}
                    onChange={handlePasswordInputChange}
                    placeholder="Confirm new password"
                    className={styles.input}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={styles.passwordToggle}
                    aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
                {passwordData.confirm_password && (
                  <p
                    className="text-xs mt-1.5 flex items-center gap-1.5"
                    style={{
                      color: passwordData.new_password === passwordData.confirm_password
                        ? 'var(--success)'
                        : 'var(--error)'
                    }}
                  >
                    {passwordData.new_password === passwordData.confirm_password ? (
                      <>
                        <CheckCircle2 size={14} aria-hidden="true" />
                        <span>Passwords match</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={14} aria-hidden="true" />
                        <span>Passwords do not match</span>
                      </>
                    )}
                  </p>
                )}
              </div>

              <div className={styles.actionBar}>
                <button
                  type="button"
                  onClick={() => setShowPasswordForm(false)}
                  className={styles.btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPassword || !isPasswordValid}
                  className={styles.btnPrimary}
                >
                  {changingPassword ? (
                    <>
                      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                      Updating password…
                    </>
                  ) : (
                    'Update password'
                  )}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* 4. Appearance & Theme Card */}
        <section className={styles.card} aria-labelledby="appearance-heading">
          <div className={styles.cardHeader}>
            <div>
              <h2 id="appearance-heading">Appearance & theme</h2>
              <p className={styles.cardDescription}>
                Select how the EcoPin workspace appears on this device. Preference is saved automatically.
              </p>
            </div>
          </div>

          <div className={styles.themeGrid} role="radiogroup" aria-label="Theme preference">
            <button
              type="button"
              role="radio"
              aria-checked={theme === 'system'}
              onClick={() => toggleTheme('system')}
              className={`${styles.themeOption} ${theme === 'system' ? styles.themeOptionActive : ''}`}
            >
              <span className={styles.themeIconWrapper}>
                <Monitor size={20} aria-hidden="true" />
              </span>
              <span className={styles.themeTitle}>
                <span>System default</span>
                {theme === 'system' && <Check size={16} aria-hidden="true" className="text-workspace-link" />}
              </span>
              <span className={styles.themeDesc}>
                Automatically matches your operating system setting.
              </span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={theme === 'light'}
              onClick={() => toggleTheme('light')}
              className={`${styles.themeOption} ${theme === 'light' ? styles.themeOptionActive : ''}`}
            >
              <span className={styles.themeIconWrapper}>
                <Sun size={20} aria-hidden="true" />
              </span>
              <span className={styles.themeTitle}>
                <span>Light mode</span>
                {theme === 'light' && <Check size={16} aria-hidden="true" className="text-workspace-link" />}
              </span>
              <span className={styles.themeDesc}>
                Clean daytime theme with crisp contrast and white surfaces.
              </span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={theme === 'dark'}
              onClick={() => toggleTheme('dark')}
              className={`${styles.themeOption} ${theme === 'dark' ? styles.themeOptionActive : ''}`}
            >
              <span className={styles.themeIconWrapper}>
                <Moon size={20} aria-hidden="true" />
              </span>
              <span className={styles.themeTitle}>
                <span>Dark mode</span>
                {theme === 'dark' && <Check size={16} aria-hidden="true" className="text-workspace-link" />}
              </span>
              <span className={styles.themeDesc}>
                Neutral charcoal dark theme designed for low-light environments.
              </span>
            </button>
          </div>
        </section>

        {/* 5. Session Management (Danger Zone) */}
        <section className={styles.dangerCard} aria-labelledby="session-heading">
          <div className={styles.dangerHeader}>
            <div>
              <h2 id="session-heading" className="text-lg font-semibold text-error tracking-tight">
                Session management
              </h2>
              <p className={styles.dangerNotice}>
                Signing out will clear your authorization token on this device. You will need to sign in again to access the dashboard.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className={styles.logoutButton}
            >
              <LogOut size={16} aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </section>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <Dialog
          open={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          dismissible={!loggingOut}
          labelledBy="logout-title"
        >
          <div className={logoutStyles.panel}>
            <div className={logoutStyles.header}>
              <span className={logoutStyles.icon}>
                <LogOut size={24} aria-hidden="true" />
              </span>
              <button
                type="button"
                aria-label="Close logout confirmation"
                onClick={() => setShowLogoutModal(false)}
                disabled={loggingOut}
                className={logoutStyles.close}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <h2 id="logout-title">Sign out of EcoPin?</h2>
            <p>You will need to enter your credentials again to access your account.</p>
            <div className={logoutStyles.actions}>
              <button
                ref={cancelLogoutRef}
                type="button"
                disabled={loggingOut}
                onClick={() => setShowLogoutModal(false)}
                className={logoutStyles.cancel}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogout}
                className={logoutStyles.confirm}
              >
                {loggingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  )
}
