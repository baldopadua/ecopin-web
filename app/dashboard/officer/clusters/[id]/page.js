'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { fetchValidatedReports, fetchClusterById, createCleanupTask } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import { SkeletonLine, SkeletonCard } from '@/components/ui/Skeleton'
import wkx from 'wkx'
import { Buffer } from 'buffer'

// Polyfill Buffer for browser environment
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer
}

const parseClusterCenter = (cluster) => {
  if (cluster.center_lat && cluster.center_lng) {
    return [cluster.center_lat, cluster.center_lng]
  }
  if (cluster.center) {
    try {
      if (typeof cluster.center === 'string' && cluster.center.startsWith('{')) {
        const geoJSON = JSON.parse(cluster.center)
        if (geoJSON.type === 'Point' && geoJSON.coordinates) {
          return [geoJSON.coordinates[1], geoJSON.coordinates[0]]
        }
      } else if (typeof cluster.center === 'string') {
        const buffer = Buffer.from(cluster.center, 'hex')
        const geometry = wkx.Geometry.parse(buffer)
        if (geometry && geometry.x && geometry.y) {
          return [geometry.y, geometry.x]
        }
      }
    } catch (error) {
      console.error('Error parsing cluster center:', error)
    }
  }
  return null
}

const parseLocation = (location, latitude, longitude) => {
  // reports_view has latitude and longitude columns directly
  if (latitude && longitude) {
    return { latitude, longitude }
  }

  if (!location) return { latitude: null, longitude: null }

  try {
    // Handle GeoJSON format from reports_view
    if (typeof location === 'string' && location.startsWith('{')) {
      const geoJSON = JSON.parse(location)
      if (geoJSON.type === 'Point' && geoJSON.coordinates) {
        return { latitude: geoJSON.coordinates[1], longitude: geoJSON.coordinates[0] }
      }
    }
    // Handle hex string format
    else if (typeof location === 'string') {
      const buffer = Buffer.from(location, 'hex')
      const geometry = wkx.Geometry.parse(buffer)
      if (geometry && geometry.x && geometry.y) {
        return { latitude: geometry.y, longitude: geometry.x }
      }
    }
    // Handle Buffer format
    else if (Buffer.isBuffer(location)) {
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
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [creatingTask, setCreatingTask] = useState(false)
  const router = useRouter()
  const params = useParams()
  const clusterId = params.id

  useEffect(() => {
    Promise.all([
      fetchClusterById(clusterId),
      fetchValidatedReports()
    ]).then(([clusterData, reportsData]) => {
      console.log('Cluster data:', clusterData)
      console.log('All reports:', reportsData)
      console.log('Cluster ID from params:', clusterId)

      setCluster(clusterData)
      const clusterReports = reportsData.filter(r => {
        console.log('Report cluster_id:', r.cluster_id, 'type:', typeof r.cluster_id)
        return String(r.cluster_id) === String(clusterId)
      })

      console.log('Filtered reports for cluster:', clusterReports)
      setReports(clusterReports)
      setLoading(false)
    }).catch(error => {
      console.error('Error fetching data:', error)
      setLoading(false)
    })
  }, [clusterId])

  const handleRowClick = (reportId) => {
    router.push(`/dashboard/reports/${reportId}`)
  }

  const handleCreateTask = async () => {
    if (!taskTitle) return
    setCreatingTask(true)
    try {
      const result = await createCleanupTask({
        cluster_id: clusterId,
        title: taskTitle,
        description: taskDescription
      })
      setShowCreateTaskModal(false)
      setTaskTitle('')
      setTaskDescription('')
      router.push(`/dashboard/officer/cleanup-tasks/${result.task.id}`)
    } catch (error) {
      console.error('Failed to create cleanup task:', error)
      alert('Failed to create cleanup task. Please try again.')
    } finally {
      setCreatingTask(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-success/10 text-success border-success/30'
      case 'in_progress':
        return 'bg-warning/10 text-warning border-warning/30'
      case 'waiting_for_feedback':
        return 'bg-info/10 text-info border-info/30'
      case 'closed':
        return 'bg-surface text-text-muted border-border'
      case 'pending_owner_consent':
        return 'bg-warning/10 text-warning border-warning/30'
      default:
        return 'bg-error/10 text-error border-error/30'
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-error/10 text-error border-error/30'
      case 'medium':
        return 'bg-warning/10 text-warning border-warning/30'
      case 'low':
        return 'bg-info/10 text-info border-info/30'
      default:
        return 'bg-surface text-text-muted border-border'
    }
  }

  const getValidationColor = (status) => {
    switch (status) {
      case 'validated':
      case 'automatically_valid':
        return 'bg-success/10 text-success border-success/30'
      case 'pending':
      case 'pending_ai_validation':
        return 'bg-warning/10 text-warning border-warning/30'
      case 'manual_review':
      case 'Manual_Review':
        return 'bg-info/10 text-info border-info/30'
      case 'rejected':
        return 'bg-error/10 text-error border-error/30'
      default:
        return 'bg-surface text-text-muted border-border'
    }
  }

  if (loading) return (
    <div className="p-8">
      <SkeletonCard className="mb-6" />
      <div className="card animate-pulse mb-6">
        <SkeletonLine className="h-6 w-1/4 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 border border-border rounded-lg">
            <SkeletonLine className="h-3 w-1/2 mb-2" />
            <SkeletonLine className="h-8 w-1/3" />
          </div>
          <div className="p-4 border border-border rounded-lg">
            <SkeletonLine className="h-3 w-1/2 mb-2" />
            <SkeletonLine className="h-6 w-1/4" />
          </div>
          <div className="p-4 border border-border rounded-lg">
            <SkeletonLine className="h-3 w-1/2 mb-2" />
            <SkeletonLine className="h-5 w-1/3" />
          </div>
        </div>
        <SkeletonLine className="h-10 w-1/3" />
      </div>
      <div className="card animate-pulse">
        <SkeletonLine className="h-6 w-1/4 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, row) => (
            <div key={row} className="flex gap-4 border-b border-border/50 py-3">
              <SkeletonLine className="h-3 flex-1" />
              <SkeletonLine className="h-3 flex-1" />
              <SkeletonLine className="h-3 flex-1" />
              <SkeletonLine className="h-3 flex-1" />
              <SkeletonLine className="h-3 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
  if (!cluster) return <div className="p-8"><p>Cluster not found</p></div>

  const firstReport = reports.find(r => {
    const loc = parseLocation(r.location, r.latitude, r.longitude);
    return loc.latitude && loc.longitude;
  });

  return (
    <div className="p-8">
      <PageHeader
        title={`Cluster #${cluster.id}`}
        subtitle={`Reports grouped by ${cluster.issue_type || 'similar issue'}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clusters', href: '/dashboard/officer/clusters' },
          { label: `Cluster #${cluster.id}` }
        ]}
      />

      {/* Cluster Summary Card */}
      <div className="card mb-6 no-hover">
        <h2 className="text-xl font-bold text-text-primary mb-4">Cluster Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-text-muted">Total Reports</p>
            <p className="text-2xl font-bold text-text-primary">{reports.length}</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-text-muted">Severity</p>
            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold border ${getSeverityColor(cluster.severity)}`}>
              {cluster.severity?.toUpperCase()}
            </span>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-text-muted">Issue Type</p>
            <p className="text-lg font-semibold text-text-primary">{cluster.issue_type || 'N/A'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateTaskModal(true)}
            className="btn-primary"
          >
            Create Batch Cleanup Task
          </button>
          {firstReport && (() => {
            const loc = parseLocation(firstReport.location, firstReport.latitude, firstReport.longitude);
            return (
              <button
                onClick={() => router.push(`/dashboard/map-view?lat=${loc.latitude}&lng=${loc.longitude}&id=${firstReport.id}&validationStatus=${firstReport.validation_status}&status=${firstReport.status}`)}
                className="btn-secondary"
              >
                View on Map
              </button>
            );
          })()}
        </div>
      </div>

      {/* Reports List */}
      <div className="card no-hover">
        <h2 className="text-xl font-bold text-text-primary mb-4">Reports in this Cluster</h2>
        {reports.length === 0 ? (
          <p className="text-text-muted">No reports found in this cluster</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Title</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Issue Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Validation</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-border cursor-pointer hover:bg-surface transition-colors"
                    onClick={() => handleRowClick(report.id)}
                  >
                    <td className="py-3 px-4">
                      <span className="font-medium text-text-primary">{report.title}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-text-secondary">{report.issue_type || 'N/A'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-text-muted">{new Date(report.created_at).toLocaleDateString()}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(report.status)}`}>
                        {report.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${getValidationColor(report.validation_status)}`}>
                        {report.validation_status === 'validated' ? 'AI VALIDATED' : report.validation_status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-surface dark:bg-surface-elevated rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Create Cleanup Task</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Task Title</label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-green"
                placeholder="e.g., Cleanup Trash in Central Park"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-green"
                rows={3}
                placeholder="Describe the cleanup task..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCreateTaskModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                disabled={creatingTask || !taskTitle}
                className="btn-primary"
              >
                {creatingTask ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
