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
              {viewMode === 'table' && reports.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Title</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Issue Type</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Description</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Lifecycle</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Validation</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((report) => (
                        <tr key={report.id} className={`border-b border-border hover:bg-surface-elevated ${getReportCardColor(report.status)}`}>
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
                              className="px-4 py-2 btn-secondary text-sm rounded-lg flex items-center justify-center gap-2 whitespace-nowrap"
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

              {/* Cleanup Task Photo Gallery - Only show in table view */}
              {viewMode === 'table' && (
                <PhotoGalleryCard task={task} reports={reports} />
              )}

              {/* Report Detail View */}
              {viewMode === 'detail' && selectedReportId && (() => {
                const report = reports.find(r => r.id === selectedReportId)
                const currentIndex = reports.findIndex(r => r.id === selectedReportId)
                if (!report) return null

                return (
                  <div className="space-y-6">
                    {/* Navigation */}
                    <div className="flex justify-between items-center">
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

                    {/* Lifecycle Timeline */}
                    <div className="card">
                      <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-text-primary mb-2">Report Lifecycle</h2>
                        <div className="flex justify-center gap-3 flex-wrap">
                          {report.validation_status === 'rejected' || (report.on_private_property && report.property_owner_consent_status === 'denied') ? (
                            <>
                              {report.validation_status === 'rejected' && (
                                <StatusBadge status={report.validation_status} type="validation" />
                              )}
                              {report.on_private_property && report.property_owner_consent_status === 'denied' && (
                                <StatusBadge status={report.property_owner_consent_status} type="consent" />
                              )}
                            </>
                          ) : (
                            <>
                              <StatusBadge status={report.status} type="report" />
                              <StatusBadge status={report.validation_status} type="validation" />
                              {report.on_private_property && (
                                <StatusBadge status={report.property_owner_consent_status} type="consent" />
                              )}
                              {report.stage && (
                                <StatusBadge status={report.stage} type="lifecycle" />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-0 px-4 relative">
                        <div className="absolute top-3 left-3 right-3 h-1 bg-border z-0" />
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
                              className="absolute top-3 left-3 h-1 bg-[var(--accent-green)] z-0 transition-all"
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
                              <div className={`w-6 h-6 rounded-full ${isCurrent ? 'bg-[var(--success)] ring-4 ring-[var(--success)]/20' : isCompleted ? 'bg-[var(--accent-green)]' : 'bg-border'} transition-all relative`} />
                              <span className={`text-xs mt-2 font-medium ${isCurrent ? 'text-[var(--success)]' : isCompleted ? 'text-[var(--accent-green)]' : 'text-text-muted'}`}>
                                {stage.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Editable Report Details */}
                    <div className="card">
                      {/* Action Intent Banner */}
                      <div className={`mb-6 p-4 border-2 rounded-lg flex items-center justify-center gap-3 ${
                        report.validation_status === 'pending'
                          ? 'bg-info/10 text-info border-info/30'
                          : 'bg-success/10 text-success border-success/30'
                      }`}>
                        <span className="text-2xl">{report.validation_status === 'pending' ? '🔍' : '🧹'}</span>
                        <div>
                          <h3 className="font-bold text-lg font-mono uppercase tracking-wider">
                            ACTION REQUIRED: {report.validation_status === 'pending' ? 'VALIDATE ONLY' : 'FULL CLEANUP'}
                          </h3>
                          <p className="text-sm opacity-90">
                            {report.validation_status === 'pending'
                              ? 'This report is unverified. Provide a verification photo to acknowledge it.'
                              : 'This report is verified. Provide before & after photos to document cleanup.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-start mb-4">
                        <h2 className="text-xl font-bold text-text-primary">Report Details</h2>
                        {isAssigned && !isEditingDetails && (
                          <button
                            onClick={() => setIsEditingDetails(true)}
                            className="px-3 py-1 bg-surface-elevated border border-border text-xs rounded hover:bg-border transition-colors"
                          >
                            Edit Details
                          </button>
                        )}
                        {isEditingDetails && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveDetails(report.id)}
                              disabled={updatingDetails}
                              className="px-3 py-1 bg-accent-green text-white text-xs rounded hover:bg-accent-green-dark transition-colors disabled:opacity-50"
                            >
                              {updatingDetails ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => setIsEditingDetails(false)}
                              disabled={updatingDetails}
                              className="px-3 py-1 bg-surface-elevated border border-border text-xs rounded hover:bg-border transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {isEditingDetails ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
                            <textarea
                              value={editFormData.description}
                              onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                              className="w-full p-2 border border-border rounded bg-surface-elevated text-sm"
                              rows={3}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-text-muted mb-1">Issue Type</label>
                              <select
                                value={editFormData.issue_type}
                                onChange={(e) => setEditFormData({...editFormData, issue_type: e.target.value})}
                                className="w-full p-2 border border-border rounded bg-surface-elevated text-sm"
                              >
                                <option value="waste">Waste</option>
                                <option value="flooding">Flooding</option>
                                <option value="pollution">Pollution</option>
                                <option value="infrastructure">Infrastructure</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-text-muted mb-1">Severity</label>
                              <select
                                value={editFormData.severity}
                                onChange={(e) => setEditFormData({...editFormData, severity: e.target.value})}
                                className="w-full p-2 border border-border rounded bg-surface-elevated text-sm"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-text-muted mb-1">Street</label>
                              <input
                                type="text"
                                value={editFormData.street}
                                onChange={(e) => setEditFormData({...editFormData, street: e.target.value})}
                                className="w-full p-2 border border-border rounded bg-surface-elevated text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-text-muted mb-1">Landmark</label>
                              <input
                                type="text"
                                value={editFormData.landmark}
                                onChange={(e) => setEditFormData({...editFormData, landmark: e.target.value})}
                                className="w-full p-2 border border-border rounded bg-surface-elevated text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-text-muted mb-1">District</label>
                              <input
                                type="text"
                                value={editFormData.district}
                                onChange={(e) => setEditFormData({...editFormData, district: e.target.value})}
                                className="w-full p-2 border border-border rounded bg-surface-elevated text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-text-muted mb-1">City</label>
                              <input
                                type="text"
                                value={editFormData.city}
                                onChange={(e) => setEditFormData({...editFormData, city: e.target.value})}
                                className="w-full p-2 border border-border rounded bg-surface-elevated text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <h2 className="text-2xl font-bold text-text-primary">{report.title}</h2>
                            <p className="text-text-muted mt-2">{report.description || 'No description provided.'}</p>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-border">
                            <div>
                              <p className="text-xs text-text-muted">Issue Type</p>
                              <p className="text-text-primary font-medium text-sm capitalize">{report.issue_type?.replace(/_/g, ' ') || 'Unknown'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-text-muted">Severity</p>
                              <p className="text-text-primary font-medium text-sm capitalize">{report.severity || 'Unknown'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-text-muted">Coordinates</p>
                              <p className="text-text-primary font-medium text-sm">
                                {report.latitude && report.longitude
                                  ? `${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}`
                                  : 'Not available'
                                }
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-text-muted">Street</p>
                              <p className="text-text-primary font-medium text-sm">{report.street || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-text-muted">Landmark</p>
                              <p className="text-text-primary font-medium text-sm">{report.landmark || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-text-muted">Location</p>
                              <p className="text-text-primary font-medium text-sm">{report.district ? `${report.district}, ` : ''}{report.city || 'N/A'}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                            <div>
                              <p className="text-xs text-text-muted">Submitted</p>
                              <p className="text-text-primary font-medium text-sm">
                                {new Date(report.created_at).toLocaleString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-text-muted">Last Updated</p>
                              <p className="text-text-primary font-medium text-sm">
                                {new Date(report.updated_at).toLocaleString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          
                          <div className="pt-4 border-t border-border">
                            <p className="text-xs text-text-muted mb-2">Reporter Information</p>
                            <div className="flex justify-between">
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
                      )}
                    </div>


                    {/* Photos */}
                    <div className="card no-hover">
                      <h2 className="text-xl font-bold text-text-primary mb-4">Evidence Photos</h2>
                      {loadingEvidence[report.id] ? (
                        <div className="animate-pulse h-48 bg-surface-elevated rounded-lg"></div>
                      ) : evidenceErrors[report.id] ? (
                        <div className="text-center py-8">
                          <p className="text-error mb-3">Failed to load evidence</p>
                          <button
                            onClick={() => {
                              setEvidenceErrors(prev => ({ ...prev, [report.id]: null }))
                              toggleReportExpansion(report.id)
                            }}
                            className="px-4 py-2 bg-info text-white rounded hover:bg-info/80"
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
                        <div className="h-48 bg-surface-elevated rounded-lg flex items-center justify-center border border-dashed border-border">
                          <p className="text-text-muted">No evidence images available</p>
                        </div>
                      )}

                      {report.status !== 'closed' && report.status !== 'resolved' && report.validation_status !== 'rejected' && !(report.on_private_property && report.property_owner_consent_status === 'denied') && (
                        <>
                          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3">Required Evidence</h3>
                          <div className={`grid grid-cols-1 gap-4 ${report.validation_status === 'pending' ? 'md:grid-cols-1 max-w-2xl' : 'md:grid-cols-2'}`}>
                            <div className="p-4 border border-border rounded-lg">
                              <div className="flex justify-between items-center mb-3">
                                <h4 className="font-semibold">{report.validation_status === 'pending' ? 'Verification Photo' : 'Before Photo'}</h4>
                                {report.before_photo_url && (
                                  <button
                                    onClick={() => handleReportPhotoDelete(report.id, 'before')}
                                    disabled={!isAssigned}
                                    className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Delete photo"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
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
                                <label className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg transition-colors ${!isAssigned || uploadingReportPhotos[`${report.id}-before`] ? 'opacity-50 cursor-not-allowed bg-surface' : 'cursor-pointer hover:bg-surface-elevated'}`}>
                                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Camera className="w-8 h-8 text-text-muted mb-3" />
                                    <p className="text-sm text-text-muted font-medium">Click to upload photo</p>
                                  </div>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    disabled={uploadingReportPhotos[`${report.id}-before`] || !isAssigned}
                                    onChange={(e) => e.target.files[0] && handleReportPhotoUpload(report.id, 'before', e.target.files[0])}
                                    className="hidden"
                                  />
                                </label>
                              )}
                              {uploadingReportPhotos[`${report.id}-before`] && <p className="mt-2 text-sm text-text-muted">Uploading...</p>}
                            </div>

                            {/* Only show After Photo for verified cleanup reports */}
                            {report.validation_status !== 'pending' && (
                              <div className="p-4 border border-border rounded-lg">
                                <div className="flex justify-between items-center mb-3">
                                  <h4 className="font-semibold">After Photo</h4>
                                  {report.after_photo_url && (
                                    <button
                                      onClick={() => handleReportPhotoDelete(report.id, 'after')}
                                      disabled={!isAssigned}
                                      className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Delete photo"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                      </svg>
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
                                  <label className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-lg transition-colors ${!isAssigned || uploadingReportPhotos[`${report.id}-after`] ? 'opacity-50 cursor-not-allowed bg-surface' : 'cursor-pointer hover:bg-surface-elevated'}`}>
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                      <Camera className="w-8 h-8 text-text-muted mb-3" />
                                      <p className="text-sm text-text-muted font-medium">Click to upload photo</p>
                                    </div>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      disabled={uploadingReportPhotos[`${report.id}-after`] || !isAssigned}
                                      onChange={(e) => e.target.files[0] && handleReportPhotoUpload(report.id, 'after', e.target.files[0])}
                                      className="hidden"
                                    />
                                  </label>
                                )}
                                {uploadingReportPhotos[`${report.id}-after`] && <p className="mt-2 text-sm text-text-muted">Uploading...</p>}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* LGU Notes */}
                    <div className="card">
                      <h2 className="text-xl font-bold text-text-primary mb-4">LGU Notes</h2>
                      {showNoteInput ? (
                        <div className="space-y-2 mb-4">
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Enter your note..."
                            className="w-full p-3 border border-border rounded-lg bg-surface-elevated text-text-primary resize-none"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleAddNote}
                              disabled={addingNote || !noteText.trim() || !isAssigned}
                              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
                              <div key={index} className="p-3 bg-surface-elevated rounded-lg border border-border">
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
                    <div className="card">
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
                                    <StatusBadge status={response.action_type} type="responseAction" />
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
                        <div className="bg-surface-elevated p-4 rounded-lg border border-border">
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
                        <span className="text-sm text-text-muted">
                          {reports.filter(r => r.stage === 'resolved').length} / {reports.length}
                        </span>
                      </div>
                       <div className="w-full bg-surface-elevated dark:bg-surface-elevated rounded-full h-2.5">
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
                      disabled={markingComplete || !isAssigned}
                      className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {markingComplete ? 'Marking Complete...' : 'Mark Task Complete'}
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
                                onClick={() => router.push(`/dashboard/map-grid?lat=${loc.latitude}&lng=${loc.longitude}&id=${report.id}&validationStatus=${report.validation_status}&status=${report.status}`)}
                                className="btn-secondary w-full"
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
