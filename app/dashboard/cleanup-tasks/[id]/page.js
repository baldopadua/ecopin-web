'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { fetchCleanupTaskById, uploadCleanupPhoto, markCleanupTaskComplete } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'

export default function CleanupTaskDetailPage() {
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploadingBefore, setUploadingBefore] = useState(false)
  const [uploadingAfter, setUploadingAfter] = useState(false)
  const [markingComplete, setMarkingComplete] = useState(false)
  const router = useRouter()
  const params = useParams()
  const taskId = params.id

  useEffect(() => {
    const loadTask = async () => {
      try {
        const data = await fetchCleanupTaskById(taskId)
        setTask(data)
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
    } catch (error) {
      console.error('Failed to upload photo:', error)
      alert('Failed to upload photo. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const handleMarkComplete = async () => {
    if (!task.before_photo_url || !task.after_photo_url) {
      alert('Please upload both before and after photos before marking the task as complete.')
      return
    }
    
    setMarkingComplete(true)
    try {
      await markCleanupTaskComplete(taskId)
      const updatedTask = await fetchCleanupTaskById(taskId)
      setTask(updatedTask)
    } catch (error) {
      console.error('Failed to mark task complete:', error)
      alert('Failed to mark task complete. Please try again.')
    } finally {
      setMarkingComplete(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-blue-100 text-blue-800'
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
    </div>
  )
}
