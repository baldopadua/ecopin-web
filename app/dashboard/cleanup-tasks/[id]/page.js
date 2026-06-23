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
  const [markingComplete, setMarkingComplete] = useState(false)
  const [completingReportId, setCompletingReportId] = useState(null)
  const [notification, setNotification] = useState(null)
  const [expandedReports, setExpandedReports] = useState({})
  const [uploadingReportPhotos, setUploadingReportPhotos] = useState({})
  const [lightboxImage, setLightboxImage] = useState(null)
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

  const handleMarkComplete = async () => {
    // Check if there are both before and after photos
    const hasBeforePhotos = task.before_photo_url || reports.some(r => r.before_photo_url)
    const hasAfterPhotos = task.after_photo_url || reports.some(r => r.after_photo_url)

    if (!hasBeforePhotos || !hasAfterPhotos) {
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
    const report = reports.find(r => r.id === reportId)
    
    // Check if the report has both before and after photos
    if (!report.before_photo_url || !report.after_photo_url) {
      setNotification({ message: 'Please upload both before and after photos for this report before marking it as complete.', type: 'warning' })
      return
    }

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

  const toggleReportExpansion = (reportId) => {
    setExpandedReports(prev => ({
      ...prev,
      [reportId]: !prev[reportId]
    }))
  }

  const handleReportPhotoUpload = async (reportId, photoType, file) => {
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setNotification({ message: 'Invalid file type. Please upload JPEG, JPG, PNG, or WEBP images.', type: 'error' })
      return
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      setNotification({ message: 'File size exceeds 10MB limit. Please upload a smaller image.', type: 'error' })
      return
    }

    setUploadingReportPhotos(prev => ({
      ...prev,
      [`${reportId}-${photoType}`]: true
    }))

    const token = localStorage.getItem('authToken')
    const formData = new FormData()
    formData.append('image', file)
    formData.append('photo_type', photoType)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/reports/${reportId}/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Failed to upload photo')
      }

      const data = await response.json()
      // Refresh reports to show updated photos
      if (task.cluster_id) {
        const reportsData = await fetchReportsByClusterId(task.cluster_id)
        setReports(reportsData)
      }
      setNotification({ message: 'Photo uploaded successfully', type: 'success' })
    } catch (error) {
      console.error('Failed to upload photo:', error)
      setNotification({ message: error.message || 'Failed to upload photo. Please try again.', type: 'error' })
    } finally {
      setUploadingReportPhotos(prev => ({
        ...prev,
        [`${reportId}-${photoType}`]: false
      }))
    }
  }

  const handleReportPhotoDelete = async (reportId, photoType) => {
    if (!confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
      return
    }

    const token = localStorage.getItem('authToken')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/reports/${reportId}/photo`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photo_type: photoType }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Failed to delete photo')
      }

      const data = await response.json()
      // Refresh reports to show updated photos
      if (task.cluster_id) {
        const reportsData = await fetchReportsByClusterId(task.cluster_id)
        setReports(reportsData)
      }
      setNotification({ message: 'Photo deleted successfully', type: 'success' })
    } catch (error) {
      console.error('Failed to delete photo:', error)
      setNotification({ message: error.message || 'Failed to delete photo. Please try again.', type: 'error' })
    }
  }

  const getPhotosByType = (type) => {
    const photos = []
    if (type === 'before' && task.before_photo_url) {
      photos.push({ url: task.before_photo_url, label: 'Task Before' })
    }
    if (type === 'after' && task.after_photo_url) {
      photos.push({ url: task.after_photo_url, label: 'Task After' })
    }
    reports.forEach(report => {
      if (type === 'before' && report.before_photo_url) {
        photos.push({ url: report.before_photo_url, label: `Report ${report.id} Before` })
      }
      if (type === 'after' && report.after_photo_url) {
        photos.push({ url: report.after_photo_url, label: `Report ${report.id} After` })
      }
    })
    return photos
  }

  const handleNextPhoto = () => {
    if (!lightboxImage) return
    const photos = getPhotosByType(lightboxImage.type)
    const nextIndex = (lightboxImage.index + 1) % photos.length
    setLightboxImage({ ...lightboxImage, url: photos[nextIndex].url, index: nextIndex })
  }

  const handlePreviousPhoto = () => {
    if (!lightboxImage) return
    const photos = getPhotosByType(lightboxImage.type)
    const prevIndex = (lightboxImage.index - 1 + photos.length) % photos.length
    setLightboxImage({ ...lightboxImage, url: photos[prevIndex].url, index: prevIndex })
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
                <div key={report.id} className={`border rounded-lg ${getReportCardColor(report.status)}`}>
                  <div className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex-1 cursor-pointer" onClick={() => toggleReportExpansion(report.id)}>
                        <p className="font-medium text-text-primary">{report.title}</p>
                        <p className="text-sm text-text-muted mt-1">{report.description}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-1 bg-surface-elevated rounded">{report.issue_type}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                            {report.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleReportExpansion(report.id)}
                          className="p-2 hover:bg-surface-elevated rounded transition-colors"
                        >
                          <svg
                            className={`w-5 h-5 text-text-muted transition-transform ${expandedReports[report.id] ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {report.status !== 'resolved' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkReportComplete(report.id)
                            }}
                            disabled={completingReportId === report.id}
                            className="px-3 py-1 bg-accent-green text-white text-sm rounded hover:bg-opacity-90 disabled:opacity-50"
                          >
                            {completingReportId === report.id ? 'Completing...' : 'Mark Complete'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedReports[report.id] && (
                    <div className="p-4 border-t border-border">
                      <h4 className="font-semibold mb-3">Before & After Photos</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border border-border rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <h5 className="font-medium">Before Photo</h5>
                            {report.before_photo_url && (
                              <button
                                onClick={() => handleReportPhotoDelete(report.id, 'before')}
                                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                          {report.before_photo_url ? (
                            <img src={report.before_photo_url} alt="Before" className="w-full h-48 object-cover rounded-lg" />
                          ) : (
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingReportPhotos[`${report.id}-before`]}
                              onChange={(e) => e.target.files[0] && handleReportPhotoUpload(report.id, 'before', e.target.files[0])}
                              className="w-full"
                            />
                          )}
                          {uploadingReportPhotos[`${report.id}-before`] && <p className="mt-2 text-sm text-text-muted">Uploading...</p>}
                        </div>

                        <div className="p-4 border border-border rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <h5 className="font-medium">After Photo</h5>
                            {report.after_photo_url && (
                              <button
                                onClick={() => handleReportPhotoDelete(report.id, 'after')}
                                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                          {report.after_photo_url ? (
                            <img src={report.after_photo_url} alt="After" className="w-full h-48 object-cover rounded-lg" />
                          ) : (
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingReportPhotos[`${report.id}-after`]}
                              onChange={(e) => e.target.files[0] && handleReportPhotoUpload(report.id, 'after', e.target.files[0])}
                              className="w-full"
                            />
                          )}
                          {uploadingReportPhotos[`${report.id}-after`] && <p className="mt-2 text-sm text-text-muted">Uploading...</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cleanup Task Photo Gallery */}
        <div className="mt-6">
          <h3 className="font-semibold mb-3">Cleanup Task Photo Gallery</h3>
          
          {/* Before Photos Section */}
          <div className="mb-6">
            <h4 className="font-medium mb-2 text-text-muted">Before Photos</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {task.before_photo_url && (
                <div className="relative cursor-pointer" onClick={() => setLightboxImage({ url: task.before_photo_url, type: 'before', index: 0 })}>
                  <img src={task.before_photo_url} alt="Before cleanup" className="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity" />
                  <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">Task Before</span>
                </div>
              )}
              {reports.filter(r => r.before_photo_url).map((report, idx) => (
                <div 
                  key={`${report.id}-before`} 
                  className="relative cursor-pointer"
                  onClick={() => setLightboxImage({ url: report.before_photo_url, type: 'before', index: (task.before_photo_url ? 1 : 0) + idx })}
                >
                  <img src={report.before_photo_url} alt={`Report ${report.id} Before`} className="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity" />
                  <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">Report {report.id} Before</span>
                </div>
              ))}
            </div>
            {(!task.before_photo_url && !reports.some(r => r.before_photo_url)) && (
              <p className="text-text-muted text-sm">No before photos uploaded yet</p>
            )}
          </div>

          {/* After Photos Section */}
          <div>
            <h4 className="font-medium mb-2 text-text-muted">After Photos</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {task.after_photo_url && (
                <div className="relative cursor-pointer" onClick={() => setLightboxImage({ url: task.after_photo_url, type: 'after', index: 0 })}>
                  <img src={task.after_photo_url} alt="After cleanup" className="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity" />
                  <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">Task After</span>
                </div>
              )}
              {reports.filter(r => r.after_photo_url).map((report, idx) => (
                <div 
                  key={`${report.id}-after`} 
                  className="relative cursor-pointer"
                  onClick={() => setLightboxImage({ url: report.after_photo_url, type: 'after', index: (task.after_photo_url ? 1 : 0) + idx })}
                >
                  <img src={report.after_photo_url} alt={`Report ${report.id} After`} className="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity" />
                  <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">Report {report.id} After</span>
                </div>
              ))}
            </div>
            {(!task.after_photo_url && !reports.some(r => r.after_photo_url)) && (
              <p className="text-text-muted text-sm">No after photos uploaded yet</p>
            )}
          </div>
        </div>

        {task.status !== 'completed' && (
          <div className="mt-6">
            <button
              onClick={handleMarkComplete}
              disabled={markingComplete}
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

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50" onClick={() => setLightboxImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full p-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 z-10"
            >
              ×
            </button>
            <img src={lightboxImage.url} alt="Full view" className="w-full h-full object-contain" />
            
            {/* Navigation Buttons */}
            <button
              onClick={handlePreviousPhoto}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300 bg-black/50 rounded-full w-12 h-12 flex items-center justify-center"
            >
              ‹
            </button>
            <button
              onClick={handleNextPhoto}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300 bg-black/50 rounded-full w-12 h-12 flex items-center justify-center"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
