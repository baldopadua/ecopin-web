'use client'
import { Suspense, useEffect, useState, useRef } from 'react'
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
  const [dataError, setDataError] = useState(false)
  const controlsRef = useRef(null)

  const loadControlData = () => {
    setDataError(false)
    return Promise.all([fetchValidatedReports(), fetchCleanupTasks()])
      .then(([reportsData, tasksData]) => { setReports(reportsData); setTasks(tasksData) })
      .catch(() => setDataError(true))
  }

  useEffect(() => { void loadControlData() }, [])

  const issueTypes = [...new Set(reports.map(r => r.issue_type).filter(Boolean))]

  const closeControls = () => { setIsSidebarOpen(false); controlsRef.current?.focus() }
  const filtersActive = statusFilter !== 'all' || typeFilter !== 'all'

  return (
    <div className={styles.page}>
      <PageHeader title="Map grid" subtitle="Explore validated environmental reports, clusters, and active cleanup tasks."
        breadcrumbs={[{ label: 'Officer', href: '/dashboard/officer' }, { label: 'Map grid' }]}>
        <button ref={controlsRef} type="button" className={styles.controlToggle} aria-expanded={isSidebarOpen} aria-controls="map-grid-controls"
          onClick={() => setIsSidebarOpen(open => !open)}><SlidersHorizontal size={18} aria-hidden="true" />{isSidebarOpen ? 'Hide controls' : 'Show controls'}</button>
      </PageHeader>
      {dataError && <div className={styles.notice} role="alert"><p>Map filter options and cleanup task pins could not refresh. The report map loads separately.</p><button type="button" onClick={loadControlData}>Try again</button></div>}
      <div className={`${styles.workspace} ${!isSidebarOpen ? styles.mapOnly : ''}`}>
        <section className={styles.mapPanel} aria-label="Environmental reports map">
          <EcoPinMap
            centerLat={searchParams.get('lat') ? parseFloat(searchParams.get('lat')) : undefined}
            centerLng={searchParams.get('lng') ? parseFloat(searchParams.get('lng')) : undefined}
            focusReportId={searchParams.get('id')} hideFilterPanel={true} photoPins={true}
            externalStatusFilter={statusFilter} externalIssueTypeFilter={typeFilter}
            externalShowPins={showPins} externalShowClusters={showClusters} externalShowHeatmap={showHeatmap}
            externalMaxBounds={[[14.50, 120.90], [14.80, 121.20]]} externalMinZoom={12}>
            {showTaskPins && <CrewTaskLayer photoPins={true} tasks={tasks.filter(task => task.status !== 'completed')} />}
          </EcoPinMap>
        </section>
        {isSidebarOpen && <aside id="map-grid-controls" className={styles.controls} aria-labelledby="map-grid-controls-title">
          <div className={styles.controlsHeader}><h2 id="map-grid-controls-title"><Map size={18} aria-hidden="true" />Map controls</h2>
            <button type="button" className={styles.close} onClick={closeControls} aria-label="Hide map controls"><X size={20} aria-hidden="true" /></button>
          </div>
          <div className={styles.controlsBody}>
            <fieldset className={styles.section}><legend>Map layers</legend>
              {[
                { label: 'Report pins', checked: showPins, onChange: setShowPins },
                { label: 'Report clusters', checked: showClusters, onChange: setShowClusters },
                { label: 'Heatmap', checked: showHeatmap, onChange: setShowHeatmap },
                { label: 'Cleanup task pins', checked: showTaskPins, onChange: setShowTaskPins },
              ].map(layer => <label key={layer.label} className={styles.layer}><input type="checkbox" checked={layer.checked} onChange={event => layer.onChange(event.target.checked)} /><span>{layer.label}</span></label>)}
            </fieldset>
            <section className={styles.section} aria-labelledby="map-grid-filters-title">
              <div className={styles.sectionHeader}><h3 id="map-grid-filters-title">Report filters</h3><button type="button" className={styles.reset} disabled={!filtersActive} onClick={() => { setStatusFilter('all'); setTypeFilter('all') }}><RotateCcw size={16} aria-hidden="true" />Reset</button></div>
              <div className={styles.filters}>
                <label htmlFor="map-grid-status">Report status
                  <select id="map-grid-status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                    {[{ value: 'all', label: 'All statuses' }, { value: 'unresolved', label: 'Unresolved' }, { value: 'in_progress', label: 'In progress' }, { value: 'resolved', label: 'Resolved' }, { value: 'waiting_for_feedback', label: 'Waiting for feedback' }, { value: 'pending_owner_consent', label: 'Pending owner consent' }, { value: 'closed', label: 'Closed' }].map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label htmlFor="map-grid-type">Issue type
                  <select id="map-grid-type" value={typeFilter} onChange={event => setTypeFilter(event.target.value)}>
                    <option value="all">All issue types</option>
                    {issueTypes.map(type => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
                  </select>
                </label>
              </div>
              <p className={styles.helper}>These filters apply to reports. Active cleanup task pins are a separate layer.</p>
            </section>
            <section className={styles.section} aria-labelledby="map-grid-report-legend"><h3 id="map-grid-report-legend">Report pin legend</h3>
              <ul className={styles.legend}>
                {Object.entries(REPORT_PIN_STATUSES).map(([status, { label, tone, Icon }]) => <li key={status}>
                  <span className={`${styles.photoStatus} ${styles[tone] || styles.muted}`} aria-hidden="true"><Icon size={16} /></span>{label}
                </li>)}
              </ul>
              <p className={styles.helper}>Photo pins use a colored ring and status symbol. Where a report photo is unavailable, a neutral image placeholder appears. Open a pin for its written status and details.</p>
            </section>
            <section className={styles.section} aria-labelledby="map-grid-cluster-legend"><h3 id="map-grid-cluster-legend">Cluster & route legend</h3>
              <ul className={styles.legend}>
                <li><span className={styles.standardCluster} aria-hidden="true">#</span>Standard cluster</li>
                <li><span className={styles.overdueCluster} aria-hidden="true"><AlertTriangle size={16} /></span>Cluster with an overdue report</li>
                <li title="Dashed blue line (#0052cc) represents the task micro-route connecting cluster centroid to constituent report sub-pins.">
                  <span className={styles.microRouteLine} aria-hidden="true" />
                  <span>Task micro-route (<code className={styles.microRouteCode}>#0052cc</code>)</span>
                </li>
              </ul>
              <p className={styles.helper}>Numbers on cluster markers show their report counts. Dashed blue line (#0052cc) represents the task micro-route connecting cluster centroid to constituent report sub-pins.</p>
            </section>
          </div>
        </aside>}
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
