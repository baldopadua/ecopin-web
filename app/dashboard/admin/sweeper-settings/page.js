'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import { AdminGuard } from '@/components/auth/RequireRole'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Notification from '@/components/ui/Notification'
import PageTabs from '@/components/ui/PageTabs'
import { fetchSweeperConfig, updateSlaThreshold, updateWorkTime } from '@/lib/api/sweeper'
import styles from './SweeperSettings.module.css'

const issueLabel = type => type.replace(/_/g, ' ').replace(/^\w/, letter => letter.toUpperCase())

function SweeperSettingsPageContent() {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState(null)
  const [slaThreshold, setSlaThreshold] = useState('')
  const [workTimes, setWorkTimes] = useState({})
  const [savingSla, setSavingSla] = useState(false)
  const [savingWorkTimes, setSavingWorkTimes] = useState({})
  const [pendingSla, setPendingSla] = useState(null)
  const [activeTab, setActiveTab] = useState('deadline')

  const loadConfig = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSweeperConfig()
      setConfig(data)
      setSlaThreshold(data.slaThreshold)
      setWorkTimes(data.workTimes || {})
    } catch {
      setError('Sweeper settings could not load. Try again to view the current values.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { queueMicrotask(() => { void loadConfig() }) }, [])

  const saveSla = async (hours, confirmed = false) => {
    if (savingSla) return
    setSavingSla(true)
    setNotification(null)
    try {
      await updateSlaThreshold(hours, confirmed)
      setConfig(previous => ({ ...previous, slaThreshold: hours }))
      setSlaThreshold(hours)
      setPendingSla(null)
      setNotification({ type: 'success', message: 'Service-level deadline saved.' })
    } catch (err) {
      setPendingSla(null)
      setNotification({ type: 'error', message: err.message || 'Deadline could not be saved. Try again.' })
    } finally {
      setSavingSla(false)
    }
  }

  const submitSla = event => {
    event.preventDefault()
    const hours = Number(slaThreshold)
    if (!Number.isFinite(hours) || hours < 1 || hours > 168) return
    if (Math.abs(hours - config.slaThreshold) / config.slaThreshold > 0.25) {
      setPendingSla(hours)
    } else {
      void saveSla(hours)
    }
  }

  const saveWorkTime = async (event, type) => {
    event.preventDefault()
    if (savingWorkTimes[type]) return
    const minutes = Number(workTimes[type])
    if (!Number.isFinite(minutes) || minutes < 5 || minutes > 120) return
    setSavingWorkTimes(previous => ({ ...previous, [type]: true }))
    setNotification(null)
    try {
      await updateWorkTime(type, minutes)
      setConfig(previous => ({ ...previous, workTimes: { ...previous.workTimes, [type]: minutes } }))
      setNotification({ type: 'success', message: `${issueLabel(type)} work time saved.` })
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Work time could not be saved. Try again.' })
    } finally {
      setSavingWorkTimes(previous => ({ ...previous, [type]: false }))
    }
  }

  return (
    <div className={`${styles.page} workspace-page`}>
        <PageHeader
          title="Sweeper settings"
          subtitle="Set report deadlines and the cleanup time used in dispatch planning."
          breadcrumbs={[
            { label: 'Admin', href: '/dashboard/admin' },
            { label: 'Sweeper settings' }
          ]}
        />
        {notification && <Notification {...notification} onClose={() => setNotification(null)} />}
        <PageTabs label="Sweeper settings" tabs={[{ id: 'deadline', label: 'Service deadline' }, { id: 'work-times', label: 'Work time estimates' }]} value={activeTab} onChange={setActiveTab} />
        {loading ? (
          <div className={`${styles.loading} workspace-fill`} role="status" aria-busy="true">
            <span>Loading sweeper settings…</span>
            <div className={styles.skeleton} /><div className={styles.skeleton} />
          </div>
        ) : error ? (
          <div className={`${styles.error} workspace-fill`} role="alert">
            <p>{error}</p><Button variant="secondary" onClick={loadConfig}>Retry</Button>
          </div>
        ) : config && (activeTab === 'deadline' ? (
          <section id="deadline-panel" role="tabpanel" aria-labelledby="deadline-tab" className={`${styles.panel} workspace-fill`}>
            <div className={`workspace-scroll ${styles.panelBody}`}>
            <div className={styles.section} aria-labelledby="deadline-heading">
              <div className={styles.description}>
                <h2 id="deadline-heading">Service-level deadline</h2>
                <p>Reports that reach this deadline are marked as overdue. The deadline must be later than the configured report maturation periods.</p>
              </div>
              <form onSubmit={submitSla} className={styles.deadlineForm}>
                <label htmlFor="sla-hours">SLA threshold (hours)</label>
                <p id="sla-help" className={styles.hint}>1–168 hours · current setting: {config.slaThreshold} hours</p>
                <div className={styles.controls}>
                  <input id="sla-hours" className={styles.input} type="number" min="1" max="168" step="1" required
                    aria-describedby="sla-help" value={slaThreshold} disabled={savingSla}
                    onChange={event => setSlaThreshold(event.target.value)} />
                  <Button type="submit" disabled={savingSla || slaThreshold === '' || Number(slaThreshold) === Number(config.slaThreshold)}>
                    {savingSla ? 'Saving…' : 'Save deadline'}
                  </Button>
                </div>
              </form>
            </div>
            <p className={styles.footer}>Crew schedules and capacity are managed in <Link href="/dashboard/admin/optimization-settings">Optimization settings</Link>.</p>
            </div>
          </section>
        ) : (
          <section id="work-times-panel" role="tabpanel" aria-labelledby="work-times-tab" className={`${styles.panel} workspace-fill`}>
            <div className={`workspace-scroll ${styles.workPanelBody}`}>
              <div className={styles.description}>
                <h2 id="work-time-heading">Work time estimates</h2>
                <p>Estimated cleanup time per report. Dispatch planning combines this with travel time and each crew’s available capacity.</p>
                <p className={styles.hint}>Enter 5–120 minutes for each issue type.</p>
              </div>
              <div className={styles.workTimes}>
                {Object.entries(workTimes).length === 0 ? <p className={styles.hint}>No issue types are configured.</p> : Object.entries(workTimes).map(([type, minutes]) => (
                  <form key={type} onSubmit={event => saveWorkTime(event, type)} className={styles.workRow}>
                    <label htmlFor={`work-${type}`}>{issueLabel(type)}</label>
                    <div className={styles.controls}>
                      <input id={`work-${type}`} aria-label={`${issueLabel(type)} work time (minutes)`} className={styles.input}
                        type="number" min="5" max="120" step="1" required value={minutes} disabled={savingWorkTimes[type]}
                        onChange={event => setWorkTimes(previous => ({ ...previous, [type]: event.target.value }))} />
                      <span className={styles.unit}>min</span>
                      <Button type="submit" variant="secondary" aria-label={`Save ${issueLabel(type)} work time`}
                        disabled={savingWorkTimes[type] || minutes === '' || Number(minutes) === Number(config.workTimes?.[type])}>
                        {savingWorkTimes[type] ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  </form>
                ))}
              </div>
              <p className={styles.footer}>Crew schedules and capacity are managed in <Link href="/dashboard/admin/optimization-settings">Optimization settings</Link>.</p>
            </div>
          </section>
        ))}
        <Dialog open={pendingSla !== null} onClose={() => setPendingSla(null)} label="Confirm deadline change" dismissible={!savingSla}>
          <section className={styles.confirmation}>
            <h2>Confirm deadline change</h2>
            <p>Change the service-level deadline from {config?.slaThreshold} to {pendingSla} hours? This is a change of more than 25% and affects the policy used to flag overdue reports.</p>
            <div className={styles.actions}>
              <Button type="button" variant="secondary" autoFocus disabled={savingSla} onClick={() => setPendingSla(null)}>Cancel</Button>
              <Button type="button" disabled={savingSla} onClick={() => saveSla(pendingSla, true)}>{savingSla ? 'Saving…' : 'Confirm change'}</Button>
            </div>
          </section>
        </Dialog>
      </div>
  )
}

export default function SweeperSettingsPage() {
  return (
    <AdminGuard>
      <SweeperSettingsPageContent />
    </AdminGuard>
  )
}
