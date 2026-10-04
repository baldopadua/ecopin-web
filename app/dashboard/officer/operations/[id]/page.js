'use client'
import React, { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { fetchCleanupTaskById, uploadCleanupPhoto, fetchReportsByClusterId, fetchReportsByIds, fetchReportEvidence, updateLifecycleStage, logAgencyResponse, fetchAgencyResponses, fetchAvailableCrew, assignCleanupTask, updateCleanupTaskTitle } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import { SkeletonLine, SkeletonCard } from '@/components/ui/Skeleton'
import Notification from '@/components/ui/Notification'
import wkx from 'wkx'
import { Buffer } from 'buffer'
import dynamic from 'next/dynamic'
import { Pen } from 'lucide-react'

const OperationsMap = dynamic(() => import('@/components/map/OperationsMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-surface-elevated animate-pulse flex items-center justify-center">
      <span className="text-text-muted font-mono text-xs uppercase tracking-widest">Loading Map...</span>
    </div>
  )
})

// Polyfill Buffer for browser environment
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer
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

export default function CleanupTaskDetailPage() {
  const [task, setTask] = useState(null)
  const [reports, setReports] = useState([])
  const [reportsEvidence, setReportsEvidence] = useState({})
  const [loading, setLoading] = useState(true)
  const [markingComplete, setMarkingComplete] = useState(false) // kept for in-flight guard only
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
  const [availableCrew, setAvailableCrew] = useState([])
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [tempCrewIds, setTempCrewIds] = useState([])
  const [assigning, setAssigning] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editingTitle, setEditingTitle] = useState('')
  const [savingTitle, setSavingTitle] = useState(false)
  const router = useRouter()
  const params = useParams()
  const taskId = params.id

  useEffect(() => {
    if (selectedReportId) setCurrentImageIndex(0)
  }, [selectedReportId])

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
    const loadAvailableCrew = async () => {
      try {
        const data = await fetchAvailableCrew()
        setAvailableCrew(data)
      } catch (error) {
        console.error('Failed to load available crew:', error)
      }
    }
    loadAvailableCrew()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (lifecycleDropdownRef.current && !lifecycleDropdownRef.current.contains(event.target)) {
        setShowLifecycleDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Task completion is handled automatically server-side when the field crew app
  // uploads the final after photo for the last unresolved report. No manual
  // officer action is required or exposed here.

  const handleAssignTask = async (selectedCrewIds) => {
    setAssigning(true)
    try {
      await assignCleanupTask(taskId, selectedCrewIds)
      const updatedTask = await fetchCleanupTaskById(taskId)
      setTask(updatedTask)
      setShowAssignmentModal(false)
      setNotification({ message: 'Task assigned successfully', type: 'success' })
    } catch (error) {
      console.error('Failed to assign task:', error)
      setNotification({ message: 'Failed to assign task. Please try again.', type: 'error' })
    } finally {
      setAssigning(false)
    }
  }



  const handleSaveTitle = async () => {
    if (!editingTitle.trim() || editingTitle.trim() === task.title) {
      setIsEditingTitle(false)
      return
    }
    setSavingTitle(true)
    try {
      await updateCleanupTaskTitle(taskId, editingTitle.trim())
      setTask(prev => ({ ...prev, title: editingTitle.trim() }))
      setIsEditingTitle(false)
      setNotification({ message: 'Title updated successfully', type: 'success' })
    } catch (error) {
      console.error('Failed to update title:', error)
      setNotification({ message: 'Failed to update title. Please try again.', type: 'error' })
    } finally {
      setSavingTitle(false)
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
    const report = reports.find(r => r.id === reportId)
    
    // Check if the report has both before and after photos
    if (!report.before_photo_url || !report.after_photo_url) {
      setNotification({ message: 'Please upload both before and after photos for this report before validating it.', type: 'warning' })
      return
    }

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

  const getReportCardColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'border-border'
      case 'in_progress':
        return 'border-warning/30 bg-warning/10 dark:border-warning/30 dark:bg-warning/10'
      default:
        return 'border-border bg-surface-elevated dark:bg-surface-elevated'
    }
  }

  if (loading) return (
    <div className="p-8">
      <div className="space-y-6">
        <SkeletonLine className="h-8 w-48" />
        <SkeletonLine className="h-5 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="space-y-0">
              <div className="ecopin-table-container">
                <table className="ecopin-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Issue Type</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Lifecycle</th>
                      <th>Validation</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="py-3 px-4"><SkeletonLine className="h-4 w-28" /></td>
                        <td className="py-3 px-4"><SkeletonLine className="h-4 w-20" /></td>
                        <td className="py-3 px-4"><SkeletonLine className="h-4 w-36" /></td>
                        <td className="py-3 px-4"><SkeletonLine className="h-5 w-20" /></td>
                        <td className="py-3 px-4"><SkeletonLine className="h-5 w-20" /></td>
                        <td className="py-3 px-4"><SkeletonLine className="h-5 w-24" /></td>
                        <td className="py-3 px-4"><SkeletonLine className="h-6 w-16" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="lg:col-span-1">
            <SkeletonCard />
          </div>
        </div>
      </div>
    </div>
  )
  if (!task) return <div className="p-8"><p>Cleanup task not found</p></div>

  const firstReport = reports.find(r => {
    const loc = parseLocation(r.location, r.latitude, r.longitude);
    return loc.latitude && loc.longitude;
  });

  return (
    <div className="p-8 min-h-screen flex flex-col">
      <PageHeader
        title={
          isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={editingTitle} 
                onChange={(e) => setEditingTitle(e.target.value)} 
                className="px-2 py-1 text-2xl font-bold border-2 border-[#2563eb] focus:outline-none w-64 bg-surface text-text-primary"
                disabled={savingTitle}
                autoFocus
              />
              <button 
                onClick={handleSaveTitle}
                disabled={savingTitle}
                className="px-3 py-1 text-sm font-bold uppercase tracking-widest bg-accent-green text-white border-2 border-accent-green hover:bg-black hover:border-black transition-colors"
              >
                {savingTitle ? 'Saving...' : 'Save'}
              </button>
              <button 
                onClick={() => setIsEditingTitle(false)}
                disabled={savingTitle}
                className="px-3 py-1 text-sm font-bold uppercase tracking-widest text-text-muted hover:text-black dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span>{task.title}</span>
              <button 
                onClick={() => {
                  setEditingTitle(task.title)
                  setIsEditingTitle(true)
                }}
                className="text-text-muted hover:text-primary transition-colors p-1"
                title="Rename Mission"
              >
                <Pen className="w-5 h-5" />
              </button>
            </div>
          )
        }
        subtitle={`Operation / ${task.id.slice(0,8)}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard/officer' },
          { label: 'Operations', href: '/dashboard/officer/operations' },
          { label: `Op #${task.id.slice(0,8)}` }
        ]}
      />

      <div className="flex flex-col gap-8 mt-2">
         
         <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            <div className="xl:col-span-3 h-[400px] border-2 border-[#1a1a1a] dark:border-[#333333] relative flex flex-col bg-surface-elevated shrink-0">
               <div className="absolute top-4 left-4 z-[400] bg-black text-white px-3 py-1.5 border-2 border-accent-green pointer-events-none">
                  <h3 className="font-bold uppercase tracking-widest text-xs">Route Map</h3>
               </div>
               <div className="flex-1 z-0 relative">
                  <div className="w-full h-full">
                     <OperationsMap tasks={[{ ...task, reports }]} />
                  </div>
               </div>
            </div>

            <div className="xl:col-span-1 h-[400px]">
               <div className="h-full card p-6 border-2 border-[#1a1a1a] dark:border-[#333333] rounded-none bg-surface-elevated text-text-primary flex flex-col">
                  <h2 className="text-lg font-black uppercase tracking-tighter mb-4 border-b-2 border-border pb-2 text-accent-green shrink-0">Mission Status</h2>
                  
                  <div className="space-y-4 mb-6 overflow-y-auto flex-1 pr-2">
                    <div>
                       <span className="block text-[10px] font-mono uppercase text-text-muted mb-1">Current Status</span>
                       <StatusBadge status={task.status} type="task" />
                    </div>
                    
                    <div>
                       <span className="block text-[10px] font-mono uppercase text-text-muted mb-1">Assigned Units</span>
                       {task.assigned_crew_ids && task.assigned_crew_ids.length > 0 ? (
                          <div className="flex flex-col gap-2">
                             {task.assigned_crew_ids.map(id => {
                                const crew = availableCrew.find(c => c.id === id)
                                return (
                                  <div key={id} className="flex items-center gap-3 bg-background p-2 border border-border">
                                    <div className="w-8 h-8 bg-surface-elevated rounded-full flex items-center justify-center font-bold text-xs border border-border">
                                      {crew ? crew.full_name[0] : 'U'}
                                    </div>
                                    <span className="font-mono text-sm">{crew ? crew.full_name : `Unit ${id.slice(0,4)}`}</span>
                                  </div>
                                )
                             })}
                          </div>
                       ) : (
                          <div className="text-sm font-mono text-error border border-error/30 p-2 bg-error/10">UNASSIGNED</div>
                       )}
                    </div>
                  </div>

                  <div className="mt-auto space-y-3 pt-4 border-t-2 border-border shrink-0">
                     <button 
                        onClick={() => {
                          setTempCrewIds(task.assigned_crew_ids || [])
                          setShowAssignmentModal(true)
                        }}
                        className="w-full border-2 border-border py-3 text-xs font-bold uppercase tracking-widest text-text-primary hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                     >
                        {task.assigned_crew_ids?.length > 0 ? 'Update Roster' : 'Assign Units'}
                     </button>
                     {/* Completion is triggered automatically by the field crew app
                         uploading the after photo. This panel reflects the live status. */}
                     {task.status === 'completed' && (
                        <div className="w-full py-3 text-xs font-bold uppercase tracking-widest border-2 bg-success/20 text-success border-success/50 text-center">
                           Mission Accomplished
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>

         <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-text-primary uppercase tracking-tighter">Mission Targets</h2>
            <div className="ecopin-table-container">
              <table className="ecopin-table">
                <thead>
                  <tr>
                    <th>Target</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td className="font-bold">{report.title}</td>
                      <td>{report.issue_type}</td>
                      <td><StatusBadge status={report.status} type="report" /></td>
                      <td>
                        <button
                          onClick={() => handleViewReportDetail(report.id)}
                          className="text-xs font-bold uppercase tracking-widest border-2 border-border px-3 py-1 hover:border-accent-green hover:text-accent-green transition-colors"
                        >
                          View Data
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
         </div>
      </div>

      {notification && (
        <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
      )}

      {showAssignmentModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[900]">
          <div className="bg-surface-elevated border-2 border-[#1a1a1a] dark:border-[#333333] p-6 max-w-md w-full mx-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-black uppercase tracking-tighter mb-4">Deploy Units</h2>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-6">
              {availableCrew.length === 0 ? (
                <p className="text-sm text-text-muted font-mono">No units available</p>
              ) : (
                availableCrew.map(crew => (
                  <label key={crew.id} className="flex items-center space-x-3 p-3 border-2 border-border hover:border-accent-green cursor-pointer transition-colors bg-background">
                    <input type="checkbox" checked={tempCrewIds.includes(crew.id)} onChange={(e) => {
                        let newIds = e.target.checked ? [...tempCrewIds, crew.id] : tempCrewIds.filter(id => id !== crew.id);
                        setTempCrewIds(newIds);
                      }}
                      className="rounded-none border-2 border-[#1a1a1a] text-accent-green focus:ring-accent-green w-5 h-5 bg-transparent" />
                    <div className="flex-1 font-mono text-sm font-bold uppercase">{crew.full_name}</div>
                  </label>
                ))
              )}
            </div>
            <div className="flex gap-4">
              <button onClick={() => handleAssignTask(tempCrewIds)} disabled={assigning} className="btn-primary flex-1 py-3 text-xs">
                {assigning ? 'DEPLOYING...' : 'CONFIRM DEPLOYMENT'}
              </button>
              <button onClick={() => setShowAssignmentModal(false)} className="btn-secondary flex-1 py-3 text-xs">CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {selectedReportId && (
        <div className="fixed inset-0 bg-black/80 z-[900] p-4 md:p-8 overflow-y-auto flex cursor-pointer" onClick={() => setSelectedReportId(null)}>
          <div className="m-auto bg-surface-elevated flex flex-col md:flex-row w-full max-w-5xl h-[600px] max-h-[90vh] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none overflow-hidden relative border-2 border-[#1a1a1a] dark:border-[#333333] cursor-auto" onClick={(e) => e.stopPropagation()}>
            {/* Close Button Mobile (absolute) */}
            <button onClick={() => setSelectedReportId(null)} className="md:hidden absolute top-4 right-4 z-50 bg-black/50 text-white rounded-full p-2 hover:bg-black/70">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>

            {/* Left Side: Images */}
            <div className="w-full md:w-[60%] bg-black flex-shrink-0 relative overflow-hidden flex items-center justify-center border-b-2 md:border-b-0 md:border-r-2 border-[#1a1a1a] dark:border-[#333333]">
              {(() => {
                 const r = reports.find(rep => rep.id === selectedReportId);
                 const evs = reportsEvidence[selectedReportId] || [];
                 const images = [];
                 if (r.image_url) images.push({ url: r.image_url, label: 'Reported' });
                 if (r.before_photo_url) images.push({ url: r.before_photo_url, label: 'Before' });
                 if (r.after_photo_url) images.push({ url: r.after_photo_url, label: 'After' });
                 evs.forEach(img => images.push({ url: img.file_url || img.url, label: 'Evidence' }));

                 if (images.length === 0) {
                    return <div className="text-white/50 font-mono text-sm uppercase tracking-widest">No Visual Evidence</div>;
                 }

                 return (
                    <div className="w-full h-full relative flex items-center justify-center group">
                       <img src={images[currentImageIndex].url} alt={images[currentImageIndex].label} className="max-w-full max-h-full object-contain" />
                       <div className="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded">{images[currentImageIndex].label}</div>
                       {images.length > 1 && (
                          <div className="absolute top-4 right-4 bg-black/60 text-white px-2 py-1 text-[10px] font-bold tracking-widest rounded">{currentImageIndex + 1} / {images.length}</div>
                       )}

                       {images.length > 1 && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">
                               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">
                               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                            </button>
                          </>
                       )}
                    </div>
                 );
              })()}
            </div>

            {/* Right Side: Details & Audit */}
            <div className="w-full md:w-[40%] flex flex-col h-full bg-surface-elevated">
               {/* Header */}
               <div className="flex justify-between items-center p-4 border-b-2 border-[#1a1a1a] dark:border-[#333333] shrink-0 bg-background/50">
                  <div className="flex items-center gap-3">
                     <div>
                        <h2 className="text-lg font-black uppercase tracking-tight leading-tight">{reports.find(r => r.id === selectedReportId)?.title}</h2>
                        <span className="text-[10px] text-text-muted font-mono uppercase tracking-widest">{reports.find(r => r.id === selectedReportId)?.issue_type}</span>
                     </div>
                  </div>
                  <button onClick={() => setSelectedReportId(null)} className="hidden md:block text-text-muted hover:text-text-primary transition-colors">
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
               </div>

               {/* Scrollable Content (Comments) */}
               <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {/* Caption / Description */}
                  <div>
                     <span className="font-bold text-sm mr-2">{reports.find(r => r.id === selectedReportId)?.title}</span>
                     <span className="text-sm text-text-primary whitespace-pre-line">{reports.find(r => r.id === selectedReportId)?.description}</span>
                  </div>

                  <hr className="border-border border-dashed" />

                  {/* Actions */}
                  {/* Read-only status — field crew app drives completion via after photo upload */}
                  {(() => {
                     const r = reports.find(rep => rep.id === selectedReportId);
                     const isCompleted = r?.status === 'resolved' || r?.status === 'completed';
                     return isCompleted ? (
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-success border border-success/30 bg-success/10 px-3 py-2">
                           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                           Resolved
                        </div>
                     ) : null;
                  })()}

                  <hr className="border-border border-dashed" />

                  {/* Audit Trail */}
                  <div className="space-y-4">
                     <h3 className="text-[10px] font-black text-text-muted uppercase tracking-widest">Audit Log</h3>
                     {agencyResponses.length > 0 ? (
                        agencyResponses.map((res, i) => (
                          <div key={i} className="mb-2 border-l-2 border-accent-green pl-3">
                             <div className="text-[10px] font-mono text-text-muted">{new Date(res.created_at).toLocaleString()}</div>
                             <div className="text-sm text-text-primary mt-1">{res.action_details}</div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-text-muted italic">No activity recorded yet.</p>
                      )}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
