'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { fetchValidatedReports, fetchClusterById, createCleanupTask, fetchCleanupTasks, updateClusterLabel } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import { SkeletonLine, SkeletonCard } from '@/components/ui/Skeleton'
import DataTable from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import EvidenceGallery from '@/components/ui/EvidenceGallery'
import ExportButton from '@/components/ui/ExportButton'
import { OfficerGuard } from '@/components/auth/RequireRole'
import { Map as MapIcon, ChevronLeft, Target, AlertTriangle, Layers, Pen } from 'lucide-react'
import dynamic from 'next/dynamic'
import wkx from 'wkx'
import { Buffer } from 'buffer'

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
    <div className="w-full h-[400px] bg-surface-elevated animate-pulse border-2 border-border flex items-center justify-center">
      <MapIcon className="w-12 h-12 text-text-muted opacity-50" />
    </div>
  )
})

const parseLocation = (location, latitude, longitude) => {
  if (latitude && longitude) return { latitude, longitude }
  if (!location) return { latitude: null, longitude: null }

  try {
    if (typeof location === 'string' && location.startsWith('{')) {
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
    console.error('Error parsing location:', error)
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
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editingTitle, setEditingTitle] = useState('')
  const [savingTitle, setSavingTitle] = useState(false)
  
  const router = useRouter()
  const params = useParams()
  const clusterId = params.id

  useEffect(() => {
    Promise.all([
      fetchClusterById(clusterId),
      fetchValidatedReports(),
      fetchCleanupTasks()
    ]).then(([clusterData, reportsData, tasksData]) => {
      setCluster(clusterData)
      const clusterReports = reportsData.filter(r => String(r.cluster_id) === String(clusterId))
      setReports(clusterReports)

      const clusterTask = tasksData.find(task => String(task.cluster_id) === String(clusterId))
      if (clusterTask) {
        setExistingTask(clusterTask)
      }
      setLoadingTasks(false)
      setLoading(false)
    }).catch(error => {
      console.error('Error fetching data:', error)
      setLoading(false)
      setLoadingTasks(false)
    })
  }, [clusterId])

  const handleRowClick = (report) => {
    router.push(`/dashboard/raw-data/${report.id}`)
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
      console.error('Failed to update label:', error)
      setError('Failed to update title. Please try again.')
    } finally {
      setSavingTitle(false)
    }
  }
  
  const handleDispatch = () => {
     if (existingTask) {
        router.push(`/dashboard/officer/operations/${existingTask.id}`)
     } else {
        router.push(`/dashboard/officer/operations/create?preselect=${clusterId}`)
     }
  }

  if (loading) return (
    <div className="p-8">
      <SkeletonCard className="mb-6" />
      <div className="card animate-pulse mb-6">
        <SkeletonLine className="h-6 w-1/4 mb-4" />
        <SkeletonLine className="h-64 w-full mb-4" />
      </div>
    </div>
  )

  if (!cluster) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[50vh]">
       <AlertTriangle className="w-16 h-16 text-error mb-4 opacity-50" />
       <h2 className="text-2xl font-bold uppercase tracking-widest">Cluster Not Found</h2>
       <button onClick={() => router.push('/dashboard/officer/hotzone-intel')} className="mt-4 btn-secondary flex items-center gap-2">
          <ChevronLeft className="w-4 h-4" /> Back to Intel
       </button>
    </div>
  )

  const centerLat = cluster.center_lat || (reports[0] ? parseLocation(reports[0].location, reports[0].latitude, reports[0].longitude).latitude : null)
  const centerLng = cluster.center_lng || (reports[0] ? parseLocation(reports[0].location, reports[0].latitude, reports[0].longitude).longitude : null)

  const reportColumns = [
    { key: 'title', label: 'Title', width: '30%', render: v => <span className="font-bold">{v}</span> },
    { key: 'issue_type', label: 'Type', width: '20%' },
    { key: 'created_at', label: 'Date', width: '15%', render: v => new Date(v).toLocaleDateString() },
    { key: 'status', label: 'Status', width: '20%', render: v => <StatusBadge status={v} /> },
  ]

  return (
    <OfficerGuard>
      <div className="p-8">
        


        <PageHeader
          title={
            isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={editingTitle} 
                  onChange={(e) => setEditingTitle(e.target.value)} 
                  className="px-2 py-1 text-2xl font-bold border-2 border-[#2563eb] focus:outline-none w-64 bg-surface-elevated text-text-primary"
                  disabled={savingTitle}
                  autoFocus
                />
                <button 
                  onClick={handleSaveTitle}
                  disabled={savingTitle}
                  className="px-3 py-1 text-sm font-bold uppercase tracking-widest bg-accent-green text-white border-2 border-accent-green hover:bg-black hover:border-black transition-colors"
                >
                  {savingTitle ? 'Saving...' : 'Save'}
                </button>
                <button 
                  onClick={() => setIsEditingTitle(false)}
                  disabled={savingTitle}
                  className="px-3 py-1 text-sm font-bold uppercase tracking-widest text-text-muted hover:text-black dark:hover:text-white transition-colors"
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
                  className="text-text-muted hover:text-primary transition-colors p-1"
                  title="Rename Cluster"
                >
                  <Pen className="w-5 h-5" />
                </button>
              </div>
            )
          }
          subtitle={`Severity Score: ${Math.round(cluster.severity_score || 0)}`}
          breadcrumbs={[
            { label: 'Intel', href: '/dashboard/officer/hotzone-intel' },
            { label: `Cluster ${cluster.id.slice(0,8)}` }
          ]}
        >
          <button 
             onClick={() => router.push('/dashboard/officer/hotzone-intel')}
             className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-text-secondary hover:text-primary transition-colors mt-2"
          >
             <ChevronLeft className="w-4 h-4" /> Back to Intel
          </button>
        </PageHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
           
           {/* Details Panel */}
           <div className="card p-6 border-2 border-border rounded-none bg-surface-elevated text-text-primary lg:col-span-1 flex flex-col">
              <h2 className="text-xl font-black uppercase tracking-tighter mb-6 flex items-center gap-2 border-b-2 border-border pb-3">
                 <Target className="w-5 h-5 text-accent-green" /> Target Profile
              </h2>
              
              <div className="space-y-6 flex-1">
                 <div>
                    <span className="text-[10px] font-mono uppercase text-text-muted block mb-1">Severity</span>
                    <div className="text-3xl font-black text-error">{Math.round(cluster.severity_score || 0)}</div>
                 </div>
                 
                 <div>
                    <span className="text-[10px] font-mono uppercase text-text-muted block mb-1">Composition</span>
                    <div className="flex items-center gap-4">
                       <div>
                         <span className="text-2xl font-bold block">{reports.length}</span>
                         <span className="text-xs text-text-secondary">Reports</span>
                       </div>
                       <div className="h-8 w-px bg-border"></div>
                       <div>
                         <span className="text-2xl font-bold block">{Math.round(cluster.radius_meters || 50)}m</span>
                         <span className="text-xs text-text-secondary">Radius</span>
                       </div>
                    </div>
                 </div>
                 
                 {cluster.issue_type && (
                   <div>
                      <span className="text-[10px] font-mono uppercase text-text-muted block mb-1">Primary Signature</span>
                      <div className="text-lg font-bold">{normalizeString(cluster.issue_type)}</div>
                   </div>
                 )}
              </div>
              
              <div className="pt-6 border-t-2 border-border mt-6">
                 {loadingTasks ? (
                    <button disabled className="btn-primary w-full opacity-50">Loading...</button>
                 ) : (
                    <button 
                      onClick={handleDispatch}
                      className="w-full bg-accent-green text-white font-black uppercase tracking-widest py-3 hover:bg-surface-elevated hover:text-text-primary transition-colors border-2 border-accent-green hover:border-text-primary"
                    >
                      {existingTask ? 'View Dispatched Task' : 'Dispatch Field Crew'}
                    </button>
                 )}
              </div>
           </div>
           
           {/* Map Panel */}
           <div className="lg:col-span-2 border-2 border-border bg-surface-elevated relative min-h-[400px]">
              <div className="absolute top-4 left-4 z-[400] bg-surface-elevated text-text-primary px-3 py-1.5 border-2 border-border pointer-events-none">
                 <span className="font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                    <MapIcon className="w-3 h-3" /> Area View
                 </span>
              </div>
              {centerLat && centerLng ? (
                 <EcoPinMap 
                   centerLat={centerLat}
                   centerLng={centerLng}
                   hideFilterPanel={true}
                   hideClusters={true} // Only show pins for the reports in this cluster
                   allowedReportIds={reports.map(r => r.id)}
                 />
              ) : (
                 <div className="w-full h-full flex items-center justify-center text-text-muted font-mono text-sm uppercase">
                    Location data unavailable
                 </div>
              )}
           </div>
        </div>

        {/* Reports List */}
        <div className="card p-6 border-2 border-border rounded-none">
           <div className="flex justify-between items-center mb-6 border-b-2 border-border pb-3">
              <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                 <Layers className="w-5 h-5 text-accent-green" /> Constituent Reports
              </h2>
              <ExportButton data={reports} filename={`cluster-${cluster.id}-reports.csv`} />
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
        
      </div>
    </OfficerGuard>
  )
}
