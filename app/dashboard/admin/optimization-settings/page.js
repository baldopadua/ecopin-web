'use client'
import FleetCapabilities from '@/components/optimization/FleetCapabilities'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import PageHeader from '@/components/layout/PageHeader'
import { AdminGuard } from '@/components/auth/RequireRole'
import Notification from '@/components/ui/Notification'
import { SkeletonForm } from '@/components/ui/Skeleton'
import {
  getOptimizationSettings,
  updateOptimizationSettings,
  getFieldCrews,
  updateFieldCrew,
  createFieldCrew,
} from '@/lib/api/optimization'
import { reportDiagnostic } from '../../../../lib/diagnostics.mjs';
import styles from './OptimizationSettings.module.css'

const LocationPickerMap = dynamic(
  () => import('@/components/map/LocationPickerMap'),
  { ssr: false }
)

function OptimizationSettingsContent() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null) // null | 'depot' | 'crew-<id>'
  const [isEditingDepot, setIsEditingDepot] = useState(false)
  const [notification, setNotification] = useState(null)
  const [activeTab, setActiveTab] = useState('depot') // 'depot' | 'crew'

  // Depot settings
  const [depot, setDepot] = useState({
    name: 'SWMO Depot (PLP Center)',
    latitude: 14.561433,
    longitude: 121.075636,
  })

  // Crew settings
  const [crews, setCrews] = useState([])
  const [showAddCrew, setShowAddCrew] = useState(false)
  const [newCrew, setNewCrew] = useState({
    name: '',
    shift_start: '08:00',
    shift_end: '17:00',
    max_tasks_per_shift: 10,
  })

  const fleetPayload = crew => ({
    supports_standard: crew.supports_standard ?? true,
    supports_sweeper: crew.supports_sweeper ?? false,
    speed_factor: Number(crew.speed_factor ?? 1),
    service_time_factor: Number(crew.service_time_factor ?? 1),
    vehicle_type: crew.vehicle_type ?? 'compactor',
    hazmat_certified: crew.hazmat_certified ?? false,
    max_volume_m3: crew.max_volume_m3 ?? null,
    max_weight_kg: crew.max_weight_kg ?? null,
    starting_volume_m3: crew.starting_volume_m3 ?? null,
    starting_weight_kg: crew.starting_weight_kg ?? null,
    load_measured_at: crew.load_measured_at ?? null,
  })

  const validateFleet = crew => {
    for (const [load, maximum, label] of [
      ['starting_volume_m3', 'max_volume_m3', 'volume'],
      ['starting_weight_kg', 'max_weight_kg', 'weight'],
    ]) {
      if (crew[maximum] != null && crew[load] != null && Number(crew[load]) > Number(crew[maximum])) {
        setNotification({ message: `Starting ${label} exceeds vehicle capacity`, type: 'error' })
        return false
      }
    }
    if ((crew.starting_volume_m3 != null || crew.starting_weight_kg != null) && !crew.load_measured_at) {
      setNotification({ message: 'Enter when the starting load was measured', type: 'error' })
      return false
    }
    return true
  }

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
      reportDiagnostic('error', 'settings', 'Failed to load optimization settings:', err)
      setNotification({ message: 'Failed to load settings', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => { void loadAll() })
  }, [])

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
      setIsEditingDepot(false)
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
    if (!validateFleet(crew)) return

    try {
      setSaving(`crew-${crew.id}`)
      await updateFieldCrew(crew.id, {
        shift_start: crew.shift_start,
        shift_end: crew.shift_end,
        max_tasks_per_shift: parseInt(crew.max_tasks_per_shift),
        ...fleetPayload(crew),
      })
      setNotification({ message: `${crew.name} settings saved successfully`, type: 'success' })
    } catch (err) {
      setNotification({ message: err.message || 'Failed to save crew settings', type: 'error' })
    } finally {
      setSaving(null)
    }
  }

  const handleCreateCrew = async () => {
    if (!newCrew.name.trim()) {
      setNotification({ message: 'Crew name is required', type: 'error' })
      return
    }
    if (!newCrew.shift_start || !newCrew.shift_end) {
      setNotification({ message: 'Shift start and end times are required', type: 'error' })
      return
    }
    if (newCrew.shift_end <= newCrew.shift_start) {
      setNotification({ message: 'Shift end must be after shift start', type: 'error' })
      return
    }
    if (!newCrew.max_tasks_per_shift || newCrew.max_tasks_per_shift < 1 || newCrew.max_tasks_per_shift > 50) {
      setNotification({ message: 'Max tasks must be between 1 and 50', type: 'error' })
      return
    }
    if (!validateFleet(newCrew)) return

    try {
      setSaving('new-crew')
      const created = await createFieldCrew({ ...newCrew, ...fleetPayload(newCrew) })
      setCrews(prev => [...prev, created])
      setShowAddCrew(false)
      setNewCrew({ name: '', shift_start: '08:00', shift_end: '17:00', max_tasks_per_shift: 10 })
      setNotification({ message: 'Crew created successfully', type: 'success' })
    } catch (err) {
      setNotification({ message: err.message || 'Failed to create crew', type: 'error' })
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
      <div className={styles.page}>
        <PageHeader
          title="Optimization settings"
          subtitle="Configure depot location, crew schedules, and operational parameters."
          breadcrumbs={[
            { label: 'Admin', href: '/dashboard/admin' },
            { label: 'Optimization settings' }
          ]}
          className={styles.pageHeader}
        />
        <div className={styles.panel}>
          <div className={styles.panelBody}>
            <SkeletonForm fields={6} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Optimization settings"
        subtitle="Configure depot location, crew schedules, and operational parameters."
        breadcrumbs={[
          { label: 'Admin', href: '/dashboard/admin' },
          { label: 'Optimization settings' }
        ]}
        className={styles.pageHeader}
      />

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Tabs Switcher */}
      <div className={styles.tabList} role="tablist" aria-label="Optimization settings sections">
        <button
          type="button"
          role="tab"
          id="tab-depot"
          aria-selected={activeTab === 'depot'}
          aria-controls="panel-depot"
          onClick={() => setActiveTab('depot')}
          className={styles.tabButton}
        >
          <span>SWMO Depot Location</span>
        </button>
        <button
          type="button"
          role="tab"
          id="tab-crew"
          aria-selected={activeTab === 'crew'}
          aria-controls="panel-crew"
          onClick={() => setActiveTab('crew')}
          className={styles.tabButton}
        >
          <span>Field Crew Configuration</span>
          <span className={styles.tabBadge}>{crews.length}</span>
        </button>
      </div>

      <div className={styles.tabContent}>
        {/* Tab 1: SWMO Depot Settings */}
        {activeTab === 'depot' && (
          <section
            id="panel-depot"
            role="tabpanel"
            aria-labelledby="tab-depot"
            className={styles.panel}
          >
            <div className={styles.panelHeader}>
              <div>
                <h2>SWMO Depot</h2>
                <p>The depot is the origin and destination for all cleanup routes.</p>
              </div>
            </div>

            <div className={styles.panelBody}>
              <div className={styles.depotLayout}>
                <div className={styles.mapWrapper}>
                  <LocationPickerMap
                    position={{ lat: depot.latitude, lng: depot.longitude }}
                    readOnly={!isEditingDepot}
                    onChange={(latlng) => {
                      setDepot(prev => ({
                        ...prev,
                        latitude: latlng.lat,
                        longitude: latlng.lng
                      }))
                    }}
                  />
                </div>

                <div className={styles.depotMeta}>
                  <div className={styles.field}>
                    <label htmlFor="depot-name-input">Depot name</label>
                    <input
                      id="depot-name-input"
                      type="text"
                      maxLength={100}
                      value={depot.name}
                      onChange={(e) => handleDepotChange('name', e.target.value)}
                      disabled={!isEditingDepot}
                      className={styles.input}
                      placeholder="e.g., SWMO Depot (PLP Center)"
                    />
                  </div>

                  <div className={styles.field}>
                    <label>Coordinates</label>
                    <div className={styles.coords}>
                      <span>Lat: {depot.latitude?.toFixed(6) || '—'}</span>
                      <span>Lng: {depot.longitude?.toFixed(6) || '—'}</span>
                    </div>
                  </div>

                  <div className={styles.actionRow}>
                    {!isEditingDepot ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingDepot(true)}
                        className={styles.btnSecondary}
                      >
                        Change location
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingDepot(false)
                            loadAll()
                          }}
                          disabled={saving === 'depot'}
                          className={styles.btnSecondary}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveDepot}
                          disabled={saving === 'depot'}
                          className={styles.btnPrimary}
                        >
                          {saving === 'depot' ? 'Saving…' : 'Save depot settings'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tab 2: Crew Settings */}
        {activeTab === 'crew' && (
          <section
            id="panel-crew"
            role="tabpanel"
            aria-labelledby="tab-crew"
            className={styles.panel}
          >
            <div className={styles.panelHeader}>
              <div>
                <h2>Field Crew Configuration</h2>
                <p>Configure shift schedules and limits for each field crew.</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddCrew(!showAddCrew)}
                className={styles.btnSecondary}
              >
                {showAddCrew ? 'Cancel' : '+ Add crew'}
              </button>
            </div>

            <div className={styles.panelBody}>
              {showAddCrew && (
                <div className={styles.newCrewBox}>
                  <h3 className="font-semibold text-text-primary text-sm">New field crew</h3>
                  <div className={styles.newCrewGrid}>
                    <div className={styles.field}>
                      <label>Crew name</label>
                      <input
                        type="text"
                        value={newCrew.name}
                        onChange={(e) => setNewCrew(prev => ({ ...prev, name: e.target.value }))}
                        className={styles.input}
                        placeholder="e.g., Team Alpha"
                      />
                    </div>
                    <div className={styles.field}>
                      <label>Shift start</label>
                      <input
                        type="time"
                        value={newCrew.shift_start}
                        onChange={(e) => setNewCrew(prev => ({ ...prev, shift_start: e.target.value }))}
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.field}>
                      <label>Shift end</label>
                      <input
                        type="time"
                        value={newCrew.shift_end}
                        onChange={(e) => setNewCrew(prev => ({ ...prev, shift_end: e.target.value }))}
                        className={styles.input}
                      />
                    </div>
                    <div className={styles.field}>
                      <label>Max tasks</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={newCrew.max_tasks_per_shift}
                        onChange={(e) => setNewCrew(prev => ({ ...prev, max_tasks_per_shift: parseInt(e.target.value) || 10 }))}
                        className={styles.input}
                      />
                    </div>
                  </div>
                  <FleetCapabilities crew={newCrew} onChange={(key,value)=>setNewCrew(prev=>({...prev,[key]:value}))} />
                  <div className={styles.actionRow}>
                    <button
                      type="button"
                      onClick={handleCreateCrew}
                      disabled={saving === 'new-crew'}
                      className={styles.btnPrimary}
                    >
                      {saving === 'new-crew' ? 'Creating…' : 'Create crew'}
                    </button>
                  </div>
                </div>
              )}

              {crews.length === 0 ? (
                <p className="text-text-muted text-sm py-4">No field crews found. Click &quot;+ Add crew&quot; to configure one.</p>
              ) : (
                <div className="space-y-4">
                  {crews.map((crew) => (
                    <div key={crew.id} className={styles.crewCard}>
                      <div className={styles.crewHeader}>
                        <h3 className={styles.crewTitle}>{crew.name}</h3>
                        <span className={`${styles.statusBadge} ${
                          crew.availability_status === 'available'
                            ? styles.statusAvailable
                            : crew.availability_status === 'on_route'
                            ? styles.statusOnRoute
                            : styles.statusOffline
                        }`}>
                          {crew.availability_status || 'offline'}
                        </span>
                      </div>

                      <div className={styles.crewGrid}>
                        <div className={styles.field}>
                          <label>Shift start</label>
                          <input
                            type="time"
                            value={crew.shift_start || '08:00'}
                            onChange={(e) => handleCrewChange(crew.id, 'shift_start', e.target.value)}
                            className={styles.input}
                          />
                        </div>

                        <div className={styles.field}>
                          <label>Shift end</label>
                          <input
                            type="time"
                            value={crew.shift_end || '17:00'}
                            onChange={(e) => handleCrewChange(crew.id, 'shift_end', e.target.value)}
                            className={styles.input}
                          />
                        </div>

                        <div className={styles.field}>
                          <label>Max tasks per shift</label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={crew.max_tasks_per_shift || 10}
                            onChange={(e) => handleCrewChange(crew.id, 'max_tasks_per_shift', e.target.value)}
                            className={styles.input}
                          />
                        </div>
                      </div>

                      <FleetCapabilities crew={crew} onChange={(key,value)=>handleCrewChange(crew.id,key,value)} />
                      <div className={styles.actionRow}>
                        <button
                          type="button"
                          onClick={() => handleSaveCrew(crew)}
                          disabled={saving === `crew-${crew.id}`}
                          className={styles.btnPrimary}
                        >
                          {saving === `crew-${crew.id}` ? 'Saving…' : `Save ${crew.name}`}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default function OptimizationSettings() {
  return (
    <AdminGuard>
      <OptimizationSettingsContent />
    </AdminGuard>
  )
}
