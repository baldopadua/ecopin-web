'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL + '/api'

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const router = useRouter()

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
      const response = await fetch(`${API_BASE_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

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
    return <p className="text-center text-text-primary mt-8">Loading...</p>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Profile</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Avatar Section */}
        <div className="card p-4">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Avatar</h2>
          <div className="flex items-center gap-4">
            <div className="relative group">
              {formData.avatar_url ? (
                <img
                  src={formData.avatar_url}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-accent-green flex items-center justify-center text-white font-bold text-2xl">
                  {formData.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              {formData.avatar_url && (
                <button
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600 disabled:opacity-50"
                  title="Remove avatar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
                className="hidden"
                id="avatar-upload"
              />
              <label
                htmlFor="avatar-upload"
                className="btn-primary cursor-pointer inline-block text-sm"
              >
                {uploadingAvatar ? 'Uploading...' : 'Change Avatar'}
              </label>
              <p className="text-xs text-text-secondary mt-1">
                JPEG, JPG, PNG, WEBP (Max 5MB)
              </p>
            </div>
          </div>
        </div>

        {/* Email - Read Only */}
        <div className="card p-4 bg-surface/50 border-border/50">
          <h2 className="text-lg font-semibold text-text-secondary mb-4">Email</h2>
          <div className="p-3 bg-surface rounded-lg border border-border">
            <p className="text-text-muted text-sm">{formData.email || 'No email provided'}</p>
          </div>
        </div>

        {/* Profile Information */}
        <div className="card p-4 md:col-span-2">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Profile Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
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

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Password
              </label>
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="btn-secondary w-full"
              >
                {showPasswordForm ? 'Cancel' : 'Change Password'}
              </button>
            </div>
          </div>

          {showPasswordForm && (
            <div className="mt-4 p-4 bg-surface rounded-lg border border-border space-y-3">
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
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded ${
                            i <= validatePassword(passwordData.new_password).metCount
                              ? validatePassword(passwordData.new_password).allMet
                                ? 'bg-green-500'
                                : 'bg-yellow-500'
                              : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <ul className="space-y-1">
                      {validatePassword(passwordData.new_password).requirements.map((req, idx) => (
                        <li key={idx} className="text-xs flex items-center gap-2">
                          <svg
                            className={`w-4 h-4 ${req.met ? 'text-green-500' : 'text-gray-400'}`}
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
                          <span className={req.met ? 'text-green-600' : 'text-text-muted'}>{req.text}</span>
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
                  <p className={`text-xs mt-1 ${passwordData.new_password === passwordData.confirm_password ? 'text-green-600' : 'text-red-500'}`}>
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

          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
