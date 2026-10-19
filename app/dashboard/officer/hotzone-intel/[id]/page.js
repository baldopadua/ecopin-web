'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { fetchValidatedReports, fetchClusterById, fetchReportsByClusterId, createCleanupTask, fetchCleanupTasks, updateClusterLabel } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import styles from './HotzoneDetail.module.css'
import Notification from '@/components/ui/Notification'
import { SkeletonLine, SkeletonCard } from '@/components/ui/Skeleton'
import DataTable from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import EvidenceGallery from '@/components/ui/EvidenceGallery'
import ExportButton from '@/components/ui/ExportButton'
import ReportDetailModal from '@/components/reports/ReportDetailModal'
import { fetchReportEvidence } from '@/lib/api/reports'
import { OfficerGuard } from '@/components/auth/RequireRole'
import { Map as MapIcon, ChevronLeft, Target, AlertTriangle, Layers, Pen } from 'lucide-react'
import dynamic from 'next/dynamic'
import wkx from 'wkx'
import { Buffer } from 'buffer'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Download } from 'lucide-react'
import { reportDiagnostic } from '../../../../../lib/diagnostics.mjs';

const normalizeString = (str) => {
  if (!str) return '';
  return str.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};
// Polyfill Buffer for browser environment
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer
}

const EcoPinMap = dynamic(() => import('@/components/map/EcoPinMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-surface-elevated animate-pulse border border-border flex items-center justify-center">
      <MapIcon className="w-12 h-12 text-text-muted opacity-50" />
    </div>
  )
})

const parseLocation = (location, latitude, longitude) => {
  if (latitude && longitude) return { latitude, longitude }
  if (!location) return { latitude: null, longitude: null }

  try {
    if (typeof location === 'object' && location !== null && location.type === 'Point' && Array.isArray(location.coordinates)) {
      return { latitude: location.coordinates[1], longitude: location.coordinates[0] }
    } else if (typeof location === 'string' && location.startsWith('{')) {
      const geoJSON = JSON.parse(location)
      if (geoJSON.type === 'Point' && geoJSON.coordinates) {
        return { latitude: geoJSON.coordinates[1], longitude: geoJSON.coordinates[0] }
      }
    } else if (typeof location === 'string') {
      const buffer = Buffer.from(location, 'hex')
      const geometry = wkx.Geometry.parse(buffer)
      if (geometry && geometry.x && geometry.y) {
        return { latitude: geometry.y, longitude: geometry.x }
      }
    } else if (Buffer.isBuffer(location)) {
      const geometry = wkx.Geometry.parse(location)
      if (geometry && geometry.x && geometry.y) {
        return { latitude: geometry.y, longitude: geometry.x }
      }
    }
  } catch (error) {
    reportDiagnostic('error', 'other', 'Error parsing location:', error)
  }
  return { latitude: null, longitude: null }
}

