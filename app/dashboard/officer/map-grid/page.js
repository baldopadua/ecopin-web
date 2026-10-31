'use client'
import { useState, useRef, useId, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { useDashboardReports, useDashboardTasks, useDashboardClusters } from '@/components/context/DashboardQueryProvider'
import { OfficerGuard } from '@/components/auth/RequireRole'
import { Map, SlidersHorizontal, X, AlertTriangle, RotateCcw, MapPin, Layers, Flame, ClipboardList } from 'lucide-react'
import styles from './MapGrid.module.css'
import { REPORT_PIN_STATUSES } from '@/components/map/reportPinStatus'
import { MAP_LOCATIONS } from '@/lib/map-search.mjs'


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
  const reportQuery = useDashboardReports()
  const taskQuery = useDashboardTasks()
  const clusterQuery = useDashboardClusters()
  const reports = reportQuery.data || []
  const tasks = taskQuery.data || []
  const clusters = clusterQuery.data || []

  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const initialStatus = params.get('status')
      if (initialStatus) {
        setStatusFilter(initialStatus)
      }
    }
  }, [])

  const [showPins, setShowPins] = useState(true)
  const [showClusters, setShowClusters] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showTaskPins, setShowTaskPins] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [activeView, setActiveView] = useState('map')
  const dataError = reportQuery.isError || taskQuery.isError || clusterQuery.isError
  const controlsRef = useRef(null)

  const statusSelectId = useId()
  const typeSelectId = useId()
  const locationSelectId = useId()

  const handleRetry = () => {
    void reportQuery.refetch()
    void taskQuery.refetch()
    void clusterQuery.refetch()
  }

  const issueTypes = [...new Set(reports.map(r => r.issue_type).filter(Boolean))]

  const closeControls = () => {
    setIsSidebarOpen(false)
    setActiveView('map')
    controlsRef.current?.focus()
  }

  const filtersActive = statusFilter !== 'all' || typeFilter !== 'all' || locationFilter !== 'all'
  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0) + (locationFilter !== 'all' ? 1 : 0)

  const handleToggleControls = () => {
    setIsSidebarOpen(open => {
      const next = !open
      setActiveView(next ? 'controls' : 'map')
      return next
    })
  }

  return (
    <div className={`workspace-page ${styles.page}`}>
      <PageHeader
        title="Map grid"
        subtitle="Explore validated environmental reports, clusters, and active cleanup tasks."
        breadcrumbs={[{ label: 'Officer', href: '/dashboard/officer' }, { label: 'Map grid' }]}
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
          <p>Some map data could not refresh. Previously loaded information remains where available.</p>
          <button type="button" onClick={handleRetry}>Try again</button>
        </div>
      )}

      <div
        className={`${styles.workspace} ${!isSidebarOpen ? styles.mapOnly : ''}`}
        data-view={activeView}
      >
        <section className={styles.mapPanel} aria-label="Environmental reports map">
          <EcoPinMap
            searchable
            tasks={tasks.filter(task => task.status !== 'completed')}
            centerLat={searchParams.get('lat') ? parseFloat(searchParams.get('lat')) : undefined}
            centerLng={searchParams.get('lng') ? parseFloat(searchParams.get('lng')) : undefined}
            focusReportId={searchParams.get('id')}
            hideFilterPanel={true}
            photoPins={true}
            externalStatusFilter={statusFilter}
            externalIssueTypeFilter={typeFilter}
            externalLocationFilter={locationFilter}
            externalShowPins={showPins}
            externalShowClusters={showClusters}
            externalShowHeatmap={showHeatmap}
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
                    { label: 'Report pins', checked: showPins, onChange: setShowPins, icon: MapPin },
                    { label: 'Report clusters', checked: showClusters, onChange: setShowClusters, icon: Layers },
                    { label: 'Heatmap', checked: showHeatmap, onChange: setShowHeatmap, icon: Flame },
                    { label: 'Cleanup task pins', checked: showTaskPins, onChange: setShowTaskPins, icon: ClipboardList },
                  ].map(layer => {
                    const LayerIcon = layer.icon
                    return (
                      <label key={layer.label} className={styles.layer}>
                        <input
                          type="checkbox"
                          checked={layer.checked}
                          onChange={event => layer.onChange(event.target.checked)}
                        />
                        {LayerIcon && <LayerIcon size={14} className={styles.layerIcon} aria-hidden="true" />}
                        <span>{layer.label}</span>
                      </label>
                    )
                  })}
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
                    onClick={() => { setStatusFilter('all'); setTypeFilter('all'); setLocationFilter('all') }}
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                    Reset
                  </button>
                </div>
                <div className={styles.filters}>
                  <div className={`${styles.filterField} ${styles.filterFieldFull}`}>
                    <label htmlFor={locationSelectId}>Location / Area</label>
                    <select
                      id={locationSelectId}
                      value={locationFilter}
                      onChange={event => setLocationFilter(event.target.value)}
                    >
                      <option value="all">All Pasig Areas ({reports.length})</option>
                      {MAP_LOCATIONS.filter(loc => loc.name !== 'Pasig City (All)').map(loc => (
                        <option key={loc.name} value={loc.name}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
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
              </section>

              <section className={styles.section} aria-labelledby="map-grid-report-legend">
                <h3 id="map-grid-report-legend">Report pin legend</h3>
                <ul className={styles.legendGrid}>
                  {Object.entries(REPORT_PIN_STATUSES).map(([status, { label, tone, Icon }]) => (
                    <li key={status} className={styles.legendItem} title={label}>
                      <span className={`${styles.photoStatus} ${styles[tone] || styles.muted}`} aria-hidden="true">
                        <Icon size={12} />
                      </span>
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={styles.section} aria-labelledby="map-grid-cluster-legend">
                <h3 id="map-grid-cluster-legend">Cluster & route legend</h3>
                <ul className={styles.legendGrid}>
                  <li className={styles.legendItem} title="Cluster marker with aggregated report count">
                    <span className={styles.standardCluster} aria-hidden="true">#</span>
                    <span>Standard cluster</span>
                  </li>
                  <li className={styles.legendItem} title="Overdue cluster exceeding SLA window">
                    <span className={styles.overdueCluster} aria-hidden="true">
                      <AlertTriangle size={12} />
                    </span>
                    <span>Overdue cluster</span>
                  </li>
                  <li className={`${styles.legendItem} ${styles.legendItemFull}`} title="Dashed blue line represents the task micro-route connecting cluster centroid to constituent report sub-pins.">
                    <span className={styles.microRouteLine} aria-hidden="true" />
                    <span>Task micro-route</span>
                  </li>
                </ul>
              </section>

              <section className={styles.section} aria-labelledby="map-grid-telemetry-title">
                <div className={styles.sectionHeader}>
                  <h3 id="map-grid-telemetry-title">Live map summary</h3>
                  <span className={styles.telemetryTag}>Active</span>
                </div>
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <span className={styles.statValue}>{reports.length}</span>
                    <span className={styles.statLabel}>Total reports</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={`${styles.statValue} ${styles.statWarning}`}>
                      {reports.filter(r => r.status === 'unresolved').length}
                    </span>
                    <span className={styles.statLabel}>Unresolved</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={`${styles.statValue} ${styles.statInfo}`}>
                      {clusters.length}
                    </span>
                    <span className={styles.statLabel}>Clusters</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={`${styles.statValue} ${styles.statSuccess}`}>
                      {tasks.filter(t => t.status !== 'completed').length}
                    </span>
                    <span className={styles.statLabel}>Active tasks</span>
                  </div>
                </div>
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
    <Suspense fallback={<div className={styles.loading} role="status">Loading map grid…</div>}>
      <OfficerGuard>
        <OfficerMapContent />
      </OfficerGuard>
    </Suspense>
  )
}

