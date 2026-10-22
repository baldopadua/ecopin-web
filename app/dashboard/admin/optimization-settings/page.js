'use client'
import FleetCapabilities from '@/components/optimization/FleetCapabilities'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import PageHeader from '@/components/layout/PageHeader'
import PageTabs from '@/components/ui/PageTabs'
import { AdminGuard } from '@/components/auth/RequireRole'
import Notification from '@/components/ui/Notification'
import Dialog from '@/components/ui/Dialog'
import useConfirmation from '@/components/ui/useConfirmation'
import { SkeletonForm } from '@/components/ui/Skeleton'
import {
  getOptimizationSettings,
  updateOptimizationSettings,
  getFieldCrews,
  updateFieldCrew,
  createFieldCrew,
  deleteFieldCrew,
} from '@/lib/api/optimization'
import { reportDiagnostic } from '../../../../lib/diagnostics.mjs';
import { toTitleCase } from '@/lib/helpers/statusHelpers';
import styles from './OptimizationSettings.module.css'

const LocationPickerMap = dynamic(
  () => import('@/components/map/LocationPickerMap'),
  { ssr: false }
)

const NEW_CREW_DEFAULTS = {
  name: '', shift_start: '08:00', shift_end: '17:00', max_tasks_per_shift: 10,
  supports_standard: true, supports_sweeper: false, speed_factor: 1, service_time_factor: 1,
  vehicle_type: 'compactor', hazmat_certified: false,
  max_volume_m3: null, max_weight_kg: null, starting_volume_m3: null, starting_weight_kg: null,
  load_measured_at: null
}

