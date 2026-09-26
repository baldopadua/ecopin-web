'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { fetchValidatedReports, fetchClusterById, createCleanupTask, fetchCleanupTasks } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import { SkeletonLine, SkeletonCard } from '@/components/ui/Skeleton'
import DataTable from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import EvidenceGallery from '@/components/ui/EvidenceGallery'
import ExportButton from '@/components/ui/ExportButton'
import { OfficerGuard } from '@/components/auth/RequireRole'
import { Map as MapIcon, ChevronLeft, Target, AlertTriangle, Layers } from 'lucide-react'
import dynamic from 'next/dynamic'
import wkx from 'wkx'
import { Buffer } from 'buffer'

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
      <div className="p-8 max-w-7xl mx-auto">
        
        <button 
           onClick={() => router.push('/dashboard/officer/hotzone-intel')}
           className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-text-secondary hover:text-primary transition-colors"
        >
           <ChevronLeft className="w-4 h-4" /> Back to Intel
        </button>

        <PageHeader
          title={cluster.label || `Cluster #${cluster.id.slice(0,8)}`}
          subtitle={`Severity Score: ${Math.round(cluster.severity_score || 0)}`}
          breadcrumbs={[
            { label: 'Intel', href: '/dashboard/officer/hotzone-intel' },
            { label: `Cluster ${cluster.id.slice(0,8)}` }
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
           
           {/* Details Panel */}
           <div className="card p-6 border-2 border-[#1a1a1a] dark:border-[#333333] rounded-none bg-black text-white lg:col-span-1 flex flex-col">
              <h2 className="text-xl font-black uppercase tracking-tighter mb-6 flex items-center gap-2 border-b-2 border-white/20 pb-3">
                 <Target className="w-5 h-5 text-accent-green" /> Target Profile
              </h2>
              
              <div className="space-y-6 flex-1">
                 <div>
                    <span className="text-[10px] font-mono uppercase text-white/50 block mb-1">Severity</span>
                    <div className="text-3xl font-black text-error">{Math.round(cluster.severity_score || 0)}</div>
                 </div>
                 
                 <div>
                    <span className="text-[10px] font-mono uppercase text-white/50 block mb-1">Composition</span>
                    <div className="flex items-center gap-4">
                       <div>
                         <span className="text-2xl font-bold block">{reports.length}</span>
                         <span className="text-xs text-white/70">Reports</span>
                       </div>
                       <div className="h-8 w-px bg-white/20"></div>
                       <div>
                         <span className="text-2xl font-bold block">{Math.round(cluster.radius_meters || 50)}m</span>
                         <span className="text-xs text-white/70">Radius</span>
                       </div>
                    </div>
                 </div>
                 
                 {cluster.issue_type && (
                   <div>
                      <span className="text-[10px] font-mono uppercase text-white/50 block mb-1">Primary Signature</span>
                      <div className="text-lg font-bold">{cluster.issue_type}</div>
                   </div>
                 )}
              </div>
              
              <div className="pt-6 border-t-2 border-white/20 mt-6">
                 {loadingTasks ? (
                    <button disabled className="btn-primary w-full opacity-50">Loading...</button>
                 ) : (
                    <button 
                      onClick={handleDispatch}
                      className="w-full bg-accent-green text-black font-black uppercase tracking-widest py-3 hover:bg-white transition-colors border-2 border-accent-green hover:border-white"
                    >
                      {existingTask ? 'View Dispatched Task' : 'Dispatch Field Crew'}
                    </button>
                 )}
              </div>
           </div>
           
           {/* Map Panel */}
           <div className="lg:col-span-2 border-2 border-[#1a1a1a] dark:border-[#333333] bg-surface-elevated relative min-h-[400px]">
              <div className="absolute top-4 left-4 z-[400] bg-black text-white px-3 py-1.5 border-2 border-white/20 pointer-events-none">
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
