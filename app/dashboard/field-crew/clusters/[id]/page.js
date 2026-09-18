'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { fetchClusterById, fetchValidatedReports } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import RouteInfoHeader from '@/components/ui/RouteInfoHeader'
import TaskListItem from '@/components/ui/TaskListItem'
import StatusBadge from '@/components/ui/StatusBadge'
import { FieldCrewGuard } from '@/components/auth/RequireRole'

export default function FieldCrewClusterDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clusterId = params.id
  const [cluster, setCluster] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [clusterData, reportsData] = await Promise.all([
          fetchClusterById(clusterId),
          fetchValidatedReports()
        ])
        
        setCluster(clusterData)
        
        // Filter reports for this cluster
        const clusterReports = reportsData.filter(r => 
          String(r.cluster_id) === String(clusterId)
        )
        setReports(clusterReports)
      } catch (error) {
        console.error('Failed to load cluster data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [clusterId])

  const handleBack = () => {
    router.push('/dashboard/field-crew/tasks')
  }

  const handleTrackAll = () => {
    // TODO: Navigate to map with all tasks
    console.log('Track all tasks on map')
  }

  const handleTrackSingle = (reportId) => {
    // TODO: Navigate to map with single task
    console.log('Track single task:', reportId)
  }

  return (
    <FieldCrewGuard>
      <DashboardLayout
        title={`Cluster #${clusterId}`}
        subtitle="View cluster details and tasks"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard/field-crew' },
          { label: 'Tasks', href: '/dashboard/field-crew/tasks' },
          { label: `Cluster #${clusterId}`, href: `/dashboard/field-crew/clusters/${clusterId}` }
        ]}
        loading={loading}
      >
        {loading ? (
          <div className="space-y-4">
            <div className="card animate-pulse h-32" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card animate-pulse h-24" />
              ))}
            </div>
          </div>
        ) : cluster ? (
          <div className="space-y-4">
            {/* Route Info Header */}
            <RouteInfoHeader 
              eta="2h 30m"
              weather="28°C - Sunny"
              traffic="Light"
            />

            {/* Tasks Section */}
            <div className="card no-hover">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-text-primary">
                  Tasks ({reports.length})
                </h2>
              </div>
              
              {reports.length === 0 ? (
                <div className="text-center py-10 text-text-muted">
                  <p className="text-lg mb-1">No tasks in this cluster</p>
                  <p className="text-sm">This cluster has no associated reports.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report, index) => (
                    <div key={report.id} className="card hover:shadow-lg transition-shadow cursor-pointer">
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-text-primary text-base leading-tight flex-1 mr-2">
                            {report.title || `Report ${index + 1}`}
                          </h3>
                          <StatusBadge status={report.status} type="report" />
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="flex-1">
                            {report.latitude?.toFixed(5)}, {report.longitude?.toFixed(5)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-text-muted mb-3">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>Issue: {report.issue_type || 'General'}</span>
                        </div>

                        <button
                          onClick={() => handleTrackSingle(report.id)}
                          className="btn-secondary w-full text-sm"
                        >
                          Track Single Task
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Track All Button */}
            <div className="flex justify-end mt-6">
              <button
                onClick={handleTrackAll}
                className="btn-primary flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span>Track All Tasks on Map</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-text-muted">
            <p className="text-lg mb-1">Cluster not found</p>
            <p className="text-sm">The cluster you're looking for doesn't exist.</p>
          </div>
        )}
      </DashboardLayout>
    </FieldCrewGuard>
  )
}
