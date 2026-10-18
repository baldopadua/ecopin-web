'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { AdminGuard } from '@/components/auth/RequireRole'
import Notification from '@/components/ui/Notification'
import { getSystemSettings, updateSystemSettings } from '@/lib/api'
import { SkeletonForm } from '@/components/ui/Skeleton'
import { reportDiagnostic } from '../../../../lib/diagnostics.mjs';

function SystemSettingsContent() {
  const router = useRouter()
  const [settings, setSettings] = useState({
    password_min_length: 8,
    password_require_uppercase: true,
    password_require_lowercase: true,
    password_require_numbers: true,
    password_require_special_chars: true,
    session_timeout_minutes: 60
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await getSystemSettings()
      setSettings(data)
    } catch (err) {
      reportDiagnostic('error', 'settings', 'Failed to load settings:', err)
      setNotification({ message: 'Failed to load system settings', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      await updateSystemSettings(settings)
      setNotification({ message: 'Settings saved successfully', type: 'success' })
      
    } catch (err) {
      reportDiagnostic('error', 'settings', 'Failed to save settings:', err)
      setNotification({ message: 'Failed to save settings', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="p-8">
        <PageHeader
          title="System Settings"
          subtitle="Loading..."
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Admin', href: '/dashboard/admin' },
            { label: 'Settings' }
          ]}
        />
        <div className="card">
          <SkeletonForm fields={6} />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <PageHeader
        title="System Settings"
        subtitle="Configure password requirements and security settings"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin', href: '/dashboard/admin' },
          { label: 'Settings' }
        ]}
      />

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="card">
        <h2 className="text-xl font-bold text-text-primary mb-6">Password Requirements</h2>
        
        <div className="space-y-6">
          {/* Minimum Password Length */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Minimum Password Length
            </label>
            <input
              type="number"
              min="6"
              max="32"
              value={settings.password_min_length}
              onChange={(e) => handleChange('password_min_length', parseInt(e.target.value))}
              className="w-full p-3 border border-border rounded-lg bg-surface-elevated text-text-primary"
            />
            <p className="text-xs text-text-muted mt-1">
              Minimum: 6 characters, Maximum: 32 characters
            </p>
          </div>

          {/* Password Requirements */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-text-primary">
              Password Complexity Requirements
            </label>
            
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="require_uppercase"
                checked={settings.password_require_uppercase}
                onChange={(e) => handleChange('password_require_uppercase', e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="require_uppercase" className="text-sm text-text-primary">
                Require uppercase letters (A-Z)
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="require_lowercase"
                checked={settings.password_require_lowercase}
                onChange={(e) => handleChange('password_require_lowercase', e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="require_lowercase" className="text-sm text-text-primary">
                Require lowercase letters (a-z)
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="require_numbers"
                checked={settings.password_require_numbers}
                onChange={(e) => handleChange('password_require_numbers', e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="require_numbers" className="text-sm text-text-primary">
                Require numbers (0-9)
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="require_special_chars"
                checked={settings.password_require_special_chars}
                onChange={(e) => handleChange('password_require_special_chars', e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="require_special_chars" className="text-sm text-text-primary">
                Require special characters (!@#$%^&*)
              </label>
            </div>
          </div>

          <hr className="border-border" />

          <h2 className="text-xl font-bold text-text-primary mb-6">Session Settings</h2>

          <div>
            <h3 className="text-sm font-medium text-text-primary mb-2">Web session lifetime</h3>
            <p className="text-text-primary">30 days after sign-in</p>
            <p className="text-xs text-text-muted mt-1">
              You are signed out when this period ends. Inactivity does not sign you out, and activity does not extend the deadline.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SystemSettings() {
  return (
    <AdminGuard>
      <SystemSettingsContent />
    </AdminGuard>
  )
}
