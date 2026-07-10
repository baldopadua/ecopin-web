'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  fetchReportById, 
  fetchReportEvidence, 
  updateReportStatus, 
  updatePropertyOwnerConsent, 
  fetchDisclosureRequests, 
  createDisclosureRequest, 
  respondToDisclosureRequest,
  updateLifecycleStage,
  acknowledgeComplaint,
  fetchAgencyResponses
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
  const [disclosureRequests, setDisclosureRequests] = useState([])
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
  const [showDisclosureModal, setShowDisclosureModal] = useState(false)
  const [disclosureRequestType, setDisclosureRequestType] = useState('identity')
  const [disclosureRequestNotes, setDisclosureRequestNotes] = useState('')
  const [notification, setNotification] = useState(null)
  const [showLifecycleDropdown, setShowLifecycleDropdown] = useState(false)
  const [updatingLifecycle, setUpdatingLifecycle] = useState(false)
  const [agencyResponses, setAgencyResponses] = useState([])

  useEffect(() => {
    Promise.all([
      fetchReportById(reportId),
      fetchReportEvidence(reportId),
      fetchDisclosureRequests(reportId).catch(() => []),
      fetchAgencyResponses(reportId).catch(() => [])
    ]).then(([reportData, evidenceData, disclosureRequestsData, responsesData]) => {
      console.log('Report data:', reportData)
      console.log('Evidence data:', evidenceData)
      console.log('Disclosure requests:', disclosureRequestsData)
      console.log('Agency responses:', responsesData)
      if (reportData) {
        setReport(reportData)
        setEvidence(evidenceData)
        setDisclosureRequests(disclosureRequestsData)
        setAgencyResponses(responsesData || [])
      } else {
        setError('Report not found')
      }
      setLoading(false)
    }).catch(err => {
      console.error('Error loading report:', err)
      setError('Failed to load report')
      setLoading(false)
    })
  }, [reportId])

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
      setReport(updatedReport)
      setNotification({ message: 'Complaint acknowledged successfully', type: 'success' })
    } catch (error) {
      console.error('Failed to acknowledge complaint:', error)
      setNotification({ message: 'Failed to acknowledge complaint. Please try again.', type: 'error' })
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
    const token = localStorage.getItem('authToken')

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/reports/${reportId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ note: noteText }),
      })

      if (!response.ok) {
        throw new Error('Failed to add note')
      }

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
      const updatedReport = await updatePropertyOwnerConsent(reportId, newStatus)
      setReport(updatedReport)
      setNotification({ message: 'Property owner consent status updated', type: 'success' })
    } catch (error) {
      console.error('Failed to update consent status:', error)
      setNotification({ message: 'Failed to update consent status', type: 'error' })
    } finally {
      setUpdatingConsent(false)
    }
  }

  const handleCreateDisclosureRequest = async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    try {
      await createDisclosureRequest(reportId, user.id, disclosureRequestType, disclosureRequestNotes)
      const updatedRequests = await fetchDisclosureRequests(reportId)
      setDisclosureRequests(updatedRequests)
      setShowDisclosureModal(false)
      setDisclosureRequestNotes('')
      setNotification({ message: 'Disclosure request created', type: 'success' })
    } catch (error) {
      console.error('Failed to create disclosure request:', error)
      setNotification({ message: 'Failed to create disclosure request', type: 'error' })
    }
  }

  const handleRespondToDisclosure = async (disclosureRequestId, status, responseText) => {
    try {
      await respondToDisclosureRequest(reportId, disclosureRequestId, status, responseText)
      const updatedRequests = await fetchDisclosureRequests(reportId)
      setDisclosureRequests(updatedRequests)
      setNotification({ message: 'Response submitted', type: 'success' })
    } catch (error) {
      console.error('Failed to respond to disclosure request:', error)
      setNotification({ message: 'Failed to submit response', type: 'error' })
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
    <div className="p-8">
      <PageHeader
        title="Report Details"
        subtitle="View detailed report information"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports', href: '/dashboard/reports' },
          { label: 'Details' }
        ]}
      />

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
            <div className="flex items-center justify-center gap-2 px-4">
              {['submitted', 'acknowledged', 'responded', 'resolved', 'closed'].map((stage, index) => {
                const stages = ['submitted', 'acknowledged', 'responded', 'resolved', 'closed']
                const currentIndex = stages.indexOf(report.stage)
                const isCompleted = currentIndex >= index
                const isCurrent = report.stage === stage
                return (
                  <div key={stage} className="flex-1 flex flex-col items-center max-w-[100px]">
                    <div className={`w-6 h-6 rounded-full ${isCurrent ? 'bg-[var(--success)] ring-4 ring-[var(--success)]/20' : isCompleted ? 'bg-[var(--accent-green)]' : 'bg-gray-300'} transition-all`} />
                    <span className={`text-xs mt-2 font-medium ${isCurrent ? 'text-[var(--success)]' : isCompleted ? 'text-[var(--accent-green)]' : 'text-text-muted'}`}>
                      {stage.replace('_', ' ')}
                    </span>
                    {index < 4 && <div className={`w-full h-1 mt-2 ${isCurrent ? 'bg-[var(--success)]' : isCompleted ? 'bg-[var(--accent-green)]' : 'bg-gray-300'}`} />}
                  </div>
                )
              })}
            </div>
            {report.stage === 'submitted' && (
              <div className="mt-6 text-center">
                <button onClick={handleAcknowledgeComplaint} className="btn-primary">
                  Acknowledge Complaint
                </button>
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
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingBefore}
                    onChange={(e) => e.target.files[0] && handlePhotoUpload('before', e.target.files[0])}
                    className="w-full"
                  />
                )}
                {uploadingBefore && <p className="mt-2 text-sm text-text-muted">Uploading...</p>}
              </div>

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
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingAfter}
                    onChange={(e) => e.target.files[0] && handlePhotoUpload('after', e.target.files[0])}
                    className="w-full"
                  />
                )}
                {uploadingAfter && <p className="mt-2 text-sm text-text-muted">Uploading...</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Reporter Info & Report Metadata */}
          <div className="card">
            <h2 className="text-lg font-bold text-text-primary mb-4">Report Information</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-text-secondary mb-2">Reporter</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-text-muted">Name</p>
                    <p className="text-text-primary font-medium text-sm">
                      {report.profiles?.data_consent 
                        ? (report.profiles?.full_name || report.user_full_name || 'Anonymous')
                        : 'Information not disclosed'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">User ID</p>
                    <p className="text-text-primary font-medium text-sm">
                      {report.profiles?.data_consent 
                        ? (report.user_id || 'N/A')
                        : 'Information not disclosed'
                      }
                    </p>
                  </div>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-sm font-semibold text-text-secondary mb-2">Report Details</p>
                <div className="space-y-2">
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
                    className={`btn-secondary text-sm py-2 ${report.property_owner_consent_status === 'pending' ? 'bg-yellow-100' : ''}`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => handlePropertyOwnerConsent('obtained')}
                    disabled={updatingConsent}
                    className={`btn-primary text-sm py-2 ${report.property_owner_consent_status === 'obtained' ? 'bg-green-600' : ''}`}
                  >
                    Obtained
                  </button>
                  <button
                    onClick={() => handlePropertyOwnerConsent('denied')}
                    disabled={updatingConsent}
                    className={`btn-secondary text-sm py-2 ${report.property_owner_consent_status === 'denied' ? 'bg-red-100' : ''}`}
                  >
                    Denied
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Disclosure Requests */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-text-primary">Disclosure Requests</h2>
              <button
                onClick={() => setShowDisclosureModal(true)}
                className="btn-secondary text-sm"
              >
                New Request
              </button>
            </div>
            {disclosureRequests.length === 0 ? (
              <div className="bg-surface p-4 rounded-lg border border-border">
                <p className="text-text-muted text-sm">
                  No disclosure requests yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
               {disclosureRequests.map((req, idx) => (
                  <div key={idx} className="bg-surface p-4 rounded-lg border border-border">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${req.status === 'approved' ? 'bg-green-100 text-green-800' :
                        req.status === 'denied' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                        {req.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-text-muted">
                        {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-text-primary">
                      {req.request_type.toUpperCase()} Request
                    </p>
                    {req.requester_notes && (
                      <p className="text-sm text-text-secondary mt-1">{req.requester_notes}</p>
                    )}
                    {req.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleRespondToDisclosure(req.id, 'approved', '')}
                          className="btn-primary text-sm py-1 flex-1"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRespondToDisclosure(req.id, 'denied', '')}
                          className="btn-secondary text-sm py-1 flex-1"
                        >
                          Deny
                        </button>
                      </div>
                    )}
                    {req.reporter_response && (
                      <p className="text-sm text-text-secondary mt-2 border-t border-border pt-2">
                        <span className="font-medium">Response:</span> {req.reporter_response}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LGU Notes */}
          <div className="card">
            <h2 className="text-lg font-bold text-text-primary mb-4">LGU Notes</h2>
            {showNoteInput ? (
              <div className="space-y-2">
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
                className="btn-secondary w-full"
              >
                Add Note
              </button>
            )}
            {report.notes && (
              <div className="mt-4 p-3 bg-surface rounded-lg border border-border">
                <p className="text-sm text-text-primary">{report.notes}</p>
              </div>
            )}
          </div>

          {/* Audit Log */}
          <div className="card">
            <h2 className="text-lg font-bold text-text-primary mb-4">Audit Log</h2>
            <div className="space-y-3">
              {agencyResponses && agencyResponses.length > 0 ? (
                agencyResponses.map((response, index) => (
                  <div key={index} className="bg-surface p-3 rounded-lg border border-border">
                    <p className="text-sm font-medium text-text-primary capitalize">
                      {response.action_type?.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-text-secondary mt-1">{response.action_details}</p>
                    <p className="text-xs text-text-muted mt-2">
                      {new Date(response.created_at).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <div className="bg-surface p-4 rounded-lg border border-border">
                  <p className="text-text-muted text-sm">
                    No activity logged for this report yet.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <h2 className="text-lg font-bold text-text-primary mb-4">Actions</h2>
            <div className="space-y-3">
              {/* Lifecycle Stage Control */}
              <div className="relative">
                <button
                  onClick={() => setShowLifecycleDropdown(!showLifecycleDropdown)}
                  disabled={updatingLifecycle}
                  className="btn-primary w-full"
                >
                  {updatingLifecycle ? 'Updating...' : 'Update Lifecycle Stage'}
                </button>
                {showLifecycleDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-lg shadow-lg z-10">
                    <button
                      onClick={() => handleLifecycleStageUpdate('submitted')}
                      disabled={report.stage === 'submitted'}
                      className={`w-full px-4 py-3 text-left border-b border-border transition-colors ${
                        report.stage === 'submitted'
                          ? 'bg-purple-100 text-purple-800 font-semibold cursor-not-allowed'
                          : 'text-text-primary hover:bg-purple-50'
                      }`}
                    >
                      <span className="font-medium">Submitted</span>
                    </button>
                    <button
                      onClick={() => handleLifecycleStageUpdate('acknowledged')}
                      disabled={report.stage === 'acknowledged'}
                      className={`w-full px-4 py-3 text-left border-b border-border transition-colors ${
                        report.stage === 'acknowledged'
                          ? 'bg-blue-100 text-blue-800 font-semibold cursor-not-allowed'
                          : 'text-text-primary hover:bg-blue-50'
                      }`}
                    >
                      <span className="font-medium">Acknowledged</span>
                    </button>
                    <button
                      onClick={() => handleLifecycleStageUpdate('responded')}
                      disabled={report.stage === 'responded'}
                      className={`w-full px-4 py-3 text-left border-b border-border transition-colors ${
                        report.stage === 'responded'
                          ? 'bg-yellow-100 text-yellow-800 font-semibold cursor-not-allowed'
                          : 'text-text-primary hover:bg-yellow-50'
                      }`}
                    >
                      <span className="font-medium">Responded</span>
                    </button>
                    <button
                      onClick={() => handleLifecycleStageUpdate('resolved')}
                      disabled={report.stage === 'resolved'}
                      className={`w-full px-4 py-3 text-left border-b border-border transition-colors ${
                        report.stage === 'resolved'
                          ? 'bg-green-100 text-green-800 font-semibold cursor-not-allowed'
                          : 'text-text-primary hover:bg-green-50'
                      }`}
                    >
                      <span className="font-medium">Resolved</span>
                    </button>
                    <button
                      onClick={() => handleLifecycleStageUpdate('closed')}
                      disabled={report.stage === 'closed'}
                      className={`w-full px-4 py-3 text-left transition-colors ${
                        report.stage === 'closed'
                          ? 'bg-gray-100 text-gray-800 font-semibold cursor-not-allowed'
                          : 'text-text-primary hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-medium">Closed</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Status Control */}
              <div className="relative">
                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  disabled={updatingStatus}
                  className="btn-secondary w-full"
                >
                  {updatingStatus ? 'Updating...' : 'Update Status'}
                </button>
                {showStatusDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-lg shadow-lg z-10">
                    <button
                      onClick={() => handleStatusUpdate('unresolved')}
                      disabled={report.status === 'unresolved'}
                      className={`w-full px-4 py-3 text-left border-b border-border last:border-b-0 transition-colors ${report.status === 'unresolved'
                        ? 'bg-accent-green/20 text-accent-green font-semibold cursor-not-allowed'
                        : 'text-text-primary hover:bg-accent-green/10'
                        }`}
                    >
                      <span className="font-medium">Unresolved</span>
                      {report.status === 'unresolved'}
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('in_progress')}
                      disabled={report.status === 'in_progress'}
                      className={`w-full px-4 py-3 text-left border-b border-border last:border-b-0 transition-colors ${report.status === 'in_progress'
                        ? 'bg-accent-green/20 text-accent-green font-semibold cursor-not-allowed'
                        : 'text-text-primary hover:bg-accent-green/10'
                        }`}
                    >
                      <span className="font-medium">In Progress</span>
                      {report.status === 'in_progress'}
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('resolved')}
                      disabled={report.status === 'resolved'}
                      className={`w-full px-4 py-3 text-left transition-colors ${
                        report.status === 'resolved'
                          ? 'bg-accent-green/20 text-accent-green font-semibold cursor-not-allowed'
                          : 'text-text-primary hover:bg-accent-green/10'
                      }`}
                    >
                      <span className="font-medium">Resolved</span>
                    </button>
                  </div>
                )}
              </div>
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

      {/* Disclosure Request Modal */}
      {showDisclosureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000]">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-text-primary">Request Disclosure</h3>
              <button
                onClick={() => setShowDisclosureModal(false)}
                className="text-text-muted hover:text-text-primary text-2xl"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Request Type</label>
                <select
                  value={disclosureRequestType}
                  onChange={(e) => setDisclosureRequestType(e.target.value)}
                  className="w-full p-3 border border-border rounded-lg bg-background text-text-primary"
                >
                  <option value="identity">Reporter Identity</option>
                  <option value="location">Location Details</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">Notes</label>
                <textarea
                  value={disclosureRequestNotes}
                  onChange={(e) => setDisclosureRequestNotes(e.target.value)}
                  className="w-full p-3 border border-border rounded-lg bg-background text-text-primary"
                  rows={3}
                  placeholder="Explain why you need this information..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDisclosureModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateDisclosureRequest}
                  className="btn-primary flex-1"
                >
                  Submit Request
                </button>
              </div>
            </div>
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
