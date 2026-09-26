'use client'
import React, { useEffect, useState, useRef } from 'react'
import { ArrowLeft, Eye, Camera, Upload, ChevronRight } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { fetchCleanupTaskById, uploadCleanupPhoto, markCleanupTaskComplete, fetchReportsByClusterId, batchCompleteReportsByCluster, updateReportStatus, fetchReportsByIds, updateReportValidation, fetchReportEvidence, updateLifecycleStage, logAgencyResponse, fetchAgencyResponses, fetchAvailableCrew, updateReportDetails } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import { SkeletonLine, SkeletonCard } from '@/components/ui/Skeleton'
import Notification from '@/components/ui/Notification'
import { FieldCrewGuard } from '@/components/auth/RequireRole'
import { useUser } from '@/components/auth/UserContext'
import PhotoGalleryCard from '@/components/ui/PhotoGalleryCard'
import EcoPinMap from '@/components/map/EcoPinMap'
import MicroRouteLayer from '@/components/map/MicroRouteLayer'
import wkx from 'wkx'
import { Buffer } from 'buffer'

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

export default function FieldCrewCleanupTaskDetailPage() {
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
  const [availableCrew, setAvailableCrew] = useState([])
  const [isAssigned, setIsAssigned] = useState(false)
  
  // Edit Report Details State
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [updatingDetails, setUpdatingDetails] = useState(false)
  const [editFormData, setEditFormData] = useState({})
  
  const router = useRouter()
  const params = useParams()
  const taskId = params.id
  const user = useUser()

  useEffect(() => {
    const loadTask = async () => {
      try {
        const data = await fetchCleanupTaskById(taskId)
        
        // Check if current user is assigned to this task
        const assigned = data.assigned_crew_ids && data.assigned_crew_ids.length > 0 && user?.id && data.assigned_crew_ids.includes(user.id)
        setIsAssigned(assigned)
        
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
  }, [taskId, user?.id])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (lifecycleDropdownRef.current && !lifecycleDropdownRef.current.contains(event.target)) {
        setShowLifecycleDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const handleSaveDetails = async (reportId) => {
    if (!isAssigned) {
      setNotification({ message: 'You are not assigned to this task', type: 'error' })
      return
    }

    setUpdatingDetails(true)
    try {
      await updateReportDetails(reportId, editFormData)
      
      // Refresh reports
      let reportsData = []
      if (task.is_custom && task.report_ids) {
        reportsData = await fetchReportsByIds(task.report_ids)
      } else if (task.cluster_id) {
        reportsData = await fetchReportsByClusterId(task.cluster_id)
      }
      setReports(reportsData)
      setIsEditingDetails(false)
      setNotification({ message: 'Report details updated successfully', type: 'success' })
    } catch (error) {
      console.error('Failed to update details:', error)
      setNotification({ message: 'Failed to update report details. Please try again.', type: 'error' })
    } finally {
      setUpdatingDetails(false)
    }
  }

  const handleMarkComplete = async () => {
    if (!isAssigned) {
      setNotification({ message: 'You are not assigned to this task', type: 'error' })
      return
    }

    // Check if there are both before and after photos
    const hasBeforePhotos = task.before_photo_url || reports.some(r => r.before_photo_url)
    const hasAfterPhotos = task.after_photo_url || reports.some(r => r.after_photo_url)

    if (!hasBeforePhotos || !hasAfterPhotos) {
      setNotification({ message: 'Please upload both before and after photos before marking the task as complete.', type: 'warning' })
      return
    }

    // Check if all reports in the cluster are resolved (lifecycle stage)
    // Business Rule: "Scouting" or "acknowledge_only" reports count as done if validated/closed.
    if (reports.length > 0) {
      const unresolvedReports = reports.filter(r => {
        const isScouting = r.issue_type?.toLowerCase() === 'scouting' || r.issue_type?.toLowerCase() === 'acknowledge_only'
        if (isScouting) {
          return r.validation_status !== 'validated' && r.status !== 'resolved' && r.status !== 'closed'
        }
        return r.stage !== 'resolved' && r.status !== 'resolved' && r.status !== 'closed'
      })
      if (unresolvedReports.length > 0) {
        setNotification({ message: 'Task can only be complete when all reports are resolved or acknowledged', type: 'error' })
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



  const handleLifecycleStageUpdate = async (reportId, newStage) => {
    if (!isAssigned) {
      setNotification({ message: 'You are not assigned to this task', type: 'error' })
      setShowLifecycleDropdown(false)
      return
    }

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
          setViewMode('table')
          setSelectedReportId(null)
        }
      }
      
      setNotification({ message: 'Cleanup completed successfully! Waiting for citizen to close.', type: 'success' })
    } catch (error) {
      console.error('Failed to mark report complete:', error)
      setNotification({ message: 'Failed to mark report complete. Please try again.', type: 'error' })
    } finally {
      setCompletingReportId(null)
    }
  }

  const handleUpdateStatus = async (reportId, newStatus) => {
    setCompletingReportId(reportId)
    try {
      await updateReportStatus(reportId, newStatus)
      // Refresh reports
      let reportsData = []
      if (task.is_custom && task.report_ids) {
        reportsData = await fetchReportsByIds(task.report_ids)
      } else if (task.cluster_id) {
        reportsData = await fetchReportsByClusterId(task.cluster_id)
      }
      setReports(reportsData)
      setNotification({ message: `Report marked as ${newStatus}!`, type: 'success' })
    } catch (error) {
      console.error('Failed to update status:', error)
      setNotification({ message: 'Failed to update status. Please try again.', type: 'error' })
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
    if (!isAssigned) {
      setNotification({ message: 'You are not assigned to this task', type: 'error' })
      return
    }

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

  const handleViewReportDetail = (reportId) => {
    router.push(`/dashboard/field-crew/operations/${task.id}/${reportId}`)
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
    if (!isAssigned) {
      setNotification({ message: 'You are not assigned to this task', type: 'error' })
      return
    }

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
    if (!isAssigned) {
      setNotification({ message: 'You are not assigned to this task', type: 'error' })
      return
    }

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
            <div className="card no-hover">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4"><SkeletonLine className="h-4 w-12" /></th>
                      <th className="text-left py-3 px-4"><SkeletonLine className="h-4 w-16" /></th>
                      <th className="text-left py-3 px-4"><SkeletonLine className="h-4 w-24" /></th>
                      <th className="text-left py-3 px-4"><SkeletonLine className="h-4 w-16" /></th>
                      <th className="text-left py-3 px-4"><SkeletonLine className="h-4 w-20" /></th>
                      <th className="text-left py-3 px-4"><SkeletonLine className="h-4 w-16" /></th>
                      <th className="text-left py-3 px-4"><SkeletonLine className="h-4 w-12" /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="py-4 px-4"><SkeletonLine className="h-4 w-32" /></td>
                        <td className="py-4 px-4"><SkeletonLine className="h-4 w-24" /></td>
                        <td className="py-4 px-4">
                          <SkeletonLine className="h-4 w-full max-w-[200px] mb-2" />
                          <SkeletonLine className="h-4 w-3/4 max-w-[150px]" />
                        </td>
                        <td className="py-4 px-4"><SkeletonLine className="h-6 w-20 rounded-full" /></td>
                        <td className="py-4 px-4"><SkeletonLine className="h-6 w-24 rounded-full" /></td>
                        <td className="py-4 px-4"><SkeletonLine className="h-6 w-24 rounded-full" /></td>
                        <td className="py-4 px-4"><SkeletonLine className="h-8 w-24 rounded" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="lg:col-span-1 space-y-6">
            <SkeletonCard />
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

  const mapCenterLat = firstReport ? parseLocation(firstReport.location, firstReport.latitude, firstReport.longitude).latitude : 14.5995
  const mapCenterLng = firstReport ? parseLocation(firstReport.location, firstReport.latitude, firstReport.longitude).longitude : 120.9842

  return (
    <FieldCrewGuard>
      <div className="p-8">
        <PageHeader
          title={`Cleanup Task #${task.id}`}
          subtitle={task.title}
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard/field-crew' },
            { label: 'My Route', href: '/dashboard/field-crew/my-route' },
            { label: 'Operations', href: '/dashboard/field-crew/operations' },
            { label: `Task #${task.id}` }
          ]}
        />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Reports in Cluster - Table View */}
              {reports.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-[#1A1A1A] dark:border-[#333]">
                        <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-widest text-text-muted">Title</th>
                        <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-widest text-text-muted">Issue Type</th>
                        <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-widest text-text-muted">Description</th>
                        <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-widest text-text-muted">Status</th>
                        <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-widest text-text-muted">Lifecycle Stage</th>
                        <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-widest text-text-muted">Validation Status</th>
                        <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-widest text-text-muted">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((report) => (
                        <tr key={report.id} className={`border-b border-[#1A1A1A] dark:border-[#333] hover:bg-surface-elevated hover:border-l-4 hover:border-l-[#ccff00] transition-colors ${getReportCardColor(report.status)}`}>
                          <td className="py-3 px-4 min-w-[150px]">
                            <span className="font-medium text-text-primary">{report.title}</span>
                          </td>
                          <td className="py-3 px-4 min-w-[120px]">
                            <span className="text-sm text-text-secondary">{report.issue_type}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-text-muted line-clamp-2 max-w-xs">{report.description || 'N/A'}</span>
                          </td>
                          <td className="py-3 px-4 min-w-[200px]">
                            <StatusBadge status={report.status} type="report" />
                          </td>
                          <td className="py-3 px-4 min-w-[150px]">
                            {report.stage ? (
                              <StatusBadge status={report.stage} type="lifecycle" />
                            ) : (
                              <span className="text-xs text-text-muted">N/A</span>
                            )}
                          </td>
                          <td className="py-3 px-4 min-w-[150px]">
                            <StatusBadge status={report.validation_status} type="validation" />
                          </td>
                          <td className="py-3 px-4 min-w-[140px]">
                            <button
                              onClick={() => handleViewReportDetail(report.id)}
                              className="px-4 py-2 bg-transparent border-2 border-[#1A1A1A] dark:border-[#333] text-sm rounded-none flex items-center justify-center gap-2 whitespace-nowrap hover:bg-[#1A1A1A] hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                            >
                              <Eye className="w-4 h-4" /> View Detail
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Cleanup Task Photo Gallery */}
              <PhotoGalleryCard task={task} reports={reports} />
            </div>

            {/* Sidebar - Task Info */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Mini Map */}
              <div className="card p-0 overflow-hidden border-2 border-border h-[300px] relative z-0 isolate">
                <EcoPinMap
                  centerLat={mapCenterLat}
                  centerLng={mapCenterLng}
                  hideFilterPanel={true}
                  hidePins={true}
                  hideClusters={true}
                  showHeatmap={false}
                >
                  <MicroRouteLayer tasks={[task]} routeWaypoints={[{ sequence_order: 1, cleanup_task_id: task.id }]} />
                </EcoPinMap>
              </div>

              <div className="card sticky top-[160px] self-start">
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-text-primary">{task.title}</h2>
                  <p className="text-text-muted mt-2">{task.description}</p>
                </div>

                <StatusBadge status={task.status} type="task" />

                {viewMode === 'detail' && (
                  <button
                    onClick={handleBackToTable}
                    className="btn-secondary w-full mt-4 flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Table
                  </button>
                )}

                {/* Assigned Crew Section */}
                <div className="mt-6 pt-4 border-t border-border">
                  <h3 className="font-semibold mb-3">Assigned Crew</h3>
                  {task.assigned_crew_ids && task.assigned_crew_ids.length > 0 ? (
                    <div className="space-y-2">
                      {availableCrew.filter(crew => task.assigned_crew_ids.includes(crew.id)).map(crew => (
                        <div key={crew.id} className="flex items-center space-x-3 p-2 bg-surface-elevated rounded-lg">
                          {crew.avatar_url ? (
                            <img
                              src={crew.avatar_url}
                              alt={crew.full_name}
                              className="w-10 h-10 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-text-muted font-medium">
                              {crew.full_name?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-text-primary">{crew.full_name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted">No crew assigned</p>
                  )}
                </div>

                {reports.length > 0 && (
                  <>
                    <div className="mt-6 pt-4 border-t border-border">
                      <h3 className="font-semibold mb-3">Reports in this Cluster ({reports.length})</h3>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-text-muted">Progress</span>
                        <span className="text-sm text-text-muted font-mono">
                          {reports.filter(r => {
                            const isScouting = r.issue_type?.toLowerCase() === 'scouting' || r.issue_type?.toLowerCase() === 'acknowledge_only'
                            if (isScouting) return r.validation_status === 'validated' || r.status === 'resolved' || r.status === 'closed'
                            return r.stage === 'resolved' || r.status === 'resolved' || r.status === 'closed'
                          }).length} / {reports.length}
                        </span>
                      </div>
                       <div className="w-full bg-border rounded-none h-2">
                        <div
                          className="bg-[#ccff00] h-2 rounded-none transition-all"
                          style={{ width: `${(reports.filter(r => {
                            const isScouting = r.issue_type?.toLowerCase() === 'scouting' || r.issue_type?.toLowerCase() === 'acknowledge_only'
                            if (isScouting) return r.validation_status === 'validated' || r.status === 'resolved' || r.status === 'closed'
                            return r.stage === 'resolved' || r.status === 'resolved' || r.status === 'closed'
                          }).length / reports.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </>
                )}

                {task.status !== 'completed' && (() => {
                  const hasBeforePhotos = task.before_photo_url || reports.some(r => r.before_photo_url)
                  const hasAfterPhotos = task.after_photo_url || reports.some(r => r.after_photo_url)
                  const allResolved = reports.length === 0 || reports.every(r => {
                    const isScouting = r.issue_type?.toLowerCase() === 'scouting' || r.issue_type?.toLowerCase() === 'acknowledge_only'
                    if (isScouting) return r.validation_status === 'validated' || r.status === 'resolved' || r.status === 'closed'
                    return r.stage === 'resolved' || r.status === 'resolved' || r.status === 'closed'
                  })
                  const canMarkComplete = hasBeforePhotos && hasAfterPhotos && allResolved && isAssigned

                  return (
                    <div className="mt-6 pt-4 border-t-2 border-[#1A1A1A] dark:border-[#333]">
                      <button
                        onClick={handleMarkComplete}
                        disabled={markingComplete || !canMarkComplete}
                        className={`w-full py-3 px-4 transition-all ${(!canMarkComplete || markingComplete) ? 'bg-border text-text-muted cursor-not-allowed border-2 border-transparent' : 'bg-[#ccff00] text-black font-bold border-2 border-[#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] shadow-[4px_4px_0px_0px_#1a1a1a]'}`}
                      >
                        {markingComplete ? 'Processing...' : 'Mark Task Complete'}
                      </button>
                    </div>
                  )
                })()}

                {/* Actions Card - Show in detail view */}
                {viewMode === 'detail' && selectedReportId && (() => {
                  const report = reports.find(r => r.id === selectedReportId)
                  if (!report) return null
                  return (
                    <div className="mt-6 pt-4 border-t border-border">
                      <h2 className="text-lg font-bold text-text-primary mb-4">Actions</h2>
                      <div className="space-y-3">
                        {/* Action Buttons Cycled based on Report Status */}
                        <div className="space-y-3">
                          {(!report.status || report.status === 'submitted' || report.status === 'pending') && (
                            <button
                              onClick={() => handleUpdateStatus(report.id, 'acknowledged')}
                              disabled={completingReportId === report.id || !isAssigned}
                              className="w-full px-4 py-3 bg-info text-white rounded-lg hover:bg-info/90 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-sm"
                            >
                              {completingReportId === report.id ? 'Processing...' : '✅ Mark as Acknowledged'}
                            </button>
                          )}

                          {report.status === 'acknowledged' && (
                            <button
                              onClick={() => handleUpdateStatus(report.id, 'responded')}
                              disabled={completingReportId === report.id || !isAssigned}
                              className="w-full px-4 py-3 bg-purple text-white rounded-lg hover:bg-purple/90 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-sm"
                            >
                              {completingReportId === report.id ? 'Processing...' : '👷 Mark as Responded'}
                            </button>
                          )}

                          {report.status === 'responded' && (
                            <button
                              onClick={() => handleMarkReportComplete(report.id)}
                              disabled={completingReportId === report.id || !isAssigned}
                              className="w-full px-4 py-3 bg-success text-white rounded-lg hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-sm"
                            >
                              {completingReportId === report.id ? 'Processing...' : '🧹 Cleanup Completed'}
                            </button>
                          )}

                          {report.status === 'resolved' && (
                            <button
                              disabled
                              className="w-full px-4 py-3 bg-success/50 text-white rounded-lg cursor-not-allowed font-bold text-lg shadow-sm transition-all"
                            >
                              ✓ Waiting for Citizen to Close
                            </button>
                          )}

                          {report.status === 'closed' && (
                            <button
                              disabled
                              className="w-full px-4 py-3 bg-surface-elevated border border-border text-text-muted rounded-lg cursor-not-allowed font-bold text-lg shadow-sm"
                            >
                              ✓ Report Closed
                            </button>
                          )}
                        </div>

                        {/* View on Map Button */}
                        {(() => {
                          const loc = parseLocation(report.location, report.latitude, report.longitude);
                          if (loc.latitude && loc.longitude) {
                            return (
                              <button
                                onClick={() => router.push(`/dashboard/field-crew/my-route?lat=${loc.latitude}&lng=${loc.longitude}&id=${report.id}`)}
                                className="w-full bg-transparent border-2 border-[#1A1A1A] dark:border-[#333] text-text-primary px-4 py-2 rounded-none hover:bg-[#1A1A1A] hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors font-bold"
                              >
                                View on Map
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  )
                })()}
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
               className="absolute top-4 right-4 text-white text-4xl hover:text-text-muted z-10"
            >
              ×
            </button>
            <img src={lightboxImage.url} alt="Full view" className="w-full h-full object-contain" />
          </div>
        </div>
      )}
    </div>
    </FieldCrewGuard>
  )
}
