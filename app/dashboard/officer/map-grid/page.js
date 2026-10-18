'use client'
import { Suspense, useEffect, useState, useRef, useId } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { fetchValidatedReports, fetchCleanupTasks } from '@/lib/api'
import { OfficerGuard } from '@/components/auth/RequireRole'
import { Map, SlidersHorizontal, X, AlertTriangle, RotateCcw } from 'lucide-react'
import styles from './MapGrid.module.css'
import { REPORT_PIN_STATUSES } from '@/components/map/reportPinStatus'

const EcoPinMap = dynamic(
  () => import('@/components/map/EcoPinMap'),
  { ssr: false, loading: () => <div className={styles.loading} role="status">Loading map…</div> }
)
const CrewTaskLayer = dynamic(
  () => import('@/components/map/CrewTaskLayer'),
  { ssr: false }
)

function OfficerMapContent() {
  const searchParams = useSearchParams()
  const [reports, setReports] = useState([])
  const [tasks, setTasks] = useState([])

  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [typeFilter, setTypeFilter] = useState('all')

  const [showPins, setShowPins] = useState(true)
  const [showClusters, setShowClusters] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showTaskPins, setShowTaskPins] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [activeView, setActiveView] = useState('map')
  const [dataError, setDataError] = useState(false)
  const controlsRef = useRef(null)

  const statusSelectId = useId()
  const typeSelectId = useId()

  const fetchControlData = () => {
    return Promise.all([fetchValidatedReports(), fetchCleanupTasks()])
      .then(([reportsData, tasksData]) => {
        setReports(reportsData || [])
        setTasks(tasksData || [])
      })
      .catch(() => setDataError(true))
  }

  const handleRetry = () => {
    setDataError(false)
    void fetchControlData()
  }

  useEffect(() => {
    let active = true
    Promise.all([fetchValidatedReports(), fetchCleanupTasks()])
      .then(([reportsData, tasksData]) => {
        if (!active) return
        setReports(reportsData || [])
        setTasks(tasksData || [])
      })
      .catch(() => {
        if (!active) return
        setDataError(true)
      })
    return () => {
      active = false
    }
  }, [])

  const issueTypes = [...new Set(reports.map(r => r.issue_type).filter(Boolean))]

  const closeControls = () => {
    setIsSidebarOpen(false)
    setActiveView('map')
    controlsRef.current?.focus()
  }

  const filtersActive = statusFilter !== 'all' || typeFilter !== 'all'
  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0)

  const handleToggleControls = () => {
    setIsSidebarOpen(open => {
      const next = !open
      setActiveView(next ? 'controls' : 'map')
      return next
    })
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Map grid"
        subtitle="Explore validated environmental reports, clusters, and active cleanup tasks."
        breadcrumbs={[{ label: 'Officer', href: '/dashboard/officer' }, { label: 'Map grid' }]}
        className={styles.pageHeader}
      >
        <div className={styles.headerActions}>
          {filtersActive && (
            <span className={styles.activePill} aria-live="polite">
              {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
            </span>
          )}
          <button
            ref={controlsRef}
            type="button"
            className={styles.controlToggle}
            aria-expanded={isSidebarOpen}
            aria-controls="map-grid-controls"
            onClick={handleToggleControls}
          >
            <SlidersHorizontal size={18} aria-hidden="true" />
            <span>{isSidebarOpen ? 'Hide controls' : 'Show controls'}</span>
          </button>
        </div>
      </PageHeader>

      <div className={styles.viewTabs} role="group" aria-label="Workspace view">
        <button
          type="button"
          aria-pressed={activeView === 'map'}
          onClick={() => setActiveView('map')}
        >
          Map
        </button>
        <button
          type="button"
          aria-label="Controls and filters"
          aria-pressed={activeView === 'controls'}
          onClick={() => {
            setActiveView('controls')
            setIsSidebarOpen(true)
          }}
        >
          Controls & filters {filtersActive ? `(${activeFilterCount})` : ''}
        </button>
      </div>

      {dataError && (
        <div className={styles.notice} role="alert">
          <p>Map filter options and cleanup task pins could not refresh. The report map loads separately.</p>
          <button type="button" onClick={handleRetry}>Try again</button>
        </div>
      )}

      <div
        className={`${styles.workspace} ${!isSidebarOpen ? styles.mapOnly : ''}`}
        data-view={activeView}
      >
        <section className={styles.mapPanel} aria-label="Environmental reports map">
          <EcoPinMap
            centerLat={searchParams.get('lat') ? parseFloat(searchParams.get('lat')) : undefined}
            centerLng={searchParams.get('lng') ? parseFloat(searchParams.get('lng')) : undefined}
            focusReportId={searchParams.get('id')}
            hideFilterPanel={true}
            photoPins={true}
            externalStatusFilter={statusFilter}
            externalIssueTypeFilter={typeFilter}
            externalShowPins={showPins}
            externalShowClusters={showClusters}
            externalShowHeatmap={showHeatmap}
            externalMaxBounds={[[14.50, 120.90], [14.80, 121.20]]}
            externalMinZoom={12}
          >
            {showTaskPins && (
              <CrewTaskLayer photoPins={true} tasks={tasks.filter(task => task.status !== 'completed')} />
            )}
          </EcoPinMap>
        </section>

        {isSidebarOpen && (
          <aside
            id="map-grid-controls"
            className={styles.controls}
            aria-labelledby="map-grid-controls-title"
          >
            <div className={styles.controlsHeader}>
              <h2 id="map-grid-controls-title">
                <Map size={18} aria-hidden="true" />
                <span>Map controls</span>
              </h2>
              <button
                type="button"
                className={styles.close}
                onClick={closeControls}
                aria-label="Hide map controls"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className={styles.controlsBody}>
              <fieldset className={styles.section}>
                <legend>Map layers</legend>
                <div className={styles.layerGrid}>
                  {[
                    { label: 'Report pins', checked: showPins, onChange: setShowPins },
                    { label: 'Report clusters', checked: showClusters, onChange: setShowClusters },
                    { label: 'Heatmap', checked: showHeatmap, onChange: setShowHeatmap },
                    { label: 'Cleanup task pins', checked: showTaskPins, onChange: setShowTaskPins },
                  ].map(layer => (
                    <label key={layer.label} className={styles.layer}>
                      <input
                        type="checkbox"
                        checked={layer.checked}
                        onChange={event => layer.onChange(event.target.checked)}
                      />
                      <span>{layer.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <section className={styles.section} aria-labelledby="map-grid-filters-title">
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionTitleGroup}>
                    <h3 id="map-grid-filters-title">Report filters</h3>
                    {filtersActive && (
                      <span className={styles.filterCountBadge}>
                        {activeFilterCount} active
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.reset}
                    disabled={!filtersActive}
                    onClick={() => { setStatusFilter('all'); setTypeFilter('all') }}
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                    Reset
                  </button>
                </div>
                <div className={styles.filters}>
                  <div className={styles.filterField}>
                    <label htmlFor={statusSelectId}>Report status</label>
                    <select
                      id={statusSelectId}
                      value={statusFilter}
                      onChange={event => setStatusFilter(event.target.value)}
                    >
                      {[
                        { value: 'all', label: 'All statuses' },
                        { value: 'unresolved', label: 'Unresolved' },
                        { value: 'in_progress', label: 'In progress' },
                        { value: 'resolved', label: 'Resolved' },
                        { value: 'waiting_for_feedback', label: 'Waiting for feedback' },
                        { value: 'pending_owner_consent', label: 'Pending owner consent' },
                        { value: 'closed', label: 'Closed' }
                      ].map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.filterField}>
                    <label htmlFor={typeSelectId}>Issue type</label>
                    <select
                      id={typeSelectId}
                      value={typeFilter}
                      onChange={event => setTypeFilter(event.target.value)}
                    >
                      <option value="all">All issue types</option>
                      {issueTypes.map(type => (
                        <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className={styles.helper}>These filters apply to reports. Active cleanup task pins are a separate layer.</p>
              </section>

              <section className={styles.section} aria-labelledby="map-grid-report-legend">
                <h3 id="map-grid-report-legend">Report pin legend</h3>
                <ul className={styles.legendGrid}>
                  {Object.entries(REPORT_PIN_STATUSES).map(([status, { label, tone, Icon }]) => (
                    <li key={status} className={styles.legendItem}>
                      <span className={`${styles.photoStatus} ${styles[tone] || styles.muted}`} aria-hidden="true">
                        <Icon size={14} />
                      </span>
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
                <p className={styles.helper}>Photo pins use a colored ring and status symbol. Where a report photo is unavailable, a neutral image placeholder appears. Open a pin for its written status and details.</p>
              </section>

              <section className={styles.section} aria-labelledby="map-grid-cluster-legend">
                <h3 id="map-grid-cluster-legend">Cluster legend</h3>
                <ul className={styles.legendGrid}>
                  <li className={styles.legendItem}>
                    <span className={styles.standardCluster} aria-hidden="true">#</span>
                    <span>Standard cluster</span>
                  </li>
                  <li className={styles.legendItem}>
                    <span className={styles.overdueCluster} aria-hidden="true">
                      <AlertTriangle size={14} />
                    </span>
                    <span>Overdue cluster</span>
                  </li>
                </ul>
                <p className={styles.helper}>Numbers on cluster markers show their report counts.</p>
              </section>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

export default function OfficerMapGridPage() {
  return (
    <OfficerGuard>
      <Suspense fallback={<div className={styles.loading} role="status">Loading map grid…</div>}>
        <OfficerMapContent />
      </Suspense>
    </OfficerGuard>
  )
}
