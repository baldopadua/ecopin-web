'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { SkeletonLine, SkeletonCard } from '@/components/ui/Skeleton'
import { getSystemSettings } from '@/lib/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL + '/api'

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const router = useRouter()

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
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [changingPassword, setChangingPassword] = useState(false)
  const [theme, setTheme] = useState('light')
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved) {
      setTheme(saved)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
    }
  }, [])

  const toggleTheme = (newTheme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('authToken')
    router.push('/auth')
  }

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const token = localStorage.getItem('authToken')
    if (!token) {
      router.push('/auth')
      return
    }

    try {
      const [response, settings] = await Promise.all([
        fetch(`${API_BASE_URL}/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
        getSystemSettings()
      ])

      if (!response.ok) {
        throw new Error('Failed to load profile')
      }

      const data = await response.json()
      setUser(data.profile)
      setFormData({
        full_name: data.profile.full_name || '',
        avatar_url: data.profile.avatar_url || '',
        email: data.profile.email || ''
      })
      if (settings) {
        setPasswordSettings(settings)
      }
    } catch (error) {
      console.error('Failed to load profile:', error)
      setError('Failed to load profile')
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

    const requirements = []
    requirements.push({ met: password.length >= minLength, text: `At least ${minLength} characters long` })

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
    setUploadingAvatar(true)
    setError(null)

    const token = localStorage.getItem('authToken')
    try {
      const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to remove avatar')
      }

      const data = await response.json()
      setUser(data.profile)
      setFormData(prev => ({ ...prev, avatar_url: '' }))
      setSuccess('Avatar removed successfully')
    } catch (error) {
      console.error('Failed to remove avatar:', error)
      setError('Failed to remove avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handlePasswordChange = async () => {
    const passwordValidation = validatePassword(passwordData.new_password)
    
    if (!passwordValidation.allMet) {
      setError('Password does not meet all requirements')
      return
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match')
      return
    }

    setChangingPassword(true)
    setError(null)
    setSuccess(null)

    const token = localStorage.getItem('authToken')
    try {
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Password change error response:', errorData)
        throw new Error(errorData.message || errorData.error || 'Failed to change password')
      }

      setSuccess('Password changed successfully')
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      })
      setShowPasswordForm(false)
    } catch (error) {
      console.error('Failed to change password:', error)
      setError(error.message || 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    const token = localStorage.getItem('authToken')
    try {
      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: formData.full_name,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Failed to update profile')
      }

      const data = await response.json()
      setUser(data.profile)
      setSuccess('Profile updated successfully')
    } catch (error) {
      console.error('Failed to update profile:', error)
      setError(error.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('JPEG, JPG, PNG, WEBP (Max 5MB)')
      e.target.value = ''
      return
    }

    setUploadingAvatar(true)
    setError(null)

    const token = localStorage.getItem('authToken')
    const formData = new FormData()
    formData.append('avatar', file)

    try {
      const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload avatar')
      }

      const data = await response.json()
      setUser(data.profile)
      setFormData(prev => ({ ...prev, avatar_url: data.profile.avatar_url }))
      setSuccess('Avatar uploaded successfully')
    } catch (error) {
      console.error('Failed to upload avatar:', error)
      setError('Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="space-y-6 max-w-3xl mx-auto">
          <SkeletonCard />
          <SkeletonCard />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Profile"
        subtitle="Manage your account settings"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Profile' }
        ]}
      />

      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Profile Card - Avatar + Name + Email */}
        <div className="bg-surface-elevated border-2 border-border rounded-none p-6 mt-8">
          <div className="flex items-center gap-6 mb-6">
            <div className="relative group flex-shrink-0">
              <label htmlFor="avatar-upload" className="block relative cursor-pointer">
                {formData.avatar_url ? (
                  <img
                    src={formData.avatar_url}
                    alt="Avatar"
                    className="w-20 h-20 rounded-none object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-none bg-accent-green flex items-center justify-center text-white font-bold text-2xl">
                    {formData.full_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-none">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-text-primary truncate">{formData.full_name || 'User'}</h2>
              <p className="text-sm text-text-muted truncate">{formData.email || 'No email provided'}</p>
              <input
                type="file"
                accept="image/jpeg, image/png, image/webp"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
                className="hidden"
                id="avatar-upload"
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              className="input"
              placeholder="Enter your full name"
            />
          </div>

          {error && (
            <div className="mt-4 p-3 bg-error/10 dark:bg-error/20 border border-error/20 dark:border-error/30 rounded-lg">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-success/10 dark:bg-success/20 border border-success/20 dark:border-success/30 rounded-lg">
              <p className="text-sm text-success">{success}</p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary shadow-none hover:shadow-none hover:translate-x-0 hover:translate-y-0"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Password Card */}
        <div className="bg-surface-elevated border-2 border-border rounded-none p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Password</h2>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="btn-secondary text-sm py-1.5 px-3"
            >
              {showPasswordForm ? 'Cancel' : 'Change Password'}
            </button>
          </div>

          {showPasswordForm && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  name="current_password"
                  value={passwordData.current_password}
                  onChange={handlePasswordInputChange}
                  className="input"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  name="new_password"
                  value={passwordData.new_password}
                  onChange={handlePasswordInputChange}
                  className="input"
                  placeholder="Enter new password"
                />
                {passwordData.new_password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-2">
                      {Array.from({ length: validatePassword(passwordData.new_password).requirements.length }, (_, i) => i + 1).map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded ${
                            i <= validatePassword(passwordData.new_password).metCount
                              ? validatePassword(passwordData.new_password).allMet
                                ? 'bg-success'
                                : 'bg-warning'
                              : 'bg-border'
                          }`}
                        />
                      ))}
                    </div>
                    <ul className="space-y-1">
                      {validatePassword(passwordData.new_password).requirements.map((req, idx) => (
                        <li key={idx} className="text-xs flex items-center gap-2">
                          <svg
                            className={`w-4 h-4 ${req.met ? 'text-success' : 'text-text-muted'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            {req.met ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            )}
                          </svg>
                          <span className={req.met ? 'text-success' : 'text-text-muted'}>{req.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirm_password"
                  value={passwordData.confirm_password}
                  onChange={handlePasswordInputChange}
                  className="input"
                  placeholder="Confirm new password"
                />
                {passwordData.confirm_password && (
                  <p className={`text-xs mt-1 ${passwordData.new_password === passwordData.confirm_password ? 'text-success' : 'text-error'}`}>
                    {passwordData.new_password === passwordData.confirm_password ? 'Passwords match' : 'Passwords do not match'}
                  </p>
                )}
              </div>
              <button
                onClick={handlePasswordChange}
                disabled={changingPassword || !validatePassword(passwordData.new_password).allMet || passwordData.new_password !== passwordData.confirm_password}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          )}

          {!showPasswordForm && (
            <p className="text-sm text-text-muted">Update your password to keep your account secure.</p>
          )}
        </div>

        {/* Appearance + Logout Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-elevated border-2 border-border rounded-none p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Dark Mode</h2>
                <p className="text-xs text-text-muted mt-1">Switch appearance</p>
              </div>
              <button
                onClick={() => toggleTheme(theme === 'dark' ? 'light' : 'dark')}
                className="relative w-12 h-6 rounded-none transition-colors duration-300 cursor-pointer"
                style={{ backgroundColor: theme === 'dark' ? 'var(--primary)' : '#9CA3AF' }}
              >
                <div
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-none shadow-none transition-transform duration-300"
                  style={{ transform: theme === 'dark' ? 'translateX(26px)' : 'translateX(2px)' }}
                />
              </button>
            </div>
          </div>

          <div className="bg-surface-elevated border-2 border-border rounded-none p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">Log Out</h2>
                <p className="text-xs text-text-muted mt-1">Sign out of your account</p>
              </div>
              <button
                onClick={() => setShowLogoutModal(true)}
                className="px-4 py-1.5 bg-error/10 text-error border-2 border-error/30 rounded-none hover:bg-error/20 font-medium text-sm transition-colors cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated border-2 border-border rounded-none shadow-none p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-text-primary mb-2">Log Out</h3>
            <p className="text-sm text-text-muted mb-6">Are you sure you want to log out of your account?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2 border-2 border-border rounded-none text-text-primary hover:bg-surface-elevated font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 bg-error text-white rounded-none hover:bg-error/80 font-medium transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