export default function ClusterDetailPage() {
  const [cluster, setCluster] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [existingTask, setExistingTask] = useState(null)
  const [loadingTasks, setLoadingTasks] = useState(true)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState(null)
  const [dispatchError, setDispatchError] = useState(null)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editingTitle, setEditingTitle] = useState('')
  const [savingTitle, setSavingTitle] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  const [reportEvidenceMap, setReportEvidenceMap] = useState({})
  
  const router = useRouter()
  const params = useParams()
  const clusterId = params.id

  useEffect(() => {
    Promise.all([
      fetchClusterById(clusterId),
      fetchReportsByClusterId(clusterId).catch(() => []),
      fetchValidatedReports(),
      fetchCleanupTasks()
    ]).then(([clusterData, clusterReportsData, reportsData, tasksData]) => {
      setCluster(clusterData)
      const dbReports = clusterData?.reports || []
      const explicitClusterReports = Array.isArray(clusterReportsData) ? clusterReportsData : []
      const clusterReportsFromFeed = (reportsData || []).filter(r => String(r.cluster_id) === String(clusterId))
      
      const reportsById = new Map()
      dbReports.forEach(r => reportsById.set(String(r.id), r))
      explicitClusterReports.forEach(r => {
        const existing = reportsById.get(String(r.id))
        reportsById.set(String(r.id), { ...existing, ...r, validation_status: r.validation_status || existing?.validation_status })
      })
      clusterReportsFromFeed.forEach(r => {
        const existing = reportsById.get(String(r.id))
        reportsById.set(String(r.id), { ...existing, ...r, validation_status: r.validation_status || existing?.validation_status })
      })
      const constituentReports = Array.from(reportsById.values())
      setReports(constituentReports)

      const clusterTask = (tasksData || []).find(task => String(task.cluster_id) === String(clusterId))
      if (clusterTask) {
        setExistingTask(clusterTask)
      }
      setLoadingTasks(false)
      setLoading(false)
    }).catch(error => {
      reportDiagnostic('error', 'other', 'Error fetching data:', error)
      setLoading(false)
      setLoadingTasks(false)
    })
  }, [clusterId])

  const handleViewReport = async (report) => {
    setSelectedReport(report)
    if (!reportEvidenceMap[report.id]) {
      try {
        const ev = await fetchReportEvidence(report.id)
        if (Array.isArray(ev)) {
          setReportEvidenceMap(prev => ({ ...prev, [report.id]: ev }))
        }
      } catch (err) {
        reportDiagnostic('error', 'other', 'Failed to load evidence for report:', err)
      }
    }
  }

  const handleRowClick = (report) => {
    handleViewReport(report)
  }

  const handleSaveTitle = async () => {
    if (!editingTitle.trim() || editingTitle.trim() === cluster.label) {
      setIsEditingTitle(false)
      return
    }
    setSavingTitle(true)
    try {
      await updateClusterLabel(clusterId, editingTitle.trim())
      setCluster(prev => ({ ...prev, label: editingTitle.trim() }))
      setIsEditingTitle(false)
    } catch (error) {
      reportDiagnostic('error', 'other', 'Failed to update label:', error)
      setError('Failed to update title. Please try again.')
    } finally {
      setSavingTitle(false)
    }
  }
  
  const unapprovedReports = useMemo(() => {
    return reports.filter(r => {
      const v = (r.validation_status || '').toLowerCase().trim()
      return v !== 'approved' && v !== 'validated' && v !== 'automatically_valid'
    })
  }, [reports])

  const handleDispatch = () => {
    if (existingTask) {
      router.push(`/dashboard/officer/operations/${existingTask.id}`)
      return
    }

    const constituentReports = (reports && reports.length > 0)
      ? reports
      : (cluster?.reports || [])

    if (constituentReports.length === 0) {
      setNotification({
        type: 'error',
        message: 'No reports found in this cluster to dispatch.'
      })
      return
    }

    // Check first if the reports in the cluster are approved reports
    const unapproved = constituentReports.filter(r => {
      const valStatus = (r.validation_status || '').toLowerCase().trim()
      return valStatus !== 'approved' && valStatus !== 'validated' && valStatus !== 'automatically_valid'
    })

    if (unapproved.length > 0) {
      const count = unapproved.length
      const errorMessage = `Cannot dispatch cluster: ${count} report${count > 1 ? 's' : ''} in this cluster ${count > 1 ? 'are' : 'is'} not approved yet. Please manually verify the reports first.`
      setNotification({
        type: 'error',
        message: errorMessage
      })
      setDispatchError(errorMessage)
      return
    }

    setDispatchError(null)

    const reportIds = constituentReports.map(r => r.id).filter(Boolean)

    // Store in session state for cross-page preselection
    if (typeof window !== 'undefined' && reportIds.length > 0) {
      try {
        sessionStorage.setItem('dispatch_report_ids', JSON.stringify(reportIds))
        sessionStorage.setItem('preselected_report_ids', JSON.stringify(reportIds))
      } catch (err) {
        reportDiagnostic('warn', 'dispatch', 'Failed to store report IDs in sessionStorage', err)
      }
    }

    const queryParams = new URLSearchParams()
    if (clusterId) {
      queryParams.set('preselect', clusterId)
      queryParams.set('cluster_id', clusterId)
    }
    if (reportIds.length > 0) {
      queryParams.set('report_ids', reportIds.join(','))
    }
    if (cluster?.label) {
      queryParams.set('title', `Hotzone: ${cluster.label}`)
    }
    if (cluster?.priority) {
      queryParams.set('priority', cluster.priority)
    }

    router.push(`/dashboard/officer/operations/create?${queryParams.toString()}`)
  }

  const exportPDF = () => {
    setExporting(true)
    
    setTimeout(() => {
      try {
        const doc = new jsPDF()
        
        // Brand color: #0052CC (EcoPin Primary)
        const primaryColor = [0, 82, 204]
        
        // Add Header
        doc.setFillColor(...primaryColor)
        doc.rect(0, 0, 210, 40, 'F')
        
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(24)
        doc.setFont('helvetica', 'bold')
        doc.text('EcoPin Cluster Report', 14, 25)
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        const todayDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        const clusterLabel = cluster?.label || `Cluster #${cluster?.id?.slice(0,8) || 'Unknown'}`
        doc.text(`Generated on: ${todayDate} | ${clusterLabel}`, 14, 32)
        
        doc.setTextColor(0, 0, 0)
        
        // Key Statistics Table
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Hotzone details', 14, 55)
        
        autoTable(doc, {
          startY: 60,
          head: [['Metric', 'Value', 'Metric', 'Value']],
          body: [
            ['Priority', (cluster?.priority ? cluster.priority : ((cluster?.priority_score || 0) >= 80 ? 'urgent' : (cluster?.priority_score || 0) >= 60 ? 'high' : (cluster?.priority_score || 0) >= 35 ? 'medium' : 'low')), 'Score', Math.round(cluster?.priority_score || 0).toString()],
            ['Total Reports', reports.length.toString(), 'Radius', `${Math.round(cluster?.radius_meters || 50)}m`],
          ],
          headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          theme: 'grid',
          styles: { fontSize: 10, cellPadding: 5 }
        })
        
        let currentY = doc.lastAutoTable.finalY + 15
        
        // Reports in this hotzone
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Reports in this hotzone', 14, currentY)
        
        const reportTableData = reports.map(r => [
          r.title || 'Untitled',
          normalizeString(r.issue_type) || 'Unknown',
          new Date(r.created_at).toLocaleDateString(),
          r.status ? normalizeString(r.status) : 'Unresolved'
        ])
        
        autoTable(doc, {
          startY: currentY + 5,
          head: [['Title', 'Type', 'Date', 'Status']],
          body: reportTableData,
          headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          theme: 'grid',
          styles: { fontSize: 10, cellPadding: 5 }
        })
        
        doc.save(`EcoPin-Cluster-${cluster?.id?.slice(0,8)}.pdf`)
      } catch (err) {
        reportDiagnostic('error', 'other', 'PDF generation failed', err)
        setNotification({ type: 'error', message: 'The PDF could not generate. Please try again.' })
      } finally {
        setExporting(false)
      }
    }, 100)
  }

  if (loading) return (
    <div className={`workspace-page workspace-page--flow ${styles.detail}`}>
      <SkeletonCard className="mb-6" />
      <div className="card animate-pulse mb-6">
        <SkeletonLine className="h-6 w-1/4 mb-4" />
        <SkeletonLine className="h-64 w-full mb-4" />
      </div>
    </div>
  )

  if (!cluster) return (
    <div className={`workspace-page workspace-page--flow ${styles.detail} flex flex-col items-center justify-center min-h-[50vh]`}>
       <AlertTriangle className="w-16 h-16 text-error mb-4 opacity-50" />
       <h2>Hotzone not found</h2>
       <button onClick={() => router.push('/dashboard/officer/hotzone-intel')} className="mt-4 btn-secondary flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Back to hotzones
       </button>
    </div>
  )

  const clusterCoords = parseLocation(cluster?.center, cluster?.center_lat, cluster?.center_lng)
  const firstReportCoords = reports[0] ? parseLocation(reports[0].location, reports[0].latitude, reports[0].longitude) : { latitude: null, longitude: null }
  const centerLat = cluster?.center_lat || clusterCoords.latitude || firstReportCoords.latitude || null
  const centerLng = cluster?.center_lng || clusterCoords.longitude || firstReportCoords.longitude || null
  
  const getPriorityLabel = (c) => {
    if (c?.priority) return c.priority;
    const score = c?.priority_score || 0;
    if (score >= 80) return 'urgent';
    if (score >= 60) return 'high';
    if (score >= 35) return 'medium';
    return 'low';
  };
  const priorityScore = Math.round(cluster.priority_score || 0)
  const priorityLabel = getPriorityLabel(cluster)

  const reportColumns = [
    { key: 'title', label: 'Title', width: '25%', render: v => <span className="font-bold">{v}</span> },
    { key: 'issue_type', label: 'Type', width: '15%' },
    { key: 'created_at', label: 'Date', width: '15%', render: v => new Date(v).toLocaleDateString() },
    { 
      key: 'validation_status', 
      label: 'Verification', 
      width: '15%', 
      render: v => <StatusBadge status={v || 'pending'} type="validation" /> 
    },
    { key: 'status', label: 'Status', width: '15%', render: v => <StatusBadge status={v} /> },
    {
      key: 'actions',
      label: 'Action',
      width: '15%',
      render: (_, row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleViewReport(row)
          }}
          className="border border-border px-3 py-2 text-text-primary bg-surface hover:text-primary hover:border-primary hover:bg-surface-elevated transition-colors cursor-pointer rounded-xl text-xs"
        >
          View report
        </button>
      )
    }
  ]

  return (
    <OfficerGuard>
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className={`workspace-page workspace-page--flow ${styles.detail}`}>
        <PageHeader
          title={
            isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={editingTitle} 
                  onChange={(e) => setEditingTitle(e.target.value)} 
                  className="px-3 py-2 text-base font-semibold border border-border focus:outline-none w-64 bg-surface-elevated text-text-primary rounded-xl"
                  disabled={savingTitle}
                  autoFocus
                />
                <button 
                  onClick={handleSaveTitle}
                  disabled={savingTitle}
                  className="px-4 py-2 bg-primary text-white border border-primary hover:bg-primary/90 transition-colors rounded-xl"
                >
                  {savingTitle ? 'Saving...' : 'Save'}
                </button>
                <button 
                  onClick={() => setIsEditingTitle(false)}
                  disabled={savingTitle}
                  className="px-4 py-2 text-text-muted hover:text-text-primary dark:hover:text-white transition-colors rounded-xl"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span>{cluster.label || `Cluster #${cluster.id.slice(0,8)}`}</span>
                <button 
                  onClick={() => {
                    setEditingTitle(cluster.label || `Cluster #${cluster.id.slice(0,8)}`)
                    setIsEditingTitle(true)
                  }}
                  className="text-text-secondary hover:text-primary min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl"
                  aria-label="Rename hotzone"
                >
                  <Pen className="w-5 h-5" />
                </button>
              </div>
            )
          }
          subtitle={`Priority ${priorityScore} · ${normalizeString(priorityLabel)}${cluster?.status ? ` · ${normalizeString(cluster.status)}` : ''}`}
          breadcrumbs={[
            { label: 'Hotzones', href: '/dashboard/officer/hotzone-intel' },
            { label: cluster.label || `Hotzone ${cluster.id.slice(0, 8)}` }
          ]}
        >
          <button 
             onClick={() => router.push('/dashboard/officer/hotzone-intel')}
             className="btn-secondary flex items-center gap-2"
          >
             <ChevronLeft className="w-4 h-4" /> Back to hotzones
          </button>
        </PageHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
           
           {/* Details Panel */}
           <div className="card p-5 border border-border rounded-2xl bg-surface-elevated text-text-primary lg:col-span-1 flex flex-col">
              <h2 className="mb-5 flex items-center gap-2 border-b border-border pb-3">
                 <Target className="w-5 h-5 text-accent-green" /> Hotzone details
              </h2>
              
              <div className="space-y-5 flex-1">
                 <div>
                    <span className={styles.detailLabel}>Priority</span>
                    <div className="text-3xl font-bold text-error">
                      {priorityScore}
                      <span className="text-lg font-normal text-text-muted ml-2">/ 100</span>
                    </div>
                    <span className="text-sm font-semibold text-accent-green">
                      {normalizeString(priorityLabel)}
                    </span>
                 </div>
                 
                 <div>
                    <span className={styles.detailLabel}>Reports and coverage</span>
                    <div className="flex items-center gap-4">
                       <div>
                         <span className="text-2xl font-bold block">{reports.length}</span>
                         <span className="text-sm text-text-secondary">Reports</span>
                       </div>
                       <div className="h-8 w-px bg-border"></div>
                       <div>
                         <span className="text-2xl font-bold block">{Math.round(cluster.radius_meters || 50)}m</span>
                         <span className="text-sm text-text-secondary">Radius</span>
                       </div>
                    </div>
                 </div>
                 
                 {cluster.issue_type && (
                   <div>
                      <span className={styles.detailLabel}>Primary issue type</span>
                      <div className="text-lg font-semibold">{normalizeString(cluster.issue_type)}</div>
                   </div>
                 )}

                 {cluster.status && (
                   <div>
                      <span className={styles.detailLabel}>Status</span>
                      <div className="mt-1">
                        <StatusBadge status={cluster.status} type="cluster" />
                      </div>
                   </div>
                 )}
              </div>
              
              <div className="pt-5 border-t border-border mt-5">
                 {loadingTasks ? (
                    <button disabled className="btn-primary w-full opacity-50">Loading...</button>
                 ) : existingTask ? (
                    <button 
                      onClick={handleDispatch}
                      className="btn-primary w-full"
                    >
                      {existingTask.status === 'completed' ? 'View completed task' : 'View dispatched task'}
                    </button>
                 ) : cluster.status === 'resolved' ? (
                    <div className="p-3 text-center bg-accent-green/10 text-accent-green border border-accent-green/30 rounded-xl font-semibold text-sm">
                      Hotzone resolved
                    </div>
                 ) : (
                    <button 
                      onClick={handleDispatch}
                      className="btn-primary w-full"
                    >
                      Dispatch field crew
                    </button>
                 )}
                 {dispatchError && (
                   <div className="mt-3 p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs flex items-start gap-2" role="alert">
                     <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
                     <p className="font-semibold flex-1">{dispatchError}</p>
                   </div>
                 )}
              </div>
           </div>
           
           {/* Map Panel */}
           <div className="lg:col-span-2 border border-border rounded-2xl overflow-hidden bg-surface relative min-h-[400px] isolate z-0">
              <div className="absolute top-4 left-4 z-10 bg-surface text-text-primary px-3 py-2 border border-border rounded-xl pointer-events-none">
                 <span className="font-semibold text-sm flex items-center gap-2">
                    <MapIcon className="w-4 h-4" /> Area map
                 </span>
              </div>
              {centerLat && centerLng ? (
                 <EcoPinMap 
                   reports={reports}
                   centerLat={centerLat}
                   centerLng={centerLng}
                   initialValidationStatus="all"
                   initialStatus="all"
                   hideFilterPanel={true}
                   hideClusters={true} // Only show pins for the reports in this cluster
                   allowedReportIds={reports.map(r => r.id)}
                   photoPins={true}
                 />
              ) : (
                 <div className="w-full h-full flex items-center justify-center text-text-muted text-sm">
                    Location data unavailable
                 </div>
              )}
           </div>
        </div>

         {/* Reports List */}
        <div className="card p-5 border border-border rounded-2xl">
           <div className="flex justify-between items-center gap-4 mb-5 border-b border-border pb-3">
              <h2 className="flex items-center gap-2">
                 <Layers className="w-5 h-5 text-primary" /> Reports in this hotzone
              </h2>
              <button
                onClick={exportPDF}
                disabled={exporting || reports.length === 0}
                className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" /> 
                {exporting ? 'Generating PDF…' : 'Export PDF'}
              </button>
           </div>
           
           {reports.length === 0 ? (
             <div className="text-center py-8 text-text-muted bg-surface-elevated border border-dashed border-border">
                <p>No reports found in this cluster.</p>
             </div>
           ) : (
             <DataTable 
               columns={reportColumns}
               data={reports}
               onRowClick={handleRowClick}
             />
           )}
        </div>

        {/* Evidence Gallery */}
        <EvidenceGallery reports={reports} />
        
        {/* Report Detail Modal */}
        {selectedReport && (
          <ReportDetailModal
            report={selectedReport}
            evidence={reportEvidenceMap[selectedReport.id] || []}
            onClose={() => setSelectedReport(null)}
          />
        )}
      </div>
    </OfficerGuard>
  )
}