function OptimizationSettingsContent() {
  const { confirm: confirmAction, confirmation } = useConfirmation()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null) // null | 'depot' | 'crew-<id>' | 'delete-<id>'
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
  const newCrewNameRef = useRef(null)
  const [newCrew, setNewCrew] = useState({ ...NEW_CREW_DEFAULTS })
  const [createError, setCreateError] = useState(null)

  useEffect(() => {
    if (showAddCrew) newCrewNameRef.current?.focus()
  }, [showAddCrew])

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

  const validateFleet = (crew, showError = message => setNotification({ message, type: 'error' })) => {
    const invalid = message => { showError(message); return false }
    if (!(crew.supports_standard ?? true) && !crew.supports_sweeper && crew.vehicle_type !== 'hazmat_unit') {
      return invalid('Select at least one dispatch capability: Standard clusters or Sweeper reports.')
    }
    if (!['compactor', 'pickup', 'tricycle', 'motorcycle', 'hazmat_unit', 'walking', 'bicycle'].includes(crew.vehicle_type ?? 'compactor')) {
      return invalid('Choose a valid crew vehicle type')
    }
    for (const [key, label] of [['speed_factor', 'Travel speed factor'], ['service_time_factor', 'Service time factor']]) {
      const value = crew[key] ?? 1
      if (value === '' || !Number.isFinite(Number(value)) || Number(value) < 0.1 || Number(value) > 3) {
        return invalid(`${label} is required and must be between 0.1 and 3.0`)
      }
    }
    for (const [load, maximum, label] of [
      ['starting_volume_m3', 'max_volume_m3', 'volume'],
      ['starting_weight_kg', 'max_weight_kg', 'weight'],
    ]) {
      for (const key of [load, maximum]) {
        if (crew[key] != null && (!Number.isFinite(Number(crew[key])) || Number(crew[key]) < (key === load ? 0 : 0.001))) {
          return invalid(`${key === load ? 'Starting' : 'Maximum'} ${label} must be a valid ${key === load ? 'nonnegative' : 'positive'} number`)
        }
      }
      if (crew[maximum] != null && crew[load] != null && Number(crew[load]) > Number(crew[maximum])) {
        return invalid(`Starting ${label} exceeds vehicle capacity`)
      }
    }
    if ((crew.starting_volume_m3 != null || crew.starting_weight_kg != null) && !crew.load_measured_at) {
      return invalid('Enter when the starting load was measured')
    }
    if (crew.load_measured_at && !Number.isFinite(Date.parse(crew.load_measured_at))) return invalid('Enter a valid load measurement time')
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
    if (saving) return
    setCreateError(null)
    if (!newCrew.name.trim() || newCrew.name.trim().length > 100) {
      setCreateError('Crew name is required and must contain 1 to 100 characters')
      return
    }
    if (!newCrew.shift_start || !newCrew.shift_end || newCrew.shift_end <= newCrew.shift_start) {
      setCreateError('Enter both shift times. Shift end must be after shift start on the same day.')
      return
    }
    if (!Number.isInteger(Number(newCrew.max_tasks_per_shift)) || Number(newCrew.max_tasks_per_shift) < 1 || Number(newCrew.max_tasks_per_shift) > 50) {
      setCreateError('Max tasks per shift must be a whole number between 1 and 50')
      return
    }
    if (!validateFleet(newCrew, setCreateError)) return

    try {
      setSaving('new-crew')
      const created = await createFieldCrew({ ...newCrew, name: newCrew.name.trim(), max_tasks_per_shift: Number(newCrew.max_tasks_per_shift), ...fleetPayload(newCrew) })
      setCrews(prev => [...prev, created])
      setShowAddCrew(false)
      setNewCrew({ ...NEW_CREW_DEFAULTS })
      setNotification({ message: 'Crew created successfully. Assign crew members in Crew Management before dispatching.', type: 'success' })
    } catch (err) {
      setCreateError(err.message || 'Failed to create crew')
    } finally {
      setSaving(null)
    }
  }

  const handleDepotChange = (field, value) => {
    setIsEditingDepot(true)
    setDepot(prev => ({ ...prev, [field]: value }))
  }

  const handleCrewChange = (crewId, field, value) => {
    setCrews(prev => prev.map(c => c.id === crewId ? { ...c, [field]: value } : c))
  }

  const handleDeleteCrew = async (crew) => {
    // Safety constraint 1: Check if tasks are assigned
    const activeTasks = Number(crew.active_task_count ?? crew.assigned_tasks_count ?? 0)
    if (activeTasks > 0) {
      setNotification({
        message: `Cannot delete "${crew.name}": There are ${activeTasks} task(s) assigned to this crew. Reassign or resolve all tasks first to prevent system errors.`,
        type: 'error'
      })
      return
    }

    // Safety constraint 2: Check if field crew members or a lead are attached
    const memberCount = (crew.members?.length || crew.member_profile_ids?.length || 0)
    if (memberCount > 0 || crew.team_lead_profile_id) {
      setNotification({
        message: `Cannot delete "${crew.name}": Crew has ${memberCount} attached member(s) or an assigned team lead. Unassign all members in Crew Management first.`,
        type: 'error'
      })
      return
    }

    // Confirmation dialog before proceeding
    const confirmed = await confirmAction({
      title: `Delete Crew "${crew.name}"?`,
      description: `Are you sure you want to delete ${crew.name}? This field crew configuration will be permanently removed.`,
      action: 'Delete Crew'
    })
    if (!confirmed) return

    try {
      setSaving(`delete-${crew.id}`)
      await deleteFieldCrew(crew.id)
      setCrews(prev => prev.filter(c => c.id !== crew.id))
      setNotification({ message: `Field crew "${crew.name}" was successfully deleted.`, type: 'success' })
    } catch (err) {
      setNotification({ message: err.message || 'Failed to delete field crew', type: 'error' })
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className={`${styles.page} workspace-page`}>
        <PageHeader
          title="Optimization settings"
          subtitle="Configure depot location, crew schedules, and operational parameters."
          breadcrumbs={[
            { label: 'Admin', href: '/dashboard/admin' },
            { label: 'Optimization settings' }
          ]}
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
    <div className={`${styles.page} workspace-page`}>
      <PageHeader
        title="Optimization settings"
        subtitle="Configure depot location, crew schedules, and operational parameters."
        breadcrumbs={[
          { label: 'Admin', href: '/dashboard/admin' },
          { label: 'Optimization settings' }
        ]}
      />

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <Dialog open={showAddCrew} onClose={() => setShowAddCrew(false)} labelledBy="create-crew-title" dismissible={saving !== 'new-crew'}>
        {showAddCrew && (
          <form className={styles.crewDialog} onSubmit={event => { event.preventDefault(); void handleCreateCrew() }}>
            <div className={styles.crewDialogHeader}>
              <div>
                <h2 id="create-crew-title">Create field crew</h2>
                <p>Required fields have defaults where appropriate. Select only capabilities the crew actually has.</p>
              </div>
              <button type="button" className={styles.btnSecondary} onClick={() => setShowAddCrew(false)} disabled={saving === 'new-crew'} aria-label="Close crew creation">Close</button>
            </div>
            <div className={styles.crewDialogBody}>
              <fieldset className={styles.crewDialogFields} disabled={saving === 'new-crew'}>
              <div className={styles.newCrewGrid}>
                <div className={styles.field}>
                  <label htmlFor="new-crew-name">Crew name · Required</label>
                  <input ref={newCrewNameRef} id="new-crew-name" autoFocus required maxLength={100} type="text" value={newCrew.name}
                    onChange={event => setNewCrew(prev => ({ ...prev, name: event.target.value }))}
                    className={styles.input} placeholder="e.g., Barangay collection team 1" aria-describedby="new-crew-name-help" />
                  <p id="new-crew-name-help" className={styles.help}>Use a recognizable, specific team name. Assign members separately in Crew Management after creation.</p>
                </div>
                <div className={styles.field}>
                  <label htmlFor="new-crew-start">Shift start · Required</label>
                  <input id="new-crew-start" type="time" required value={newCrew.shift_start}
                    onChange={event => setNewCrew(prev => ({ ...prev, shift_start: event.target.value }))} className={styles.input} />
                  <p className={styles.help}>Default 08:00. Use the crew’s actual daily start time.</p>
                </div>
                <div className={styles.field}>
                  <label htmlFor="new-crew-end">Shift end · Required</label>
                  <input id="new-crew-end" type="time" required value={newCrew.shift_end}
                    onChange={event => setNewCrew(prev => ({ ...prev, shift_end: event.target.value }))} className={styles.input} />
                  <p className={styles.help}>Default 17:00. Must be later than the start on the same day.</p>
                </div>
                <div className={styles.field}>
                  <label htmlFor="new-crew-tasks">Max tasks per shift · Required</label>
                  <input id="new-crew-tasks" type="number" required min="1" max="50" step="1" value={newCrew.max_tasks_per_shift}
                    onChange={event => setNewCrew(prev => ({ ...prev, max_tasks_per_shift: event.target.value === '' ? '' : Number(event.target.value) }))} className={styles.input} />
                  <p className={styles.help}>Default 10; accepted range 1–50. Reduce this for long or demanding cleanup tasks. This is a cap, not a target.</p>
                </div>
              </div>
              <FleetCapabilities crew={newCrew} onChange={(key, value) => setNewCrew(prev => ({ ...prev, [key]: value }))} />
              </fieldset>
            </div>
            <div className={styles.crewDialogFooter}>
              {createError && <p role="alert" className={styles.createError}>{createError}</p>}
              <div className={styles.actionRow}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowAddCrew(false)} disabled={saving === 'new-crew'}>Cancel</button>
                <button type="submit" className={styles.btnPrimary} disabled={saving === 'new-crew'}>{saving === 'new-crew' ? 'Creating…' : 'Create crew'}</button>
              </div>
            </div>
          </form>
        )}
      </Dialog>

      {/* Tabs Switcher */}
      <PageTabs label="Optimization settings" tabs={[{ id: 'depot', label: 'SWMO Depot Location' }, { id: 'crew', label: 'Field Crew Configuration' }]} value={activeTab} onChange={setActiveTab} />

      <div className={`${styles.tabContent} workspace-fill`}>
        {/* Tab 1: SWMO Depot Settings */}
        {activeTab === 'depot' && (
          <section
            id="depot-panel"
            role="tabpanel"
            aria-labelledby="depot-tab"
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
                    readOnly={!isEditingDepot || saving === 'depot'}
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
                      disabled={saving === 'depot'}
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
            id="crew-panel"
            role="tabpanel"
            aria-labelledby="crew-tab"
            className={styles.panel}
          >
            <div className={styles.panelHeader}>
              <div>
                <h2>Field Crew Configuration</h2>
                <p>Configure shift schedules and limits for each field crew.</p>
              </div>
              <button 
                type="button"
                onClick={() => { setCreateError(null); setShowAddCrew(true) }}
                className={styles.btnSecondary}
              >
                + Add crew
              </button>
            </div>

            <div className={styles.panelBody}>


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
                          {toTitleCase(crew.availability_status || 'offline')}
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
                          onClick={() => handleDeleteCrew(crew)}
                          disabled={saving === `delete-${crew.id}` || saving === `crew-${crew.id}`}
                          className={styles.btnDanger}
                        >
                          {saving === `delete-${crew.id}` ? 'Deleting…' : 'Delete crew'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveCrew(crew)}
                          disabled={saving === `crew-${crew.id}` || saving === `delete-${crew.id}`}
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
      {confirmation}
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
