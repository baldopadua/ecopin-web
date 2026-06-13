'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { fetchValidatedReports, fetchClusterById, createCleanupTask } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import wkx from 'wkx'
import { Buffer } from 'buffer'

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
      router.push(`/dashboard/cleanup-tasks/${result.task.id}`)
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
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-red-100 text-red-800'
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-orange-100 text-orange-800'
      case 'low':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) return <div className="p-8"><p>Loading cluster details...</p></div>
  if (!cluster) return <div className="p-8"><p>Cluster not found</p></div>

  const centerCoords = parseClusterCenter(cluster)

  return (
    <div className="p-8">
      <PageHeader
        title={`Cluster #${cluster.id}`}
        subtitle={`Reports grouped by ${cluster.issue_type || 'similar issue'}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clusters', href: '/dashboard/clusters' },
          { label: `Cluster #${cluster.id}` }
        ]}
      />

      {/* Cluster Summary Card */}
      <div className="card mb-6">
        <div className="flex justify-between items-start">
          <h2 className="text-xl font-bold text-text-primary mb-4">Cluster Summary</h2>
          <button
            onClick={() => setShowCreateTaskModal(true)}
            className="px-4 py-2 bg-accent-green text-white rounded-lg hover:bg-opacity-90 transition-colors"
          >
            Create Batch Cleanup Task
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-text-muted">Total Reports</p>
            <p className="text-2xl font-bold text-text-primary">{cluster.report_count}</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-text-muted">Severity</p>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(cluster.severity)}`}>
              {cluster.severity}
            </span>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-text-muted">Issue Type</p>
            <p className="text-lg font-semibold text-text-primary">{cluster.issue_type || 'N/A'}</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <p className="text-sm text-text-muted">Location</p>
            <p className="text-lg font-semibold text-text-primary">
              {centerCoords
                ? `${centerCoords[0].toFixed(4)}, ${centerCoords[1].toFixed(4)}`
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="card">
        <h2 className="text-xl font-bold text-text-primary mb-4">Reports in this Cluster</h2>
        {reports.length === 0 ? (
          <p className="text-text-muted">No reports found in this cluster</p>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="p-4 border border-border rounded-lg hover:bg-surface cursor-pointer transition-colors"
                onClick={() => handleRowClick(report.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text-primary">{report.title}</h3>
                    <p className="text-text-secondary mt-1 line-clamp-2">{report.description}</p>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm">
                      <span className="text-text-muted">Type: {report.issue_type || 'N/A'}</span>
                      <span className="text-text-muted">
                        Date: {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                      {report.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
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
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                disabled={creatingTask || !taskTitle}
                className="px-4 py-2 bg-accent-green text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
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
