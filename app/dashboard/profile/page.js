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
    avatar_url: ''
  })

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
        avatar_url: data.profile.avatar_url || ''
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Avatar Section */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Avatar</h2>
          <div className="flex items-center gap-4">
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
                className="btn-primary cursor-pointer inline-block"
              >
                {uploadingAvatar ? 'Uploading...' : 'Change Avatar'}
              </label>
              <p className="text-xs text-text-secondary mt-2">
                JPEG, JPG, PNG, WEBP (Max 5MB)
              </p>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Profile Information</h2>

          <div className="space-y-4">
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

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-error">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
              </div>
            )}

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
