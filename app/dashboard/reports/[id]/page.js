'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  fetchReportById,
  fetchReportEvidence,
  updateReportStatus,
  updatePropertyOwnerConsent,
  updateLifecycleStage,
  acknowledgeComplaint,
  fetchAgencyResponses,
  lguResolveReport,
  logAgencyResponse
} from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import Notification from '@/components/ui/Notification'
import wkx from 'wkx'
import { Buffer } from 'buffer'

// Polyfill Buffer for browser environment
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.id

  const [report, setReport] = useState(null)
  const [evidence, setEvidence] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [uploadingBefore, setUploadingBefore] = useState(false)
  const [uploadingAfter, setUploadingAfter] = useState(false)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [updatingConsent, setUpdatingConsent] = useState(false)
  const [notification, setNotification] = useState(null)
  const [showLifecycleDropdown, setShowLifecycleDropdown] = useState(false)
  const [updatingLifecycle, setUpdatingLifecycle] = useState(false)
  const lifecycleDropdownRef = useRef(null)
  const statusDropdownRef = useRef(null)
  const [agencyResponses, setAgencyResponses] = useState([])
  const [resolvingReport, setResolvingReport] = useState(false)
  const [activityLogPage, setActivityLogPage] = useState(1)
  const activityLogPerPage = 5

  const loadReportData = async () => {
    setLoading(true)
    try {
      const [reportData, evidenceData, responsesData] = await Promise.all([
        fetchReportById(reportId),
        fetchReportEvidence(reportId),
        fetchAgencyResponses(reportId).catch(() => [])
      ])
      console.log('Report data:', reportData)
      console.log('Profiles data:', reportData?.profiles)
      console.log('Data consent value:', reportData?.profiles?.data_consent)
      console.log('Evidence data:', evidenceData)
      console.log('Agency responses:', responsesData)
      if (reportData) {
        setReport(reportData)
        setEvidence(evidenceData)
        setAgencyResponses(responsesData || [])
      } else {
        setError('Report not found')
      }
    } catch (err) {
      console.error('Error loading report:', err)
      setError('Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReportData()
  }, [reportId])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (lifecycleDropdownRef.current && !lifecycleDropdownRef.current.contains(event.target)) {
        setShowLifecycleDropdown(false)
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setShowStatusDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'waiting_for_feedback':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default:
        return 'bg-red-100 text-red-800 border-red-300'
    }
  }

  const getValidationColor = (status) => {
    switch (status) {
      case 'validated':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
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
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getSatisfactionEmoji = (rating) => {
    switch (rating) {
      case 1:
        return '😢'
      case 2:
        return '😕'
      case 3:
        return '😐'
      case 4:
        return '😊'
      case 5:
        return '😄'
      default:
        return '😐'
    }
  }

  const getSatisfactionLabel = (rating) => {
    switch (rating) {
      case 1:
        return 'Very Dissatisfied'
      case 2:
        return 'Dissatisfied'
      case 3:
        return 'Neutral'
      case 4:
        return 'Satisfied'
      case 5:
        return 'Very Satisfied'
      default:
        return 'Neutral'
    }
  }

  const handleStatusUpdate = async (newStatus) => {
    // Check if trying to mark as resolved without photos
    if (newStatus === 'resolved' && (!report.before_photo_url || !report.after_photo_url)) {
      setNotification({ message: 'Please upload both before and after photos before marking the report as resolved.', type: 'warning' })
      return
    }

    setUpdatingStatus(true)
    try {
      await updateReportStatus(reportId, newStatus)
      // Refresh report data
      const updatedReport = await fetchReportById(reportId)
      setReport(updatedReport)
      setShowStatusDropdown(false)
      setNotification({ message: 'Status updated successfully', type: 'success' })
    } catch (error) {
      console.error('Failed to update status:', error)
      setNotification({ message: 'Failed to update status. Please try again.', type: 'error' })
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleLifecycleStageUpdate = async (newStage) => {
    setUpdatingLifecycle(true)
    try {
      await updateLifecycleStage(reportId, newStage)
      // Refresh report data
      const updatedReport = await fetchReportById(reportId)
      setReport(updatedReport)
      setShowLifecycleDropdown(false)
      setNotification({ message: 'Lifecycle stage updated successfully', type: 'success' })
    } catch (error) {
      console.error('Failed to update lifecycle stage:', error)
      setNotification({ message: 'Failed to update lifecycle stage. Please try again.', type: 'error' })
    } finally {
      setUpdatingLifecycle(false)
    }
  }

  const handleAcknowledgeComplaint = async () => {
    try {
      await acknowledgeComplaint(reportId)
      // Refresh report data
      const updatedReport = await fetchReportById(reportId)

      // Auto-validate Manual_Review reports
      if (updatedReport.validation_status === 'Manual_Review') {
        // Note: This would require a backend API to update validation status
        // For now, we'll just acknowledge and let the user manually validate
        console.log('Report requires manual validation')
      }

      setReport(updatedReport)
      setNotification({ message: 'Complaint acknowledged successfully', type: 'success' })
    } catch (error) {
      console.error('Failed to acknowledge complaint:', error)
      setNotification({ message: 'Failed to acknowledge complaint. Please try again.', type: 'error' })
    }
  }

  const handleResolveReport = async () => {
    setResolvingReport(true)
    try {
      const updatedReport = await lguResolveReport(reportId)
      setReport(updatedReport)
      setNotification({ message: 'Report resolved successfully. Waiting for reporter feedback.', type: 'success' })
    } catch (error) {
      console.error('Failed to resolve report:', error)
      setNotification({ message: 'Failed to resolve report. Please try again.', type: 'error' })
    } finally {
      setResolvingReport(false)
    }
  }

  const handlePhotoUpload = async (photoType, file) => {
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

    const setUploading = photoType === 'before' ? setUploadingBefore : setUploadingAfter
    setUploading(true)

    const token = localStorage.getItem('authToken')
    console.log('Uploading photo:', { token: token ? token.substring(0, 20) + '...' : null, photoType })
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
      console.log('Upload response:', data)
      setReport(data.report)
      setNotification({ message: 'Photo uploaded successfully', type: 'success' })
    } catch (error) {
      console.error('Failed to upload photo:', error)
      setNotification({ message: error.message || 'Failed to upload photo. Please try again.', type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const handlePhotoDelete = async (photoType) => {
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
      setReport(data.report)
      setNotification({ message: 'Photo deleted successfully', type: 'success' })
    } catch (error) {
      console.error('Failed to delete photo:', error)
      setNotification({ message: error.message || 'Failed to delete photo. Please try again.', type: 'error' })
    }
  }

  const handleAddNote = async () => {
    if (!noteText.trim()) return

    setAddingNote(true)
    try {
      await logAgencyResponse(reportId, { action: noteText })
      await loadReportData() // Refresh all data
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

  const handlePropertyOwnerConsent = async (newStatus) => {
    setUpdatingConsent(true)
    try {
      await updatePropertyOwnerConsent(reportId, newStatus)
      await loadReportData()
      setNotification({ message: 'Property owner consent status updated', type: 'success' })
    } catch (error) {
      console.error('Failed to update consent status:', error)
      setNotification({ message: 'Failed to update consent status', type: 'error' })
    } finally {
      setUpdatingConsent(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <PageHeader
          title="Report Details"
          subtitle="Loading report information..."
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Reports', href: '/dashboard/reports' },
            { label: 'Details' }
          ]}
        />
        <div className="card">
          <p className="text-text-muted">Loading report details...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="p-8">
        <PageHeader
          title="Report Details"
          subtitle="Error loading report"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Reports', href: '/dashboard/reports' },
            { label: 'Details' }
          ]}
        />
        <div className="card">
          <p className="text-error">{error || 'Report not found'}</p>
          <button
            onClick={() => router.back()}
            className="btn-secondary mt-4"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const location = parseLocation(report.location, report.latitude, report.longitude)
  const dateStr = new Date(report.created_at).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <div className="flex flex-col h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="p-8 pb-4">
          <div className="flex items-center justify-between">
            <PageHeader
              title="Report Details"
              subtitle="View detailed report information"
              breadcrumbs={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Reports', href: '/dashboard/reports' },
                { label: 'Details' }
              ]}
            />
            <button
              onClick={loadReportData}
              disabled={loading}
              className="btn-secondary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Lifecycle Timeline - Centerpiece */}
              <div className="card border-2 border-[var(--accent-green)]">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-text-primary mb-2">Report Lifecycle</h2>
                  <div className="flex justify-center gap-3 flex-wrap">
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(report.status)}`}>
                      {report.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getValidationColor(report.validation_status)}`}>
                      {report.validation_status === 'validated' ? 'AI VALIDATED' : report.validation_status.toUpperCase()}
                    </span>
                    {report.on_private_property && (
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${report.property_owner_consent_status === 'obtained'
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : report.property_owner_consent_status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                          : report.property_owner_consent_status === 'denied'
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : 'bg-gray-100 text-gray-800 border-gray-300'
                        }`}>
                        {report.property_owner_consent_status.toUpperCase()}
                      </span>
                    )}
                    {report.stage && (
                      <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getLifecycleStageColor(report.stage)}`}>
                        {report.stage.replace('_', ' ').toUpperCase()}
                      </span>
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
                    const totalSegments = stages.length - 1 // 3 segments

                    // The green line starts at the center of the first dot (12px from left edge of the track).
                    // The total width of the track (gray line) is `calc(100% - 24px)`.
                    // The width of each segment of the track is `(100% - 24px) / totalSegments`.

                    let lineWidthCalc = '0px'
                    if (currentIndex === 0) {
                      lineWidthCalc = '12px' // Line extends to the center of the first dot
                    } else if (currentIndex > 0) {
                      // Width = (half of first dot) + (width of completed segments)
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

                {report.status === 'closed' && report.satisfaction_rating && (
                  <div className="mt-6 p-4 bg-surface rounded-lg border border-border">
                    <h3 className="font-semibold text-text-primary mb-2">Reporter Satisfaction</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-4xl">{getSatisfactionEmoji(report.satisfaction_rating)}</span>
                      <span className="text-lg font-medium">{getSatisfactionLabel(report.satisfaction_rating)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Report Information */}
              <div className="card">
                <h1 className="text-3xl font-bold text-text-primary mb-2">{report.title}</h1>
                <p className="text-lg text-text-secondary mb-6">Issue: {report.issue_type || 'General'}</p>

                <h2 className="text-lg font-semibold text-text-primary mb-3">Description</h2>
                <p className="text-text-primary leading-relaxed mb-6">
                  {report.description || 'No description provided.'}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-surface p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-accent-green/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-accent-green" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-text-secondary">Location</p>
                    </div>
                    <p className="text-text-primary text-sm">
                      {location.latitude && location.longitude
                        ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                        : 'Not available'
                      }
                    </p>
                  </div>
                  <div className="bg-surface p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-accent-green/10 flex items-center justify-center">
                        <svg className="w-4 h-4 text-accent-green" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-text-secondary">Submitted</p>
                    </div>
                    <p className="text-text-primary text-sm">{dateStr}</p>
                  </div>
                </div>

                {/* Reporter Info - Moved to main content */}
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-lg font-semibold text-text-primary mb-3">Reporter Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-surface p-4 rounded-lg border border-border">
                      <p className="text-xs text-text-muted mb-1">Name</p>
                      <p className="text-text-primary font-medium text-sm">
                        {report.profiles?.data_consent === true
                          ? (report.profiles?.full_name || report.user_full_name || 'Anonymous')
                          : 'Information not disclosed'
                        }
                      </p>
                    </div>
                    <div className="bg-surface p-4 rounded-lg border border-border">
                      <p className="text-xs text-text-muted mb-1">User ID</p>
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

              {/* Evidence Photos */}
              <div className="card">
                <h2 className="text-xl font-bold text-text-primary mb-4">Evidence Photos</h2>
                {evidence.length === 0 ? (
                  <div className="h-48 bg-surface rounded-lg flex items-center justify-center border border-dashed border-border">
                    <div className="text-center">
                      <svg className="w-12 h-12 text-text-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-text-muted">No evidence images available</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {evidence.map((img, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={img.url}
                          alt={`Evidence ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setSelectedImage(img.url)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Before & After Photos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {/* Before Photo */}
                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold">Before Photo</h3>
                      {report.before_photo_url && (
                        <button
                          onClick={() => handlePhotoDelete('before')}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    {report.before_photo_url ? (
                      <img src={report.before_photo_url} alt="Before" className="w-full h-48 object-cover rounded-lg" />
                    ) : (
                      <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${uploadingBefore ? 'border-gray-300 bg-gray-50' : 'border-border hover:border-accent-green hover:bg-accent-green/5'
                          }`}
                        onClick={() => document.getElementById('before-photo-input').click()}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-accent-green', 'bg-accent-green/10'); }}
                        onDragLeave={(e) => { e.currentTarget.classList.remove('border-accent-green', 'bg-accent-green/10'); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('border-accent-green', 'bg-accent-green/10');
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handlePhotoUpload('before', e.dataTransfer.files[0]);
                          }
                        }}
                      >
                        <input
                          id="before-photo-input"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          disabled={uploadingBefore}
                          onChange={(e) => e.target.files[0] && handlePhotoUpload('before', e.target.files[0])}
                          className="hidden"
                        />
                        {uploadingBefore ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm text-text-muted">Uploading...</p>
                          </div>
                        ) : (
                          <>
                            <svg className="w-12 h-12 text-text-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm font-medium text-text-primary">Click or drag to upload</p>
                            <p className="text-xs text-text-muted mt-1">JPG, PNG, or WEBP • Max 10MB</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* After Photo */}
                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold">After Photo</h3>
                      {report.after_photo_url && (
                        <button
                          onClick={() => handlePhotoDelete('after')}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    {report.after_photo_url ? (
                      <img src={report.after_photo_url} alt="After" className="w-full h-48 object-cover rounded-lg" />
                    ) : (
                      <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${uploadingAfter ? 'border-gray-300 bg-gray-50' : 'border-border hover:border-accent-green hover:bg-accent-green/5'
                          }`}
                        onClick={() => document.getElementById('after-photo-input').click()}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-accent-green', 'bg-accent-green/10'); }}
                        onDragLeave={(e) => { e.currentTarget.classList.remove('border-accent-green', 'bg-accent-green/10'); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('border-accent-green', 'bg-accent-green/10');
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handlePhotoUpload('after', e.dataTransfer.files[0]);
                          }
                        }}
                      >
                        <input
                          id="after-photo-input"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          disabled={uploadingAfter}
                          onChange={(e) => e.target.files[0] && handlePhotoUpload('after', e.target.files[0])}
                          className="hidden"
                        />
                        {uploadingAfter ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm text-text-muted">Uploading...</p>
                          </div>
                        ) : (
                          <>
                            <svg className="w-12 h-12 text-text-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm font-medium text-text-primary">Click or drag to upload</p>
                            <p className="text-xs text-text-muted mt-1">JPG, PNG, or WEBP • Max 10MB</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* LGU Notes - Moved to main content */}
              <div className="card">
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
                      ))
                    }
                  </div>
                ) : (
                  <p className="text-text-muted text-sm">No notes yet</p>
                )}
              </div>

              {/* Audit Log - Moved to main content */}
              <div className="card">
                <h2 className="text-xl font-bold text-text-primary mb-4">Activity Log</h2>
                {agencyResponses && agencyResponses.length > 0 ? (
                  <>
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
                          {agencyResponses
                            .slice((activityLogPage - 1) * activityLogPerPage, activityLogPage * activityLogPerPage)
                            .map((response, index) => (
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

                    {/* Pagination */}
                    {Math.ceil(agencyResponses.length / activityLogPerPage) > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <p className="text-sm text-text-muted">
                          Showing {((activityLogPage - 1) * activityLogPerPage) + 1} to {Math.min(activityLogPage * activityLogPerPage, agencyResponses.length)} of {agencyResponses.length} activities
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setActivityLogPage(prev => prev - 1)}
                            disabled={activityLogPage === 1}
                            className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setActivityLogPage(prev => prev + 1)}
                            disabled={activityLogPage === Math.ceil(agencyResponses.length / activityLogPerPage)}
                            className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-surface p-4 rounded-lg border border-border">
                    <p className="text-text-muted text-sm">
                      No activity logged for this report yet.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar - Simplified */}
            <div className="space-y-6 sticky top-4 self-start z-50">
              {/* Report Metadata */}
              <div className="card">
                <h2 className="text-lg font-bold text-text-primary mb-4">Report Details</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-text-muted">Report ID</p>
                    <p className="text-text-primary font-medium text-sm">{report.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Created</p>
                    <p className="text-text-primary font-medium text-sm">{dateStr}</p>
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
                </div>
              </div>

              {/* Property Owner Consent */}
              {report.on_private_property && (
                <div className="card">
                  <h2 className="text-lg font-bold text-text-primary mb-4">Property Owner Consent</h2>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-text-muted">Current Status</p>
                      <p className="text-text-primary font-medium">
                        {report.property_owner_consent_status.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handlePropertyOwnerConsent('pending')}
                        disabled={updatingConsent}
                        className={`text-sm py-2 rounded-lg border transition-all ${report.property_owner_consent_status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-300 font-semibold'
                          : 'btn-secondary'
                          }`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => handlePropertyOwnerConsent('obtained')}
                        disabled={updatingConsent}
                        className={`text-sm py-2 rounded-lg border transition-all ${report.property_owner_consent_status === 'obtained'
                          ? 'bg-green-600 text-white border-green-600 font-semibold'
                          : 'btn-primary'
                          }`}
                      >
                        Obtained
                      </button>
                      <button
                        onClick={() => handlePropertyOwnerConsent('denied')}
                        disabled={updatingConsent}
                        className={`text-sm py-2 rounded-lg border transition-all ${report.property_owner_consent_status === 'denied'
                          ? 'bg-red-100 text-red-800 border-red-300 font-semibold'
                          : 'btn-secondary'
                          }`}
                      >
                        Denied
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="card">
                <h2 className="text-lg font-bold text-text-primary mb-4">Actions</h2>
                <div className="space-y-3">
                  {/* Lifecycle Stage Control */}
                  <div className="relative" ref={lifecycleDropdownRef}>
                    <button
                      onClick={() => {
                        setShowLifecycleDropdown(!showLifecycleDropdown)
                        setShowStatusDropdown(false)
                      }}
                      className="btn-primary w-full"
                    >
                      {updatingLifecycle ? 'Updating...' : 'Update Lifecycle Stage'}
                    </button>
                    {showLifecycleDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-lg shadow-lg z-50">
                        <button
                          onClick={() => handleLifecycleStageUpdate('acknowledged')}
                          disabled={report.stage !== 'submitted'}
                          className={`w-full px-4 py-3 text-left border-b border-border transition-colors ${report.stage === 'acknowledged'
                            ? 'bg-blue-100 text-blue-800 font-semibold cursor-not-allowed'
                            : report.stage === 'submitted'
                              ? 'text-text-primary hover:bg-blue-50'
                              : 'text-gray-400 cursor-not-allowed'
                            }`}
                        >
                          <span className="font-medium">Acknowledged</span>
                        </button>
                        <button
                          onClick={() => handleLifecycleStageUpdate('responded')}
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
                          onClick={() => handleLifecycleStageUpdate('resolved')}
                          disabled={report.stage !== 'responded'}
                          className={`w-full px-4 py-3 text-left transition-colors ${report.stage === 'resolved'
                            ? 'bg-green-100 text-green-800 font-semibold cursor-not-allowed'
                            : report.stage === 'responded'
                              ? 'text-text-primary hover:bg-green-50'
                              : 'text-gray-400 cursor-not-allowed'
                            }`}
                        >
                          <span className="font-medium">Resolved</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Status Control */}
                  {/* <div className="relative">
                    <button
                      onClick={() => {
                        setShowStatusDropdown(!showStatusDropdown)
                        setShowLifecycleDropdown(false)
                      }}
                      className="btn-secondary w-full"
                    >
                      {updatingStatus ? 'Updating...' : 'Update Status'}
                    </button>
                    {showStatusDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-lg shadow-lg z-[9999] pointer-events-auto">
                        <button
                          onClick={() => handleStatusUpdate('unresolved')}
                          className={`w-full px-4 py-3 text-left border-b border-border last:border-b-0 transition-colors ${report.status === 'unresolved'
                            ? 'bg-accent-green/20 text-accent-green font-semibold'
                            : 'text-text-primary hover:bg-accent-green/10'
                            }`}
                        >
                          <span className="font-medium">Unresolved</span>
                          {report.status === 'unresolved'}
                        </button>
                        <button
                          onClick={() => handleStatusUpdate('in_progress')}
                          className={`w-full px-4 py-3 text-left border-b border-border last:border-b-0 transition-colors ${report.status === 'in_progress'
                            ? 'bg-accent-green/20 text-accent-green font-semibold'
                            : 'text-text-primary hover:bg-accent-green/10'
                            }`}
                        >
                          <span className="font-medium">In Progress</span>
                          {report.status === 'in_progress'}
                        </button>
                        <button
                          onClick={() => handleStatusUpdate('resolved')}
                          disabled={report.status === 'resolved'}
                          className={`w-full px-4 py-3 text-left transition-colors ${report.status === 'resolved'
                            ? 'bg-accent-green/20 text-accent-green font-semibold cursor-not-allowed'
                            : 'text-text-primary hover:bg-accent-green/10'
                            }`}
                        >
                          <span className="font-medium">Resolved</span>
                        </button>
                      </div>
                    )}
                  </div> */}

                  <button
                    onClick={() => router.push('/dashboard/map-view')}
                    className="btn-secondary w-full"
                  >
                    View on Map
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[2000]"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] p-4">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white text-4xl hover:text-gray-300 transition-colors"
            >
              ×
            </button>
            <img
              src={selectedImage}
              alt="Full size evidence"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}

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
