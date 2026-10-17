'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { fetchClusterById, fetchValidatedReports } from '@/lib/api'
import DashboardLayout from '@/components/layout/DashboardLayout'
import RouteInfoHeader from '@/components/ui/RouteInfoHeader'
import TaskListItem from '@/components/ui/TaskListItem'
import StatusBadge from '@/components/ui/StatusBadge'
import { FieldCrewGuard } from '@/components/auth/RequireRole'
import { MapPin, AlertTriangle, Map } from 'lucide-react'
import { reportDiagnostic } from '../../../../../lib/diagnostics.mjs';

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
        reportDiagnostic('error', 'other', 'Failed to load cluster data:', error)
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
  }

  const handleTrackSingle = (reportId) => {
    // TODO: Navigate to map with single task
  }

  return (
    <FieldCrewGuard>
      <DashboardLayout
        title={`Cluster #${clusterId}`}
        subtitle="View cluster details and tasks"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard/field-crew' },
          { label: 'Tasks', href: '/dashboard/field-crew/tasks' },
          { label: `Cluster #${clusterId}` }
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
                          <MapPin size={16} aria-hidden="true" />
                          <span className="flex-1">
                            {report.latitude?.toFixed(5)}, {report.longitude?.toFixed(5)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-text-muted mb-3">
                          <AlertTriangle size={16} aria-hidden="true" />
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
                <Map size={20} aria-hidden="true" />
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
