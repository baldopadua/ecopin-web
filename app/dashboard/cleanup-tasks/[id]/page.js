'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { fetchCleanupTaskById, uploadCleanupPhoto, markCleanupTaskComplete, fetchReportsByClusterId, batchCompleteReportsByCluster, updateReportStatus } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import Notification from '@/components/ui/Notification'

export default function CleanupTaskDetailPage() {
  const [task, setTask] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadingBefore, setUploadingBefore] = useState(false)
  const [uploadingAfter, setUploadingAfter] = useState(false)
  const [markingComplete, setMarkingComplete] = useState(false)
  const [completingReportId, setCompletingReportId] = useState(null)
  const [notification, setNotification] = useState(null)
  const router = useRouter()
  const params = useParams()
  const taskId = params.id

  useEffect(() => {
    const loadTask = async () => {
      try {
        const data = await fetchCleanupTaskById(taskId)
        setTask(data)

        // Fetch reports in the cluster
        if (data.cluster_id) {
          const reportsData = await fetchReportsByClusterId(data.cluster_id)
          setReports(reportsData)
        }
      } catch (error) {
        console.error('Failed to load cleanup task:', error)
      } finally {
        setLoading(false)
      }
    }
    loadTask()
  }, [taskId])

  const handleFileUpload = async (photoType, file) => {
    if (!file) return

    const setUpdating = photoType === 'before' ? setUploadingBefore : setUploadingAfter
    setUpdating(true)

    try {
      const result = await uploadCleanupPhoto(taskId, photoType, file)
      setTask(result.task)
      setNotification({ message: 'Photo uploaded successfully!', type: 'success' })
    } catch (error) {
      console.error('Failed to upload photo:', error)
      setNotification({ message: 'Failed to upload photo. Please try again.', type: 'error' })
    } finally {
      setUpdating(false)
    }
  }

  const handleMarkComplete = async () => {
    if (!task.before_photo_url || !task.after_photo_url) {
      setNotification({ message: 'Please upload both before and after photos before marking the task as complete.', type: 'warning' })
      return
    }

    // Check if all reports in the cluster are resolved
    if (reports.length > 0) {
      const unresolvedReports = reports.filter(r => r.status !== 'resolved')
      if (unresolvedReports.length > 0) {
        setNotification({ message: `Please mark all ${unresolvedReports.length} unresolved report(s) as complete before marking the task as complete.`, type: 'warning' })
        return
      }
    }

    setMarkingComplete(true)
    try {
      await markCleanupTaskComplete(taskId)
      const updatedTask = await fetchCleanupTaskById(taskId)
      setTask(updatedTask)

      // Refresh reports to show updated status
      if (task.cluster_id) {
        const reportsData = await fetchReportsByClusterId(task.cluster_id)
        setReports(reportsData)
      }

      setNotification({ message: 'Cleanup task marked as complete successfully!', type: 'success' })
    } catch (error) {
      console.error('Failed to mark task complete:', error)
      setNotification({ message: 'Failed to mark task complete. Please try again.', type: 'error' })
    } finally {
      setMarkingComplete(false)
    }
  }

  const handleMarkReportComplete = async (reportId) => {
    setCompletingReportId(reportId)
    try {
      await updateReportStatus(reportId, 'resolved')
      // Refresh reports to show updated status
      if (task.cluster_id) {
        const reportsData = await fetchReportsByClusterId(task.cluster_id)
        setReports(reportsData)
      }
      setNotification({ message: 'Report marked as complete!', type: 'success' })
    } catch (error) {
      console.error('Failed to mark report complete:', error)
      setNotification({ message: 'Failed to mark report complete. Please try again.', type: 'error' })
    } finally {
      setCompletingReportId(null)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      default:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    }
  }

  const getReportCardColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'border-green-500/30 bg-green-500/10 dark:border-green-500/30 dark:bg-green-500/10'
      case 'in_progress':
        return 'border-yellow-500/30 bg-yellow-500/10 dark:border-yellow-500/30 dark:bg-yellow-500/10'
      default:
        return 'border-border bg-surface-elevated dark:bg-surface-elevated'
    }
  }

  if (loading) return <div className="p-8"><p>Loading cleanup task...</p></div>
  if (!task) return <div className="p-8"><p>Cleanup task not found</p></div>

  return (
    <div className="p-8">
      <PageHeader 
        title={`Cleanup Task #${task.id}`}
        subtitle={task.title}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Cleanup Tasks', href: '/dashboard/cleanup-tasks' },
          { label: `Task #${task.id}` }
        ]}
      />

      {/* Task Details */}
      <div className="card mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary">{task.title}</h2>
            <p className="text-text-muted mt-2">{task.description}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
            {task.status}
          </span>
        </div>

        {/* Reports in Cluster */}
        {reports.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">Reports in this Cluster ({reports.length})</h3>
              <span className="text-sm text-text-muted">
                {reports.filter(r => r.status === 'resolved').length} / {reports.length} completed
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
              <div
                className="bg-accent-green h-2.5 rounded-full transition-all"
                style={{ width: `${(reports.filter(r => r.status === 'resolved').length / reports.length) * 100}%` }}
              ></div>
            </div>
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className={`p-4 border rounded-lg ${getReportCardColor(report.status)}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex-1 cursor-pointer" onClick={() => router.push(`/dashboard/reports/${report.id}`)}>
                      <p className="font-medium text-text-primary">{report.title}</p>
                      <p className="text-sm text-text-muted mt-1">{report.description}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs px-2 py-1 bg-surface-elevated rounded">{report.issue_type}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                          {report.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    {report.status !== 'resolved' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMarkReportComplete(report.id)
                        }}
                        disabled={completingReportId === report.id}
                        className="ml-4 px-3 py-1 bg-accent-green text-white text-sm rounded hover:bg-opacity-90 disabled:opacity-50"
                      >
                        {completingReportId === report.id ? 'Completing...' : 'Mark Complete'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="p-4 border border-border rounded-lg">
            <h3 className="font-semibold mb-3">Before Photo</h3>
            {task.before_photo_url ? (
              <div>
                <img src={task.before_photo_url} alt="Before cleanup" className="w-full h-48 object-cover rounded-lg" />
              </div>
            ) : (
              <div>
                <label className="block mb-2">Upload Before Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingBefore}
                  onChange={(e) => e.target.files[0] && handleFileUpload('before', e.target.files[0])}
                  className="w-full"
                />
                {uploadingBefore && <p className="mt-2 text-sm text-text-muted">Uploading...</p>}
              </div>
            )}
          </div>

          <div className="p-4 border border-border rounded-lg">
            <h3 className="font-semibold mb-3">After Photo</h3>
            {task.after_photo_url ? (
              <div>
                <img src={task.after_photo_url} alt="After cleanup" className="w-full h-48 object-cover rounded-lg" />
              </div>
            ) : (
              <div>
                <label className="block mb-2">Upload After Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingAfter}
                  onChange={(e) => e.target.files[0] && handleFileUpload('after', e.target.files[0])}
                  className="w-full"
                />
                {uploadingAfter && <p className="mt-2 text-sm text-text-muted">Uploading...</p>}
              </div>
            )}
          </div>
        </div>

        {task.status !== 'completed' && (
          <div className="mt-6">
            <button
              onClick={handleMarkComplete}
              disabled={markingComplete || !task.before_photo_url || !task.after_photo_url}
              className="px-6 py-3 bg-accent-green text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
            >
              {markingComplete ? 'Marking Complete...' : 'Mark Task as Complete'}
            </button>
          </div>
        )}
      </div>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  )
}
