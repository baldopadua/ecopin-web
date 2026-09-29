'use client'
import { Suspense, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { fetchValidatedReports, fetchCleanupTasks } from '@/lib/api'
import { OfficerGuard } from '@/components/auth/RequireRole'
import StatusBadge from '@/components/ui/StatusBadge'
import Pagination from '@/components/ui/Pagination'
import { Map, Target as TargetIcon } from 'lucide-react'

const EcoPinMap = dynamic(
  () => import('@/components/map/EcoPinMap'),
  { ssr: false, loading: () => <div className="h-full w-full bg-surface-elevated animate-pulse" /> }
)
const CrewTaskLayer = dynamic(
  () => import('@/components/map/CrewTaskLayer'),
  { ssr: false }
)

function OfficerMapContent() {
  const router = useRouter()
  const [reports, setReports] = useState([])
  const [tasks, setTasks] = useState([])
  
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  
  const [showPins, setShowPins] = useState(true)
  const [showClusters, setShowClusters] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showTaskPins, setShowTaskPins] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchValidatedReports(),
      fetchCleanupTasks()
    ]).then(([reportsData, tasksData]) => {
      setReports(reportsData)
      setTasks(tasksData)
    })
  }, [])

  const issueTypes = [...new Set(reports.map(r => r.issue_type).filter(Boolean))]

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden bg-background relative">
      {/* Side Panel Toggle (When Closed) */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute right-4 top-4 z-[1000] bg-surface-elevated border-2 border-border p-2 shadow-lg hover:bg-accent-green hover:text-black transition-colors"
          title="Open Map Controls"
        >
          <Map className="w-5 h-5" />
        </button>
      )}

      {/* Map Area */}
      <div className="flex-1 relative z-0 flex flex-col h-[50vh] md:h-full">
        <EcoPinMap 
          hideFilterPanel={true}
          externalStatusFilter={statusFilter}
          externalIssueTypeFilter={typeFilter}
          externalShowPins={showPins}
          externalShowClusters={showClusters}
          externalShowHeatmap={showHeatmap}
        >
          {/* Active crew tasks overlay */}
          {showTaskPins && (
            <CrewTaskLayer tasks={tasks.filter(t => t.status !== 'completed')} />
          )}
        </EcoPinMap>
      </div>

      {/* Side Panel */}
      {isSidebarOpen && (
        <div className="w-full md:w-[350px] border-t-2 md:border-t-0 md:border-l-2 border-[#1a1a1a] dark:border-[#333333] bg-surface flex flex-col h-[50vh] md:h-full z-10 overflow-y-auto custom-scrollbar">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-mono text-sm font-bold tracking-widest uppercase text-text-secondary flex items-center gap-2">
                <Map className="w-4 h-4" />
                Tactical Controls
              </h2>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="text-text-muted hover:text-error transition-colors font-black text-sm"
                title="Hide Controls"
              >
                [ X ]
              </button>
            </div>
            
            <div className="space-y-6">
            {/* Map Layers */}
            <div>
              <h3 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Map Layers</h3>
              <div className="space-y-3">
                {[
                  { label: 'Report Pins', state: showPins, set: setShowPins },
                  { label: 'Report Clusters', state: showClusters, set: setShowClusters },
                  { label: 'Heatmap', state: showHeatmap, set: setShowHeatmap },
                  { label: 'Cleanup Task Pins', state: showTaskPins, set: setShowTaskPins },
                ].map(layer => (
                  <label key={layer.label} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={layer.state} onChange={(e) => layer.set(e.target.checked)} className="sr-only" />
                    <div className={`w-5 h-5 border-2 flex items-center justify-center transition-colors ${layer.state ? 'bg-accent-green border-accent-green' : 'border-border bg-surface-elevated hover:border-accent-green/50'}`}>
                      {layer.state && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-bold uppercase tracking-wider">{layer.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="h-px bg-border/50 w-full" />

            {/* Data Filters */}
            <div>
              <h3 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Data Filters</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-text-muted mb-1">STATUS</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full bg-surface-elevated border-2 border-border text-sm font-bold uppercase tracking-wider p-2 outline-none focus:border-accent-green"
                  >
                    <option value="all">ALL</option>
                    <option value="unresolved">UNRESOLVED</option>
                    <option value="in_progress">IN PROGRESS</option>
                    <option value="resolved">RESOLVED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-text-muted mb-1">POLLUTION TYPE</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full bg-surface-elevated border-2 border-border text-sm font-bold uppercase tracking-wider p-2 outline-none focus:border-accent-green"
                  >
                    <option value="all">ALL</option>
                    {issueTypes.map(type => (
                      <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
          </div>
        </div>
        </div>
      )}
    </div>
  )
}

export default function OfficerMapGridPage() {
  return (
    <OfficerGuard>
      <Suspense fallback={<div className="h-screen w-full bg-background animate-pulse" />}>
        <OfficerMapContent />
      </Suspense>
    </OfficerGuard>
  )
}
