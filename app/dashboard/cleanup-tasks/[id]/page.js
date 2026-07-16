'use client'
import React, { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { fetchCleanupTaskById, uploadCleanupPhoto, markCleanupTaskComplete, fetchReportsByClusterId, batchCompleteReportsByCluster, updateReportStatus, fetchReportsByIds, updateReportValidation, fetchReportEvidence, updateLifecycleStage, logAgencyResponse, fetchAgencyResponses } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import Notification from '@/components/ui/Notification'

export default function CleanupTaskDetailPage() {
  const [task, setTask] = useState(null)
  const [reports, setReports] = useState([])
  const [reportsEvidence, setReportsEvidence] = useState({})
  const [loading, setLoading] = useState(true)
  const [markingComplete, setMarkingComplete] = useState(false)
  const [completingReportId, setCompletingReportId] = useState(null)
  const [notification, setNotification] = useState(null)
  const [expandedReports, setExpandedReports] = useState({})
  const [uploadingReportPhotos, setUploadingReportPhotos] = useState({})
  const [lightboxImage, setLightboxImage] = useState(null)
  const [validatingReport, setValidatingReport] = useState(null)
  const [loadingEvidence, setLoadingEvidence] = useState({})
  const [evidenceErrors, setEvidenceErrors] = useState({})
  const abortControllersRef = useRef({})
  const [viewMode, setViewMode] = useState('table') // 'table' or 'detail'
  const [selectedReportId, setSelectedReportId] = useState(null)
  const [showLifecycleDropdown, setShowLifecycleDropdown] = useState(false)
  const [updatingLifecycle, setUpdatingLifecycle] = useState(false)
  const lifecycleDropdownRef = useRef(null)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [agencyResponses, setAgencyResponses] = useState([])
  const router = useRouter()
  const params = useParams()
  const taskId = params.id

  useEffect(() => {
    const loadTask = async () => {
      try {
        const data = await fetchCleanupTaskById(taskId)
        setTask(data)

        // Fetch reports based on task type
        let reportsData = []
        if (data.is_custom && data.report_ids && data.report_ids.length > 0) {
          // Custom task: fetch reports by IDs
          reportsData = await fetchReportsByIds(data.report_ids)
          setReports(reportsData)
        } else if (data.cluster_id) {
          // Cluster-based task: fetch reports by cluster
          reportsData = await fetchReportsByClusterId(data.cluster_id)
          setReports(reportsData)
        }

        // Don't fetch evidence on load - lazy load when expanded
        console.log('Loaded', reportsData.length, 'reports')
      } catch (error) {
        console.error('Failed to load cleanup task:', error)
      } finally {
        setLoading(false)
      }
    }
    loadTask()
  }, [taskId])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (lifecycleDropdownRef.current && !lifecycleDropdownRef.current.contains(event.target)) {
        setShowLifecycleDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkComplete = async () => {
    // Check if there are both before and after photos
    const hasBeforePhotos = task.before_photo_url || reports.some(r => r.before_photo_url)
    const hasAfterPhotos = task.after_photo_url || reports.some(r => r.after_photo_url)

    if (!hasBeforePhotos || !hasAfterPhotos) {
      setNotification({ message: 'Please upload both before and after photos before marking the task as complete.', type: 'warning' })
      return
    }

    // Check if all reports in the cluster are resolved (lifecycle stage)
    if (reports.length > 0) {
      const unresolvedReports = reports.filter(r => r.stage !== 'resolved')
      if (unresolvedReports.length > 0) {
        setNotification({ message: 'Task can only be complete when all reports are resolved', type: 'error' })
        return
      }
    }

    setMarkingComplete(true)
    try {
      await markCleanupTaskComplete(taskId)
      const updatedTask = await fetchCleanupTaskById(taskId)
      setTask(updatedTask)

      setNotification({ message: 'Cleanup task marked as complete successfully!', type: 'success' })
    } catch (error) {
      console.error('Failed to mark task complete:', error)
      setNotification({ message: 'Failed to mark task complete. Please try again.', type: 'error' })
    } finally {
      setMarkingComplete(false)
    }
  }

  const getLifecycleStageColor = (stage) => {
    switch (stage) {
      case 'submitted':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'acknowledged':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'responded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const handleLifecycleStageUpdate = async (reportId, newStage) => {
    const report = reports.find(r => r.id === reportId)
    
    // Check if trying to mark as resolved without photos
    if (newStage === 'resolved' && (!report.before_photo_url || !report.after_photo_url)) {
      setNotification({ message: 'Please upload both before and after photos before marking the report as resolved.', type: 'warning' })
      return
    }

    setUpdatingLifecycle(true)
    try {
      await updateLifecycleStage(reportId, newStage)
      
      // Refresh reports to show updated lifecycle stage
      let reportsData = []
      if (task.is_custom && task.report_ids) {
        reportsData = await fetchReportsByIds(task.report_ids)
      } else if (task.cluster_id) {
        reportsData = await fetchReportsByClusterId(task.cluster_id)
      }
      setReports(reportsData)
      
      // If we're in detail view, ensure the selected report still exists
      if (viewMode === 'detail' && selectedReportId) {
        const reportStillExists = reportsData.find(r => r.id === selectedReportId)
        if (!reportStillExists) {
          // Report no longer exists, go back to table view
          setViewMode('table')
          setSelectedReportId(null)
        }
      }
      
      setShowLifecycleDropdown(false)
      setNotification({ message: 'Lifecycle stage updated successfully', type: 'success' })
    } catch (error) {
      console.error('Failed to update lifecycle stage:', error)
      setNotification({ message: 'Failed to update lifecycle stage. Please try again.', type: 'error' })
    } finally {
      setUpdatingLifecycle(false)
    }
  }

  const handleMarkReportComplete = async (reportId) => {
    const report = reports.find(r => r.id === reportId)
    
    // Check if the report is validated
    if (report.validation_status !== 'validated') {
      setNotification({ message: 'Please validate this report before marking it as complete.', type: 'warning' })
      return
    }
    
    // Check if the report has both before and after photos
    if (!report.before_photo_url || !report.after_photo_url) {
      setNotification({ message: 'Please upload both before and after photos for this report before marking it as complete.', type: 'warning' })
      return
    }

    setCompletingReportId(reportId)
    try {
      await updateReportStatus(reportId, 'resolved')
      // Refresh reports to show updated status
      let reportsData = []
      if (task.is_custom && task.report_ids) {
        reportsData = await fetchReportsByIds(task.report_ids)
      } else if (task.cluster_id) {
        reportsData = await fetchReportsByClusterId(task.cluster_id)
      }
      setReports(reportsData)
      
      // If we're in detail view, ensure the selected report still exists
      if (viewMode === 'detail' && selectedReportId) {
        const reportStillExists = reportsData.find(r => r.id === selectedReportId)
        if (!reportStillExists) {
          // Report no longer exists, go back to table view
          setViewMode('table')
          setSelectedReportId(null)
        }
      }
      
      setNotification({ message: 'Report marked as complete!', type: 'success' })
    } catch (error) {
      console.error('Failed to mark report complete:', error)
      setNotification({ message: 'Failed to mark report complete. Please try again.', type: 'error' })
    } finally {
      setCompletingReportId(null)
    }
  }

  const handleValidateReport = async (reportId) => {
    setValidatingReport(reportId)
    try {
      await updateReportValidation(reportId, 'validated')
      // Refresh reports to show updated validation status
      let reportsData = []
      if (task.is_custom && task.report_ids) {
        reportsData = await fetchReportsByIds(task.report_ids)
      } else if (task.cluster_id) {
        reportsData = await fetchReportsByClusterId(task.cluster_id)
      }
      setReports(reportsData)

      setNotification({ message: 'Report validated successfully', type: 'success' })
    } catch (error) {
      console.error('Failed to validate report:', error)
      setNotification({ message: 'Failed to validate report. Please try again.', type: 'error' })
    } finally {
      setValidatingReport(null)
    }
  }

  const handleRejectReport = async (reportId) => {
    setValidatingReport(reportId)
    try {
      await updateReportValidation(reportId, 'rejected')
      // Refresh reports to show updated validation status
      let reportsData = []
      if (task.is_custom && task.report_ids) {
        reportsData = await fetchReportsByIds(task.report_ids)
      } else if (task.cluster_id) {
        reportsData = await fetchReportsByClusterId(task.cluster_id)
      }
      setReports(reportsData)

      setNotification({ message: 'Report rejected successfully', type: 'success' })
    } catch (error) {
      console.error('Failed to reject report:', error)
      setNotification({ message: 'Failed to reject report. Please try again.', type: 'error' })
    } finally {
      setValidatingReport(null)
    }
  }

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    
    setAddingNote(true)
    try {
      await logAgencyResponse(selectedReportId, {
        action_type: 'manual_note',
        action_details: noteText
      })
      
      // Refresh agency responses
      const responses = await fetchAgencyResponses(selectedReportId)
      setAgencyResponses(responses)
      
      setNoteText('')
      setShowNoteInput(false)
      setNotification({ message: 'Note added successfully', type: 'success' })
    } catch (error) {
      console.error('Failed to add note:', error)
      setNotification({ message: 'Failed to add note. Please try again.', type: 'error' })
    } finally {
      setAddingNote(false)
    }
  }

  const handleViewReportDetail = async (reportId) => {
    setSelectedReportId(reportId)
    setViewMode('detail')
    
    // Load agency responses for the selected report
    try {
      const responses = await fetchAgencyResponses(reportId)
      setAgencyResponses(responses)
    } catch (error) {
      console.error('Failed to load agency responses:', error)
      setAgencyResponses([])
    }
    
    // Load evidence for the selected report if not already loaded
    if (!reportsEvidence[reportId] && !evidenceErrors[reportId]) {
      setLoadingEvidence(prev => ({ ...prev, [reportId]: true }))
      setEvidenceErrors(prev => ({ ...prev, [reportId]: null }))
      
      // Cancel any pending request for this report
      if (abortControllersRef.current[reportId]) {
        abortControllersRef.current[reportId].abort()
      }
      
      const controller = new AbortController()
      abortControllersRef.current[reportId] = controller
      
      fetchReportEvidence(reportId, controller.signal)
        .then(evidence => {
          setReportsEvidence(prev => ({
            ...prev,
            [reportId]: evidence || []
          }))
        })
        .catch(error => {
          if (error.name !== 'AbortError') {
            console.error('Failed to fetch evidence for report:', reportId, error)
            setEvidenceErrors(prev => ({ ...prev, [reportId]: error.message }))
          }
        })
        .finally(() => {
          setLoadingEvidence(prev => ({ ...prev, [reportId]: false }))
          delete abortControllersRef.current[reportId]
        })
    }
  }

  const handleBackToTable = () => {
    setSelectedReportId(null)
    setViewMode('table')
  }

  const handleNextReport = () => {
    const currentIndex = reports.findIndex(r => r.id === selectedReportId)
    if (currentIndex < reports.length - 1) {
      const nextReportId = reports[currentIndex + 1].id
      setSelectedReportId(nextReportId)
      
      // Load evidence for the next report if not already loaded
      if (!reportsEvidence[nextReportId] && !evidenceErrors[nextReportId]) {
        setLoadingEvidence(prev => ({ ...prev, [nextReportId]: true }))
        setEvidenceErrors(prev => ({ ...prev, [nextReportId]: null }))
        
        const controller = new AbortController()
        abortControllersRef.current[nextReportId] = controller
        
        fetchReportEvidence(nextReportId, controller.signal)
          .then(evidence => {
            setReportsEvidence(prev => ({
              ...prev,
              [nextReportId]: evidence || []
            }))
          })
          .catch(error => {
            if (error.name !== 'AbortError') {
              console.error('Failed to fetch evidence for report:', nextReportId, error)
              setEvidenceErrors(prev => ({ ...prev, [nextReportId]: error.message }))
            }
          })
          .finally(() => {
            setLoadingEvidence(prev => ({ ...prev, [nextReportId]: false }))
            delete abortControllersRef.current[nextReportId]
          })
      }
    }
  }

  const handlePrevReport = () => {
    const currentIndex = reports.findIndex(r => r.id === selectedReportId)
    if (currentIndex > 0) {
      const prevReportId = reports[currentIndex - 1].id
      setSelectedReportId(prevReportId)
      
      // Load evidence for the previous report if not already loaded
      if (!reportsEvidence[prevReportId] && !evidenceErrors[prevReportId]) {
        setLoadingEvidence(prev => ({ ...prev, [prevReportId]: true }))
        setEvidenceErrors(prev => ({ ...prev, [prevReportId]: null }))
        
        const controller = new AbortController()
        abortControllersRef.current[prevReportId] = controller
        
        fetchReportEvidence(prevReportId, controller.signal)
          .then(evidence => {
            setReportsEvidence(prev => ({
              ...prev,
              [prevReportId]: evidence || []
            }))
          })
          .catch(error => {
            if (error.name !== 'AbortError') {
              console.error('Failed to fetch evidence for report:', prevReportId, error)
              setEvidenceErrors(prev => ({ ...prev, [prevReportId]: error.message }))
            }
          })
          .finally(() => {
            setLoadingEvidence(prev => ({ ...prev, [prevReportId]: false }))
            delete abortControllersRef.current[prevReportId]
          })
      }
    }
  }

  const toggleReportExpansion = async (reportId) => {
    const isExpanding = !expandedReports[reportId]
    
    setExpandedReports(prev => ({
      ...prev,
      [reportId]: !prev[reportId]
    }))

    // Lazy load evidence when expanding
    if (isExpanding && !reportsEvidence[reportId] && !evidenceErrors[reportId]) {
      // Cancel any pending request for this report before making a new one
      if (abortControllersRef.current[reportId]) {
        abortControllersRef.current[reportId].abort()
      }
      
      setLoadingEvidence(prev => ({ ...prev, [reportId]: true }))
      setEvidenceErrors(prev => ({ ...prev, [reportId]: null }))
      
      // Create new AbortController for this request
      const controller = new AbortController()
      abortControllersRef.current[reportId] = controller
      
      try {
        console.log('Fetching evidence for report:', reportId)
        const evidence = await fetchReportEvidence(reportId, controller.signal)
        setReportsEvidence(prev => ({
          ...prev,
          [reportId]: evidence || []
        }))
        console.log('Fetched evidence:', evidence?.length || 0, 'items')
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Failed to fetch evidence for report:', reportId, error)
          setEvidenceErrors(prev => ({ ...prev, [reportId]: error.message }))
          setNotification({ message: 'Failed to load evidence. Please try again.', type: 'error' })
        }
      } finally {
        setLoadingEvidence(prev => ({ ...prev, [reportId]: false }))
        delete abortControllersRef.current[reportId]
      }
    }
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
      if (task.is_custom && task.report_ids) {
        const reportsData = await fetchReportsByIds(task.report_ids)
        setReports(reportsData)
      } else if (task.cluster_id) {
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
      if (task.is_custom && task.report_ids) {
        const reportsData = await fetchReportsByIds(task.report_ids)
        setReports(reportsData)
      } else if (task.cluster_id) {
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

  const getValidationColor = (status) => {
    switch (status) {
      case 'validated':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'manual_review':
      case 'Manual_Review':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getReportCardColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'border-border'
      case 'in_progress':
        return 'border-yellow-500/30 bg-yellow-500/10 dark:border-yellow-500/30 dark:bg-yellow-500/10'
      default:
        return 'border-border bg-surface-elevated dark:bg-surface-elevated'
    }
  }

  if (loading) return <div className="p-8"><p>Loading cleanup task...</p></div>
  if (!task) return <div className="p-8"><p>Cleanup task not found</p></div>

  return (
    <div className="flex flex-col h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="p-8 pb-4">
          <div className="flex items-center justify-between">
            <PageHeader 
              title={`Cleanup Task #${task.id}`}
              subtitle={task.title}
              breadcrumbs={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Cleanup Tasks', href: '/dashboard/cleanup-tasks' },
                { label: `Task #${task.id}` }
              ]}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="p-8 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Reports in Cluster - Table View */}
              {viewMode === 'table' && reports.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Title</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Issue Type</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Location</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Lifecycle</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Validation</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((report) => (
                        <tr key={report.id} className={`border-b border-border hover:bg-surface-elevated ${getReportCardColor(report.status)}`}>
                          <td className="py-3 px-4">
                            <span className="font-medium text-text-primary">{report.title}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-text-secondary">{report.issue_type}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-text-muted">
                              {report.latitude && report.longitude
                                ? `${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}` 
                                : 'N/A'
                              }
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(report.status)}`}>
                              {report.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {report.stage ? (
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getLifecycleStageColor(report.stage)}`}>
                                {report.stage.replace('_', ' ')}
                              </span>
                            ) : (
                              <span className="text-xs text-text-muted">N/A</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getValidationColor(report.validation_status)}`}>
                              {report.validation_status ? report.validation_status.toUpperCase().replace('_', ' ') : 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleViewReportDetail(report.id)}
                              className="px-3 py-1 btn-secondary text-xs rounded"
                            >
                              View Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Cleanup Task Photo Gallery - Only show in table view */}
              {viewMode === 'table' && (
                <div className="card mt-6">
                  <h2 className="text-xl font-bold text-text-primary mb-4">Photo Gallery</h2>
                  
                  {/* Before Photos Section */}
                  <div className="mb-6">
                    <h3 className="font-medium mb-3 text-text-muted">Before Photos</h3>
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
                          <img src={report.before_photo_url} alt={`Report ${report.title} Before`} className="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity" />
                          <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded truncate max-w-[90%]">{report.title}</span>
                        </div>
                      ))}
                    </div>
                    {(!task.before_photo_url && !reports.some(r => r.before_photo_url)) && (
                      <p className="text-text-muted text-sm">No before photos uploaded yet</p>
                    )}
                  </div>

                  {/* After Photos Section */}
                  <div>
                    <h3 className="font-medium mb-3 text-text-muted">After Photos</h3>
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
                          <img src={report.after_photo_url} alt={`Report ${report.title} After`} className="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity" />
                          <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded truncate max-w-[90%]">{report.title}</span>
                        </div>
                      ))}
                    </div>
                    {(!task.after_photo_url && !reports.some(r => r.after_photo_url)) && (
                      <p className="text-text-muted text-sm">No after photos uploaded yet</p>
                    )}
                  </div>
                </div>
              )}

              {/* Report Detail View */}
              {viewMode === 'detail' && selectedReportId && (() => {
                const report = reports.find(r => r.id === selectedReportId)
                const currentIndex = reports.findIndex(r => r.id === selectedReportId)
                if (!report) return null

                return (
                  <div className="mt-6">
                    {/* Navigation */}
                    <div className="flex justify-between items-center mb-4">
                      <button
                        onClick={handlePrevReport}
                        disabled={currentIndex === 0}
                        className="px-4 py-2 btn-secondary rounded disabled:opacity-50"
                      >
                        ← Previous Report
                      </button>
                      <span className="text-sm text-text-muted">
                        Report {currentIndex + 1} of {reports.length}
                      </span>
                      <button
                        onClick={handleNextReport}
                        disabled={currentIndex === reports.length - 1}
                        className="px-4 py-2 btn-secondary rounded disabled:opacity-50"
                      >
                        Next Report →
                      </button>
                    </div>

                    {/* Report Detail Card */}
                    <div className="card">
                      {/* Lifecycle Timeline */}
                      <div className="card mb-6">
                        <div className="text-center mb-6">
                          <h2 className="text-2xl font-bold text-text-primary mb-2">Report Lifecycle</h2>
                          <div className="flex justify-center gap-3 flex-wrap">
                            {report.validation_status === 'rejected' || (report.on_private_property && report.property_owner_consent_status === 'denied') ? (
                              <>
                                {report.validation_status === 'rejected' && (
                                  <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getValidationColor(report.validation_status)}`}>
                                    {report.validation_status.toUpperCase()}
                                  </span>
                                )}
                                {report.on_private_property && report.property_owner_consent_status === 'denied' && (
                                  <span className={`px-4 py-2 rounded-full text-sm font-semibold border bg-red-100 text-red-800 border-red-300`}>
                                    {report.property_owner_consent_status.toUpperCase()}
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(report.status)}`}>
                                  {report.status.replace('_', ' ').toUpperCase()}
                                </span>
                                <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getValidationColor(report.validation_status)}`}>
                                  {report.validation_status ? report.validation_status.toUpperCase() : 'N/A'}
                                </span>
                                {report.stage && (
                                  <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getLifecycleStageColor(report.stage)}`}>
                                    {report.stage.replace('_', ' ').toUpperCase()}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-0 px-4 relative">
                          {/* Continuous background line */}
                          <div className="absolute top-3 left-3 right-3 h-1 bg-gray-300 -z-10" />
                          {/* Colored progress line */}
                          {(() => {
                            const stages = ['submitted', 'acknowledged', 'responded', 'resolved']
                            const currentIndex = stages.indexOf(report.stage)
                            const totalSegments = stages.length - 1

                            let lineWidthCalc = '0px'
                            if (currentIndex === 0) {
                              lineWidthCalc = '12px'
                            } else if (currentIndex > 0) {
                              lineWidthCalc = `calc(12px + ((100% - 24px) / ${totalSegments}) * ${currentIndex})`
                            }

                            return (
                              <div
                                className="absolute top-3 left-3 h-1 bg-[var(--accent-green)] -z-10 transition-all"
                                style={{ width: lineWidthCalc }}
                              />
                            )
                          })()}
                          {['submitted', 'acknowledged', 'responded', 'resolved'].map((stage, index) => {
                            const stages = ['submitted', 'acknowledged', 'responded', 'resolved']
                            const currentIndex = stages.indexOf(report.stage)
                            const isCompleted = currentIndex >= index
                            const isCurrent = report.stage === stage
                            return (
                              <div key={stage} className="flex-1 flex flex-col items-center z-10">
                                <div className={`w-6 h-6 rounded-full ${isCurrent ? 'bg-[var(--success)] ring-4 ring-[var(--success)]/20' : isCompleted ? 'bg-[var(--accent-green)]' : 'bg-gray-300'} transition-all relative`} />
                                <span className={`text-xs mt-2 font-medium ${isCurrent ? 'text-[var(--success)]' : isCompleted ? 'text-[var(--accent-green)]' : 'text-text-muted'}`}>
                                  {stage.replace('_', ' ')}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Report Details */}
                      <div className="card mb-6">
                        <h2 className="text-xl font-bold text-text-primary mb-4">Report Details</h2>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-text-muted">Report ID</p>
                            <p className="text-text-primary font-medium text-sm">{report.id}</p>
                          </div>
                          <div>
                            <p className="text-xs text-text-muted">Location</p>
                            <p className="text-text-primary font-medium text-sm">
                              {report.latitude && report.longitude
                                ? `${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}`
                                : 'Not available'
                              }
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-text-muted">Submitted</p>
                            <p className="text-text-primary font-medium text-sm">
                              {new Date(report.created_at).toLocaleString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-text-muted">Last Updated</p>
                            <p className="text-text-primary font-medium text-sm">
                              {new Date(report.updated_at).toLocaleString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="pt-3 border-t border-border">
                            <p className="text-xs text-text-muted mb-2">Reporter Information</p>
                            <div className="space-y-2">
                              <div>
                                <p className="text-xs text-text-muted">Name</p>
                                <p className="text-text-primary font-medium text-sm">
                                  {report.profiles?.data_consent === true
                                    ? (report.profiles?.full_name || report.user_full_name || 'Anonymous')
                                    : 'Information not disclosed'
                                  }
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-text-muted">User ID</p>
                                <p className="text-text-primary font-medium text-sm">
                                  {report.profiles?.data_consent === true
                                    ? (report.user_id || 'N/A')
                                    : 'Information not disclosed'
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h2 className="text-2xl font-bold text-text-primary">{report.title}</h2>
                          <p className="text-text-muted mt-2">{report.description}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      {report.status !== 'closed' && report.status !== 'resolved' && report.validation_status !== 'rejected' && !(report.on_private_property && report.property_owner_consent_status === 'denied') && (
                        <div className="flex gap-3 mb-6 pt-4 border-t border-border">
                          {report.validation_status === 'manual_review' || report.validation_status === 'Manual_Review' ? (
                            <button
                              onClick={() => handleRejectReport(report.id)}
                              disabled={validatingReport === report.id}
                              className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/80 disabled:opacity-50 font-medium"
                            >
                              {validatingReport === report.id ? 'Rejecting...' : 'Reject Report'}
                            </button>
                          ) : null}
                        </div>
                      )}

                      {/* Evidence Photos */}
                      <div className="mb-6">
                        <h3 className="text-xl font-bold text-text-primary mb-4">Evidence Photos</h3>
                        {loadingEvidence[report.id] ? (
                          <div className="animate-pulse h-48 bg-gray-200 rounded-lg"></div>
                        ) : evidenceErrors[report.id] ? (
                          <div className="text-center py-8">
                            <p className="text-red-500 mb-3">Failed to load evidence</p>
                            <button
                              onClick={() => {
                                setEvidenceErrors(prev => ({ ...prev, [report.id]: null }))
                                toggleReportExpansion(report.id)
                              }}
                              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              Retry
                            </button>
                          </div>
                        ) : reportsEvidence[report.id] && reportsEvidence[report.id].length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {reportsEvidence[report.id].map((img, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={img.url}
                                  alt={`Evidence ${index + 1}`}
                                  className="w-full h-48 object-cover rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => setLightboxImage({ url: img.url, type: 'evidence', index })}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="h-48 bg-surface rounded-lg flex items-center justify-center border border-dashed border-border">
                            <p className="text-text-muted">No evidence images available</p>
                          </div>
                        )}
                      </div>

                      {/* Before & After Photos */}
                      {report.status !== 'closed' && report.status !== 'resolved' && report.validation_status !== 'rejected' && !(report.on_private_property && report.property_owner_consent_status === 'denied') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div className="p-4 border border-border rounded-lg">
                            <div className="flex justify-between items-center mb-3">
                              <h3 className="font-semibold">Before Photo</h3>
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
                              <img 
                                src={report.before_photo_url} 
                                alt="Before" 
                                className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 border border-border"
                                onClick={() => setLightboxImage({ url: report.before_photo_url, type: 'before', index: 0 })}
                              />
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
                            <div className="flex justify-between items-center mb-3">
                              <h3 className="font-semibold">After Photo</h3>
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
                              <img 
                                src={report.after_photo_url} 
                                alt="After" 
                                className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 border border-border"
                                onClick={() => setLightboxImage({ url: report.after_photo_url, type: 'after', index: 0 })}
                              />
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
                      )}

                      <button
                        onClick={() => router.push(`/dashboard/reports/${report.id}`)}
                        className="btn-secondary w-full"
                      >
                        View Full Report Details
                      </button>
                    </div>

                    {/* LGU Notes */}
                    <div className="card mt-6">
                      <h2 className="text-xl font-bold text-text-primary mb-4">LGU Notes</h2>
                      {showNoteInput ? (
                        <div className="space-y-2 mb-4">
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Enter your note..."
                            className="w-full p-3 border border-border rounded-lg bg-surface text-text-primary resize-none"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleAddNote}
                              disabled={addingNote || !noteText.trim()}
                              className="btn-primary flex-1"
                            >
                              {addingNote ? 'Adding...' : 'Save Note'}
                            </button>
                            <button
                              onClick={() => {
                                setShowNoteInput(false)
                                setNoteText('')
                              }}
                              className="btn-secondary flex-1"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowNoteInput(true)}
                          className="btn-secondary mb-4"
                        >
                          Add Note
                        </button>
                      )}
                      {agencyResponses.filter(r => r.action_type === 'manual_note').length > 0 ? (
                        <div className="space-y-3">
                          {agencyResponses
                            .filter(r => r.action_type === 'manual_note')
                            .map((response, index) => (
                              <div key={index} className="p-3 bg-surface rounded-lg border border-border">
                                <p className="text-sm text-text-primary">{response.action_details}</p>
                                <p className="text-xs text-text-muted mt-1">
                                  {new Date(response.created_at).toLocaleString()}
                                </p>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-text-muted text-sm">No notes yet</p>
                      )}
                    </div>

                    {/* Activity Log */}
                    <div className="card mt-6">
                      <h2 className="text-xl font-bold text-text-primary mb-4">Activity Log</h2>
                      {agencyResponses && agencyResponses.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Date</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Action</th>
                                <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Details</th>
                              </tr>
                            </thead>
                            <tbody>
                              {agencyResponses.map((response, index) => (
                                <tr key={index} className="border-b border-border">
                                  <td className="py-3 px-4 text-sm text-text-muted">
                                    {new Date(response.created_at).toLocaleString()}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className="px-2 py-1 rounded text-xs font-semibold bg-accent-green/20 text-accent-green border border-accent-green/30">
                                      {response.action_type?.replace('_', ' ').toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-sm text-text-secondary">
                                    {response.action_details}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="bg-surface p-4 rounded-lg border border-border">
                          <p className="text-text-muted text-sm">
                            No activity logged for this report yet.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Sidebar - Task Info */}
            <div className="lg:col-span-1">
              <div className="card sticky top-4">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-text-primary">{task.title}</h2>
                  <p className="text-text-muted mt-2">{task.description}</p>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>

                {viewMode === 'detail' && (
                  <button
                    onClick={handleBackToTable}
                    className="btn-secondary w-full mt-4"
                  >
                    ← Back to Table
                  </button>
                )}

                {reports.length > 0 && (
                  <>
                    <div className="mt-6 pt-4 border-t border-border">
                      <h3 className="font-semibold mb-3">Reports in this Cluster ({reports.length})</h3>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-text-muted">Progress</span>
                        <span className="text-sm text-text-muted">
                          {reports.filter(r => r.stage === 'resolved').length} / {reports.length}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div
                          className="bg-accent-green h-2.5 rounded-full transition-all"
                          style={{ width: `${(reports.filter(r => r.stage === 'resolved').length / reports.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </>
                )}

                {task.status !== 'completed' && viewMode === 'table' && (
                  <div className="mt-6 pt-4 border-t border-border">
                    <button
                      onClick={handleMarkComplete}
                      disabled={markingComplete}
                      className="btn-primary w-full"
                    >
                      {markingComplete ? 'Marking Complete...' : 'Mark Task as Complete'}
                    </button>
                  </div>
                )}

                {/* Actions Card - Show in detail view */}
                {viewMode === 'detail' && selectedReportId && (() => {
                  const report = reports.find(r => r.id === selectedReportId)
                  if (!report) return null
                  return (
                    <div className="mt-6 pt-4 border-t border-border">
                      <h2 className="text-lg font-bold text-text-primary mb-4">Actions</h2>
                      <div className="space-y-3">
                        {/* Lifecycle Stage Control */}
                        <div className="relative" ref={lifecycleDropdownRef}>
                          <button
                            onClick={() => setShowLifecycleDropdown(!showLifecycleDropdown)}
                            className="btn-primary w-full"
                          >
                            {updatingLifecycle ? 'Updating...' : 'Update Lifecycle Stage'}
                          </button>
                          {showLifecycleDropdown && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface border border-border rounded-lg shadow-lg z-50">
                              <button
                                onClick={() => handleLifecycleStageUpdate(report.id, 'resolved')}
                                disabled={report.stage !== 'responded'}
                                className={`w-full px-4 py-3 text-left border-b border-border transition-colors ${report.stage === 'resolved'
                                  ? 'bg-green-100 text-green-800 font-semibold cursor-not-allowed'
                                  : report.stage === 'responded'
                                    ? 'text-text-primary hover:bg-green-50'
                                    : 'text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                <span className="font-medium">Resolved</span>
                              </button>
                              <button
                                onClick={() => handleLifecycleStageUpdate(report.id, 'responded')}
                                disabled={report.stage !== 'acknowledged'}
                                className={`w-full px-4 py-3 text-left border-b border-border transition-colors ${report.stage === 'responded'
                                  ? 'bg-yellow-100 text-yellow-800 font-semibold cursor-not-allowed'
                                  : report.stage === 'acknowledged'
                                    ? 'text-text-primary hover:bg-yellow-50'
                                    : 'text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                <span className="font-medium">Responded</span>
                              </button>
                              <button
                                onClick={() => handleLifecycleStageUpdate(report.id, 'acknowledged')}
                                disabled={report.stage !== 'submitted'}
                                className={`w-full px-4 py-3 text-left transition-colors ${report.stage === 'acknowledged'
                                  ? 'bg-blue-100 text-blue-800 font-semibold cursor-not-allowed'
                                  : report.stage === 'submitted'
                                    ? 'text-text-primary hover:bg-blue-50'
                                    : 'text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                <span className="font-medium">Acknowledged</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
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
          </div>
        </div>
      )}
    </div>
  )
}
