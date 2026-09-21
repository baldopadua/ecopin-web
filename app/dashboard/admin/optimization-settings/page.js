'use client'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import Notification from '@/components/ui/Notification'
import { SkeletonForm } from '@/components/ui/Skeleton'
import {
  getOptimizationSettings,
  updateOptimizationSettings,
  getFieldCrews,
  updateFieldCrew,
} from '@/lib/api/optimization'

export default function OptimizationSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null) // null | 'depot' | 'crew-<id>'
  const [notification, setNotification] = useState(null)

  // Depot settings
  const [depot, setDepot] = useState({
    name: 'SWMO Depot (PLP Center)',
    latitude: 14.561433,
    longitude: 121.075636,
  })

  // Crew settings
  const [crews, setCrews] = useState([])

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    try {
      setLoading(true)
      const [settingsData, crewsData] = await Promise.all([
        getOptimizationSettings(),
        getFieldCrews(),
      ])

      // Parse settings
      const depotSetting = settingsData.find(s => s.key === 'swmo_depot')
      if (depotSetting?.value) {
        setDepot(depotSetting.value)
      }

      setCrews(crewsData || [])
    } catch (err) {
      console.error('Failed to load optimization settings:', err)
      setNotification({ message: 'Failed to load settings', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDepot = async () => {
    // Validate
    if (!depot.name || depot.name.trim().length === 0) {
      setNotification({ message: 'Depot name is required', type: 'error' })
      return
    }
    if (isNaN(depot.latitude) || depot.latitude < -90 || depot.latitude > 90) {
      setNotification({ message: 'Latitude must be between -90 and 90', type: 'error' })
      return
    }
    if (isNaN(depot.longitude) || depot.longitude < -180 || depot.longitude > 180) {
      setNotification({ message: 'Longitude must be between -180 and 180', type: 'error' })
      return
    }

    try {
      setSaving('depot')
      await updateOptimizationSettings('swmo_depot', {
        name: depot.name.trim(),
        latitude: parseFloat(depot.latitude),
        longitude: parseFloat(depot.longitude),
      })
      setNotification({ message: 'Depot settings saved successfully', type: 'success' })
    } catch (err) {
      setNotification({ message: err.message || 'Failed to save depot settings', type: 'error' })
    } finally {
      setSaving(null)
    }
  }

  const handleSaveCrew = async (crew) => {
    // Validate
    if (!crew.shift_start || !crew.shift_end) {
      setNotification({ message: 'Shift start and end times are required', type: 'error' })
      return
    }
    if (crew.shift_end <= crew.shift_start) {
      setNotification({ message: 'Shift end must be after shift start', type: 'error' })
      return
    }
    if (!crew.max_tasks_per_shift || crew.max_tasks_per_shift < 1 || crew.max_tasks_per_shift > 50) {
      setNotification({ message: 'Max tasks must be between 1 and 50', type: 'error' })
      return
    }

    try {
      setSaving(`crew-${crew.id}`)
      await updateFieldCrew(crew.id, {
        shift_start: crew.shift_start,
        shift_end: crew.shift_end,
        max_tasks_per_shift: parseInt(crew.max_tasks_per_shift),
      })
      setNotification({ message: `${crew.name} settings saved successfully`, type: 'success' })
    } catch (err) {
      setNotification({ message: err.message || 'Failed to save crew settings', type: 'error' })
    } finally {
      setSaving(null)
    }
  }

  const handleDepotChange = (field, value) => {
    setDepot(prev => ({ ...prev, [field]: value }))
  }

  const handleCrewChange = (crewId, field, value) => {
    setCrews(prev => prev.map(c => c.id === crewId ? { ...c, [field]: value } : c))
  }

  if (loading) {
    return (
      <div className="p-8">
        <PageHeader
          title="Optimization"
          titleAccent="Settings"
          subtitle="Loading..."
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Admin', href: '/dashboard/admin' },
            { label: 'Optimization Settings' }
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
        title="Optimization"
        titleAccent="Settings"
        subtitle="Configure depot location, crew schedules, and operational parameters"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin', href: '/dashboard/admin' },
          { label: 'Optimization Settings' }
        ]}
      />

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* SWMO Depot Settings */}
      <div className="card border-2 border-border mb-6">
        <h2 className="text-xl font-bold text-text-primary mb-2">🏢 SWMO Depot</h2>
        <p className="text-sm text-text-muted mb-6">
          The depot is the start and end point for all crew routes. Changing this affects future optimization runs.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Depot Name
            </label>
            <input
              type="text"
              maxLength={100}
              value={depot.name}
              onChange={(e) => handleDepotChange('name', e.target.value)}
              className="w-full p-3 border-2 border-border bg-surface-elevated text-text-primary focus:border-[#ccff00] focus:outline-none transition-colors"
              placeholder="e.g., SWMO Depot (PLP Center)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Latitude
              </label>
              <input
                type="number"
                step="0.000001"
                min="-90"
                max="90"
                value={depot.latitude}
                onChange={(e) => handleDepotChange('latitude', e.target.value)}
                className="w-full p-3 border-2 border-border bg-surface-elevated text-text-primary font-mono focus:border-[#ccff00] focus:outline-none transition-colors"
              />
              <p className="text-xs text-text-muted mt-1">Range: -90 to 90</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Longitude
              </label>
              <input
                type="number"
                step="0.000001"
                min="-180"
                max="180"
                value={depot.longitude}
                onChange={(e) => handleDepotChange('longitude', e.target.value)}
                className="w-full p-3 border-2 border-border bg-surface-elevated text-text-primary font-mono focus:border-[#ccff00] focus:outline-none transition-colors"
              />
              <p className="text-xs text-text-muted mt-1">Range: -180 to 180</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveDepot}
            disabled={saving === 'depot'}
            className="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving === 'depot' ? 'Saving...' : 'Save Depot Settings'}
          </button>
        </div>
      </div>

      {/* Crew Settings */}
      <div className="card border-2 border-border">
        <h2 className="text-xl font-bold text-text-primary mb-2">👷 Field Crew Configuration</h2>
        <p className="text-sm text-text-muted mb-6">
          Configure shift schedules and task limits for each field crew. Changes apply to future optimization runs.
        </p>

        {crews.length === 0 ? (
          <p className="text-text-muted text-sm">No field crews found. Run migration 008 to create crews.</p>
        ) : (
          <div className="space-y-6">
            {crews.map((crew) => (
              <div key={crew.id} className="border-2 border-border p-4 bg-surface-elevated">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-text-primary text-lg">{crew.name}</h3>
                  <span className={`text-xs px-2 py-1 border font-mono uppercase tracking-wider ${
                    crew.availability_status === 'available'
                      ? 'bg-success/20 text-success border-success/30'
                      : crew.availability_status === 'on_route'
                      ? 'bg-warning/20 text-warning border-warning/30'
                      : 'bg-text-muted/20 text-text-muted border-text-muted/30'
                  }`}>
                    {crew.availability_status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Shift Start
                    </label>
                    <input
                      type="time"
                      value={crew.shift_start || '08:00'}
                      onChange={(e) => handleCrewChange(crew.id, 'shift_start', e.target.value)}
                      className="w-full p-3 border-2 border-border bg-surface-elevated text-text-primary font-mono focus:border-[#ccff00] focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Shift End
                    </label>
                    <input
                      type="time"
                      value={crew.shift_end || '17:00'}
                      onChange={(e) => handleCrewChange(crew.id, 'shift_end', e.target.value)}
                      className="w-full p-3 border-2 border-border bg-surface-elevated text-text-primary font-mono focus:border-[#ccff00] focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">
                      Max Tasks per Shift
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={crew.max_tasks_per_shift || 10}
                      onChange={(e) => handleCrewChange(crew.id, 'max_tasks_per_shift', e.target.value)}
                      className="w-full p-3 border-2 border-border bg-surface-elevated text-text-primary font-mono focus:border-[#ccff00] focus:outline-none transition-colors"
                    />
                    <p className="text-xs text-text-muted mt-1">Range: 1–50</p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => handleSaveCrew(crew)}
                    disabled={saving === `crew-${crew.id}`}
                    className="btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving === `crew-${crew.id}` ? 'Saving...' : `Save ${crew.name}`}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
