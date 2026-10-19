'use client'
import SecureImage from '@/components/ui/SecureImage'
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
import { Pen, Users, X } from 'lucide-react'
import { OfficerGuard } from '@/components/auth/RequireRole'
import ReportDetailModal from '@/components/reports/ReportDetailModal'
import Dialog from '@/components/ui/Dialog'
import styles from './OperationDetails.module.css'
import { reportDiagnostic } from '../../../../../lib/diagnostics.mjs';

const OperationsMap = dynamic(() => import('@/components/map/OperationsMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-surface-elevated animate-pulse flex items-center justify-center">
      <span className="text-text-muted text-sm" role="status">Loading map…</span>
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
    reportDiagnostic('error', 'dispatch', 'Error parsing location:', error)
  }

  return { latitude: null, longitude: null }
}

function CleanupTaskDetailContent() {
  const [task, setTask] = useState(null)
  const [reports, setReports] = useState([])
  const [reportsEvidence, setReportsEvidence] = useState({})
  const [loading, setLoading] = useState(true)
  const [markingComplete, setMarkingComplete] = useState(false) // kept for in-flight guard only
  const [completingReportId, setCompletingReportId] = useState(null)
  const [notification, setNotification] = useState(null)
  const [expandedReports, setExpandedReports] = useState({})
  const [lightboxImage, setLightboxImage] = useState(null)
  const [validatingReport, setValidatingReport] = useState(null)
  const [loadingEvidence, setLoadingEvidence] = useState({})
  const [evidenceErrors, setEvidenceErrors] = useState({})
  const abortControllersRef = useRef({})
  const [viewMode, setViewMode] = useState('table') // 'table' or 'detail'
  const [selectedReportId, setSelectedReportId] = useState(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showLifecycleDropdown, setShowLifecycleDropdown] = useState(false)
  const [updatingLifecycle, setUpdatingLifecycle] = useState(false)
  const lifecycleDropdownRef = useRef(null)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [agencyResponses, setAgencyResponses] = useState([])
  const [availableCrew, setAvailableCrew] = useState([])
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [assignmentError, setAssignmentError] = useState('')
  const cancelAssignmentRef = useRef(null)
  useEffect(() => { if (showAssignmentModal) cancelAssignmentRef.current?.focus() }, [showAssignmentModal])
  const [selectedCrewId, setSelectedCrewId] = useState(null)
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
      } catch (error) {
        reportDiagnostic('error', 'dispatch', 'Failed to load cleanup task:', error)
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
        reportDiagnostic('error', 'dispatch', 'Failed to load available crew:', error)
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

  const handleAssignTask = async (crewId) => {
    setAssigning(true)
    setAssignmentError('')
    try {
      await assignCleanupTask(taskId, crewId)
      const updatedTask = await fetchCleanupTaskById(taskId)
      setTask(updatedTask)
      setShowAssignmentModal(false)
      setNotification({ message: 'Crew deployed successfully', type: 'success' })
    } catch (error) {
      reportDiagnostic('error', 'dispatch', 'Failed to assign task:', error)
      setAssignmentError(error.message || 'The crew could not be assigned. Please try again.')
      setNotification({ message: error.message || 'Failed to assign crew. Please try again.', type: 'error' })
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
      reportDiagnostic('error', 'dispatch', 'Failed to update title:', error)
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
      reportDiagnostic('error', 'dispatch', 'Failed to update lifecycle stage:', error)
      setNotification({ message: 'Failed to update lifecycle stage. Please try again.', type: 'error' })
    } finally {
      setUpdatingLifecycle(false)
    }
  }

  const handleMarkReportComplete = async (reportId) => {
    const report = reports.find(r => r.id === reportId)
    
    // Check if the report is validated
    if (report.validation_status !== 'validated' && report.validation_status !== 'approved') {
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
      reportDiagnostic('error', 'dispatch', 'Failed to mark report complete:', error)
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
      reportDiagnostic('error', 'dispatch', 'Failed to validate report:', error)
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
      reportDiagnostic('error', 'dispatch', 'Failed to reject report:', error)
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
      reportDiagnostic('error', 'dispatch', 'Failed to add note:', error)
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
      reportDiagnostic('error', 'dispatch', 'Failed to load agency responses:', error)
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
            reportDiagnostic('error', 'dispatch', 'Failed to fetch evidence for report:', reportId, error)
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
              reportDiagnostic('error', 'dispatch', 'Failed to fetch evidence for report:', nextReportId, error)
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
              reportDiagnostic('error', 'dispatch', 'Failed to fetch evidence for report:', prevReportId, error)
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
        const evidence = await fetchReportEvidence(reportId, controller.signal)
        setReportsEvidence(prev => ({
          ...prev,
          [reportId]: evidence || []
        }))
      } catch (error) {
        if (error.name !== 'AbortError') {
          reportDiagnostic('error', 'dispatch', 'Failed to fetch evidence for report:', reportId, error)
          setEvidenceErrors(prev => ({ ...prev, [reportId]: error.message }))
          setNotification({ message: 'Failed to load evidence. Please try again.', type: 'error' })
        }
      } finally {
        setLoadingEvidence(prev => ({ ...prev, [reportId]: false }))
        delete abortControllersRef.current[reportId]
      }
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
    <div className="workspace-page workspace-page--flow">
      <PageHeader
        title={
          isEditingTitle ? (
            <span className="flex flex-wrap items-center gap-2">
              <input 
                type="text" 
                value={editingTitle} 
                onChange={(e) => setEditingTitle(e.target.value)} 
                aria-label="Operation title"
                className="input max-w-full w-64 text-xl"
                disabled={savingTitle}
                autoFocus
              />
              <button 
                onClick={handleSaveTitle}
                disabled={savingTitle}
                className="btn-primary text-sm"
              >
                {savingTitle ? 'Saving...' : 'Save'}
              </button>
              <button 
                onClick={() => setIsEditingTitle(false)}
                disabled={savingTitle}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </span>
          ) : (
            <span className="flex items-center gap-3">
              <span>{task.title}</span>
              <button 
                onClick={() => {
                  setEditingTitle(task.title)
                  setIsEditingTitle(true)
                }}
                className="text-text-secondary hover:text-primary min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl"
                aria-label="Rename operation"
              >
                <Pen className="w-5 h-5" />
              </button>
            </span>
          )
        }
        subtitle={`Operation / ${task.id.slice(0,8)}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard/officer' },
          { label: 'Operations', href: '/dashboard/officer/operations' },
          { label: `Op #${task.id.slice(0,8)}` }
        ]}
      />

      <div className="flex flex-col gap-6">
         
         <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <section className={`xl:col-span-3 ${styles.routeCard}`} aria-labelledby="operation-route-title">
              <div className={styles.routeHeader}><h2 id="operation-route-title">Route map</h2><p>Report locations and connections for this operation.</p></div>
              <div className={styles.routeMap}><OperationsMap tasks={[{ ...task, reports }]} modern={true} /></div>
            </section>


            <div className="xl:col-span-1 h-[400px]">
               <div className="h-full card p-6 border border-border dark:border-[#333333] rounded-xl bg-surface-elevated text-text-primary flex flex-col">
                  <h2 className="text-lg font-semibold mb-4 border-b border-border pb-3 shrink-0">Operation status</h2>
                  
                  <div className="space-y-4 mb-6 overflow-y-auto flex-1 pr-2">
                    <div>
                       <span className="block text-sm text-text-secondary mb-2">Current status</span>
                       <StatusBadge status={task.status} type="task" />
                    </div>
                    
                    <div>
                       <span className="block text-sm text-text-secondary mb-2">Assigned field crew</span>
                       {task.assigned_field_crew_id ? (
                          (() => {
                             const crew = availableCrew.find(c => c.id === task.assigned_field_crew_id)
                             return (
                               <div className="bg-background p-3 border border-border">
                                 <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 bg-surface-elevated rounded-full flex items-center justify-center font-bold text-xs border border-border">
                                     <Users className="w-4 h-4 text-accent-green" />
                                   </div>
                                   <div>
                                     <div className="text-sm font-medium">{crew ? (crew.crew_name || crew.name) : `Crew ${task.assigned_field_crew_id.slice(0, 8)}`}</div>
                                     <div className="text-xs text-text-secondary">{crew?.member_count || task.assigned_crew_ids?.length || 0} members</div>
                                   </div>
                                 </div>
                               </div>
                             )
                          })()
                       ) : task.assigned_crew_ids && task.assigned_crew_ids.length > 0 ? (
                          <div className="flex flex-col gap-2">
                             {task.assigned_crew_ids.map(id => {
                                const crew = availableCrew.find(c => c.id === id)
                                return (
                                  <div key={id} className="flex items-center gap-3 bg-background p-2 border border-border">
                                    <div className="w-8 h-8 bg-surface-elevated rounded-full flex items-center justify-center font-bold text-xs border border-border">
                                      {crew ? (crew.crew_name || crew.name || crew.full_name || 'C')[0] : 'U'}
                                    </div>
                                    <span className="text-sm">{crew ? (crew.crew_name || crew.name || crew.full_name) : `Unit ${id.slice(0,4)}`}</span>
                                  </div>
                                )
                             })}
                          </div>
                       ) : (
                          <div className="text-sm text-error border border-error/30 p-3 bg-error/10 rounded-xl">Unassigned</div>
                       )}
                    </div>
                  </div>

                  <div className="mt-auto space-y-3 pt-4 border-t border-border shrink-0">
                     <button 
                        onClick={() => {
                          setSelectedCrewId(task.assigned_field_crew_id || null)
                          setShowAssignmentModal(true)
                        }}
                        className="btn-secondary w-full text-sm"
                     >
                        {task.assigned_field_crew_id || task.assigned_crew_ids?.length > 0 ? 'Reassign Crew' : 'Dispatch Crew'}
                     </button>
                     {/* Completion is triggered automatically by the field crew app
                         uploading the after photo. This panel reflects the live status. */}
                     {task.status === 'completed' && (
                        <div className="w-full py-3 text-sm border rounded-xl bg-success/10 text-success border-success/30 text-center">
                           Operation completed
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>

         <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-text-primary">Reports in this operation</h2>
            <div className="ecopin-table-container">
              <table className="ecopin-table">
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>Target</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td className="font-mono text-xs whitespace-nowrap">
                        {new Date(report.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="font-bold">{report.title}</td>
                      <td>{report.issue_type}</td>
                      <td><StatusBadge status={report.status} type="report" /></td>
                      <td>
                        <button
                          onClick={() => handleViewReportDetail(report.id)}
                          className="btn-secondary text-sm"
                        >
                          View report
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
        <Dialog open={showAssignmentModal} onClose={() => setShowAssignmentModal(false)} dismissible={!assigning} labelledBy="assign-crew-title">
          <div className={styles.assignment}>
            <div className={styles.header}>
              <div><h2 id="assign-crew-title">Reassign field crew</h2><p>Choose an available crew for this operation.</p></div>
              <button type="button" className={styles.close} aria-label="Close crew selection" disabled={assigning} onClick={() => setShowAssignmentModal(false)}><X size={20} aria-hidden="true" /></button>
            </div>
            <fieldset className={styles.crewList} disabled={assigning}>
              <legend className="sr-only">Available field crews</legend>
              {assignmentError && <p className={styles.assignmentError} role="alert">{assignmentError}</p>}
              {availableCrew.length === 0 ? <p className={styles.empty}>No field crews are available.</p> : availableCrew.map(crew => {
                const activeCount = crew.active_task_count ?? crew.assigned_tasks_count ?? 0
                const maxTasks = crew.max_tasks_per_shift || 10
                const isAtCapacity = crew.is_at_capacity || activeCount >= maxTasks
                return (
                  <label key={crew.id} className={`${styles.crew} ${selectedCrewId === crew.id ? styles.selected : ''}`}>
                    <input type="radio" name="fieldCrewSelection" checked={selectedCrewId === crew.id} onChange={() => setSelectedCrewId(crew.id)} />
                    <span className="flex-1">
                      <strong>{crew.crew_name || crew.name || crew.full_name}</strong>
                      <small>{crew.member_count != null ? `${crew.member_count} members` : crew.status ? `Status: ${crew.status.replaceAll('_', ' ')}` : 'Field crew unit'}</small>
                      <span className={`${styles.crewWorkloadBadge} ${isAtCapacity ? styles.crewWorkloadCapacity : activeCount > 0 ? styles.crewWorkloadActive : styles.crewWorkloadAvailable}`}>
                        {isAtCapacity
                          ? `⚠️ At Capacity (${activeCount}/${maxTasks} tasks)`
                          : activeCount > 0
                          ? `${activeCount} active task${activeCount > 1 ? 's' : ''} (${activeCount}/${maxTasks})`
                          : 'Available · 0 active tasks'}
                      </span>
                    </span>
                  </label>
                )
              })}
            </fieldset>
            <div className={styles.actions}>
              <button ref={cancelAssignmentRef} type="button" disabled={assigning} onClick={() => setShowAssignmentModal(false)} className={styles.secondary}>Cancel</button>
              <button type="button" onClick={() => handleAssignTask(selectedCrewId)} disabled={assigning || !selectedCrewId} className={styles.primary}>{assigning ? 'Assigning crew…' : 'Confirm assignment'}</button>
            </div>
          </div>
        </Dialog>
      )}

      {selectedReportId && (
        <ReportDetailModal
          className={styles.reportDialog}
          report={reports.find(r => r.id === selectedReportId)}
          evidence={reportsEvidence[selectedReportId] || []}
          agencyResponses={agencyResponses}
          onClose={() => setSelectedReportId(null)}
        />
      )}
    </div>
  )
}

export default function CleanupTaskDetailPage() {
  return (
    <OfficerGuard>
      <CleanupTaskDetailContent />
    </OfficerGuard>
  )
}
