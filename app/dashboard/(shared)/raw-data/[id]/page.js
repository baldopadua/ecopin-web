'use client'
import SecureImage from '@/components/ui/SecureImage'
import ImageLightbox from '@/components/ui/ImageLightbox'
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useNavigationLoading } from '@/components/context/NavigationLoadingContext'
import {
  fetchReportById,
  fetchReportEvidence,
  updateReportStatus,
  updatePropertyOwnerConsent,
  lguResolveReport,
  updateReportValidation,
  fetchCleanupTasks
} from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import Notification from '@/components/ui/Notification'
import useConfirmation from '@/components/ui/useConfirmation'
import StatusBadge from '@/components/ui/StatusBadge'
import ReportApprovalDialog from '@/components/reports/ReportApprovalDialog'
import { SkeletonLine, SkeletonCard } from '@/components/ui/Skeleton'
import { useUser } from '@/components/auth/UserContext'
import {
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Loader2,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Video,
  Play,
  Maximize2
} from 'lucide-react'
import { isVideoResource, getVideoPosterUrl } from '@/lib/helpers/mediaHelpers'
import { formatReportAddress } from '@/lib/format-location.mjs'
import wkx from 'wkx'
import { Buffer } from 'buffer'
import { reportDiagnostic } from '../../../../../lib/diagnostics.mjs';

import { backendFetch as fetch } from '../../../../../lib/backend-fetch.mjs';



// Polyfill Buffer for browser environment
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer
}

function VideoEvidenceCard({ url, name, onExpand }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef(null)
  const posterUrl = getVideoPosterUrl(url)

  if (!url) return null

  const handlePlayClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    const promise = v.play()
    if (promise !== undefined) {
      promise
        .then(() => setIsPlaying(true))
        .catch((err) => {
          if (err?.name === 'NotAllowedError') {
            v.muted = true
            v.play()
              .then(() => setIsPlaying(true))
              .catch((retryErr) => console.error('Video muted play retry failed:', retryErr))
          } else {
            console.warn('Video play error:', err?.name, err?.message)
          }
        })
    }
  }

  return (
    <div className="relative group rounded-lg overflow-hidden border border-border bg-black w-full h-48 flex items-center justify-center">
      <video
        ref={videoRef}
        key={url}
        src={url}
        poster={posterUrl || undefined}
        controls
        playsInline
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPlaying={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        className="w-full h-48 object-cover rounded-lg"
      />

      {/* Top Left Video Badge */}
      <div className="absolute top-2 left-2 z-20 pointer-events-none bg-black/75 text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded border border-white/20 flex items-center gap-1 shadow-sm">
        <Video className="w-3 h-3 text-primary" />
        <span>VIDEO</span>
      </div>

      {/* Top Right Expand Button (Opens Lightbox Inspector) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onExpand(url)
        }}
        className="absolute top-2 right-2 z-30 px-2.5 py-1 min-h-[32px] rounded-md bg-black/75 hover:bg-black text-white border border-white/25 hover:border-white/70 shadow-md backdrop-blur-sm flex items-center gap-1.5 text-xs font-medium transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
        aria-label="Expand video in inspector"
        title="Expand video in inspector"
      >
        <Maximize2 className="w-3.5 h-3.5 text-white" />
        <span className="text-[11px] font-mono font-medium">Expand</span>
      </button>

      {/* Prominent Centered Play Button (Visible when paused) */}
      {!isPlaying && (
        <button
          type="button"
          onClick={handlePlayClick}
          className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/60 hover:bg-black/80 text-white border-2 border-white/80 hover:border-white shadow-2xl backdrop-blur-xs flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 z-20 group/play cursor-pointer pointer-events-auto"
          aria-label="Play video"
          title="Play video"
        >
          <Play className="w-6 h-6 fill-white text-white translate-x-0.5 group-hover/play:scale-110 transition-transform" />
        </button>
      )}
    </div>
  )
}

export default function ReportDetailPage() {
  const { confirm: confirmAction, confirmation } = useConfirmation()
  const params = useParams()
  /*
   * Investigation - Issue #6 (Report Detail Page Error on Page 4 San Miguel):
   * Reports requiring manual review evaluate `validatingReport === reportId` (and map button & action handlers
   * reference `reportId`), but `reportId` was never declared in ReportDetailPage scope, triggering an uncaught
   * `ReferenceError: reportId is not defined` whenever manual_review reports loaded.
   */
  const reportId = params?.id || report?.id
  const router = useRouter()
  const user = useUser()
  const { isLoading: isNavigating } = useNavigationLoading()
  const [report, setReport] = useState(null)
  const [evidence, setEvidence] = useState([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [uploadingBefore, setUploadingBefore] = useState(false)
  const [uploadingAfter, setUploadingAfter] = useState(false)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [updatingConsent, setUpdatingConsent] = useState(false)
  const [notification, setNotification] = useState(null)
  const statusDropdownRef = useRef(null)
  const [existingTask, setExistingTask] = useState(null)
  const [agencyResponses, setAgencyResponses] = useState([])
  const [resolvingReport, setResolvingReport] = useState(false)
  const [validatingReport, setValidatingReport] = useState(null)
  const [showApproval, setShowApproval] = useState(false)
  const [activityLogPage, setActivityLogPage] = useState(1)
  const activityLogPerPage = 10
  const [copiedField, setCopiedField] = useState(null)

  const handleCopy = (text, fieldName) => {
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName)
      setNotification({
        message: `${fieldName === 'coords' ? 'Coordinates' : 'Address'} copied to clipboard`,
        type: 'success'
      })
      setTimeout(() => setCopiedField(null), 2000)
    }).catch(() => {
      setNotification({ message: 'Failed to copy to clipboard', type: 'error' })
    })
  }

  const slaInfo = useMemo(() => {
    if (!report?.created_at) return null
    const isClosedOrResolved =
      report.status === 'closed' ||
      report.status === 'resolved' ||
      report.stage === 'closed' ||
      report.stage === 'resolved' ||
      report.lifecycle_stage === 'closed' ||
      report.lifecycle_stage === 'resolved' ||
      report.validation_status === 'rejected'
    if (isClosedOrResolved) return null

    const createdTime = new Date(report.created_at).getTime()
    if (isNaN(createdTime)) return null

    const elapsedHours = (Date.now() - createdTime) / (1000 * 60 * 60)
    const slaThresholdHours = 48 // Default SLA threshold

    if (elapsedHours > slaThresholdHours) {
      const overdueHours = Math.max(1, Math.round(elapsedHours - slaThresholdHours))
      return {
        status: 'breached',
        label: `SLA Overdue (${overdueHours}h overdue)`,
        hours: overdueHours
      }
    } else if (elapsedHours >= slaThresholdHours * 0.75) {
      const remainingHours = Math.max(1, Math.round(slaThresholdHours - elapsedHours))
      return {
        status: 'risk',
        label: `SLA At Risk (${remainingHours}h remaining)`,
        hours: remainingHours
      }
    } else {
      const remainingHours = Math.max(1, Math.round(slaThresholdHours - elapsedHours))
      return {
        status: 'within',
        label: `Within SLA (${remainingHours}h remaining)`,
        hours: remainingHours
      }
    }
  }, [report?.created_at, report?.status, report?.stage, report?.lifecycle_stage, report?.validation_status])

  const loadReportData = useCallback(async (isManualRefresh = false) => {
    const id = params?.id
    if (!id) return
    if (isManualRefresh) {
      setIsRefreshing(true)
    } else {
      setLoading(true)
    }
    try {
      const [reportData, evidenceData, tasksData] = await Promise.all([
        fetchReportById(id),
        fetchReportEvidence(id),
        fetchCleanupTasks().catch((err) => {
          reportDiagnostic('warn', 'tasks', 'Failed to fetch tasks for report detail:', err)
          return []
        })
      ])
      if (reportData) {
        // Access Control: Field crew cannot view incomplete raw reports
        if (user?.role === 'field_crew' && reportData.lifecycle_stage !== 'completed') {
          setError('Access Denied: Field crews can only view raw report details after the operation is complete. Please use the Operations workspace.')
          return
        }

        const activeTasks = (tasksData || []).filter(t => t.status !== 'cancelled')
        const reportClusterId = reportData.cluster_id ? String(reportData.cluster_id) : null
        const directTaskId = reportData.cleanup_task_id ? String(reportData.cleanup_task_id) : null
        const currentReportId = String(id)

        const matchedTask = activeTasks.find(t => {
          if (directTaskId && String(t.id) === directTaskId) return true
          const inReportIds = Array.isArray(t.report_ids) && t.report_ids.some(tid => String(tid) === currentReportId)
          const inSequence = Array.isArray(t.report_sequence) && t.report_sequence.some(tid => String(tid) === currentReportId)
          const inSatellites = Array.isArray(t.satellite_report_ids) && t.satellite_report_ids.some(tid => String(tid) === currentReportId)
          const inReports = Array.isArray(t.reports) && t.reports.some(r => String(r.id || r) === currentReportId)
          if (inReportIds || inSequence || inSatellites || inReports) return true

          if (reportClusterId) {
            if (String(t.cluster_id) === reportClusterId) return true
            if (Array.isArray(t.cluster_ids) && t.cluster_ids.some(cid => String(cid) === reportClusterId)) return true
          }
          return false
        }) || (directTaskId ? { id: directTaskId } : null)

        setExistingTask(matchedTask)
        setReport(reportData)
        setEvidence(evidenceData)
        setAgencyResponses([])
      } else {
        setError('Report not found')
      }
    } catch (err) {
      reportDiagnostic('error', 'media', 'Error loading report:', err)
      setError('Failed to load report')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [params?.id, user])

  const allReportPhotos = useMemo(() => {
    const list = []
    if (report?.image_url) {
      const isVideo = isVideoResource(report.image_url)
      list.push({ url: report.image_url, label: isVideo ? 'Reported Video' : 'Reported Photo', isVideo, poster: getVideoPosterUrl(report.image_url) })
    }
    if (report?.video_url && !list.some(item => item.url === report.video_url)) {
      list.push({
        url: report.video_url,
        label: 'Reported Video Evidence',
        isVideo: true,
        resource_type: 'video',
        poster: getVideoPosterUrl(report.video_url)
      })
    }
    ;(evidence || []).forEach((e, idx) => {
      const url = e.url || e.photo_url || e.file_url
      if (url && !list.some(item => item.url === url)) {
        const isVideo = e.resource_type === 'video' || isVideoResource(url, e.resource_type)
        list.push({
          url,
          label: e.name || (isVideo ? `Evidence Video #${idx + 1}` : `Evidence Photo #${idx + 1}`),
          isVideo,
          resource_type: e.resource_type || (isVideo ? 'video' : 'image'),
          poster: isVideo ? getVideoPosterUrl(url) : null
        })
      }
    })
    if (report?.before_photo_url && !list.some(item => item.url === report.before_photo_url)) {
      const isVideo = isVideoResource(report.before_photo_url)
      list.push({
        url: report.before_photo_url,
        label: isVideo ? 'Before Cleanup Video' : 'Before Cleanup Photo',
        isVideo,
        resource_type: isVideo ? 'video' : 'image',
        poster: isVideo ? getVideoPosterUrl(report.before_photo_url) : null
      })
    }
    if (report?.after_photo_url && !list.some(item => item.url === report.after_photo_url)) {
      const isVideo = isVideoResource(report.after_photo_url)
      list.push({
        url: report.after_photo_url,
        label: isVideo ? 'After Cleanup Video' : 'After Cleanup Photo',
        isVideo,
        resource_type: isVideo ? 'video' : 'image',
        poster: isVideo ? getVideoPosterUrl(report.after_photo_url) : null
      })
    }
    return list
  }, [report, evidence])

  const openLightboxAtUrl = (url) => {
    if (!url) return
    const found = allReportPhotos.findIndex(item => item.url === url)
    setLightboxIndex(found >= 0 ? found : 0)
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadReportData()
    })
  }, [loadReportData])

  useEffect(() => {
    const handleClickOutside = (event) => {
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
      reportDiagnostic('error', 'media', 'Error parsing location:', error)
    }

    return { latitude: null, longitude: null }
  }

  const location = useMemo(() => {
    return parseLocation(report?.location, report?.latitude, report?.longitude)
  }, [report?.location, report?.latitude, report?.longitude])

  const [reverseGeocodedAddress, setReverseGeocodedAddress] = useState(null)

  useEffect(() => {
    // If the report already has a verified street address, skip client reverse geocoding
    if (report?.street_address) return
    if (!location.latitude || !location.longitude) return
    let active = true
    const lat = location.latitude
    const lng = location.longitude
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)

    const fetchFn = typeof window !== 'undefined' && window.fetch ? window.fetch.bind(window) : globalThis.fetch
    fetchFn(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    })
      .then(r => r.json())
      .then(data => {
        clearTimeout(timer)
        if (!active) return
        const addr = data?.address
        if (addr) {
          const street = addr.road || addr.pedestrian || addr.street || ''
          const district = addr.quarter || addr.neighbourhood || addr.suburb || ''
          const city = addr.city || addr.town || 'Pasig City'
          // Only set client reverseGeocodedAddress if an actual street was found
          if (street) {
            const parts = [street, district ? `Brgy. ${district}` : '', city].filter(Boolean)
            setReverseGeocodedAddress(parts.join(', '))
          }
        }
      })
      .catch(() => {})

    return () => {
      active = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [report?.street_address, location.latitude, location.longitude])

  const effectiveAddress = useMemo(() => {
    // 1. If report has verified street_address, combine with barangay and city
    if (report?.street_address && typeof report.street_address === 'string' && report.street_address.trim()) {
      return formatReportAddress({
        ...report,
        latitude: location.latitude,
        longitude: location.longitude
      })
    }
    // 2. Fallback to client reverse geocode if an exact street was found
    if (reverseGeocodedAddress) return reverseGeocodedAddress
    // 3. Fallback to general formatted address
    if (location.latitude && location.longitude) {
      const formatted = formatReportAddress({
        ...report,
        latitude: location.latitude,
        longitude: location.longitude
      })
      if (formatted && formatted !== 'Pasig City') return formatted
    }
    if (report?.address && typeof report.address === 'string' && report.address.trim()) {
      return report.address
    }
    const fallbackCity = report?.city ? (report.city.toLowerCase().endsWith('city') ? report.city : `${report.city} City`) : 'Pasig City'
    return report?.barangay ? `Barangay ${report.barangay}, ${fallbackCity}` : 'Street address not available'
  }, [reverseGeocodedAddress, report, location.latitude, location.longitude])

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
      reportDiagnostic('error', 'media', 'Failed to update status:', error)
      setNotification({ message: 'Failed to update status. Please try again.', type: 'error' })
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleRejectReport = async () => {
    setValidatingReport(reportId)
    try {
      await updateReportValidation(reportId, 'rejected')
      setReport({ ...report, validation_status: 'rejected' })
      setNotification({ message: 'Report rejected successfully', type: 'success' })
    } catch (error) {
      reportDiagnostic('error', 'media', 'Failed to reject report:', error)
      setNotification({ message: 'Failed to reject report. Please try again.', type: 'error' })
    } finally {
      setValidatingReport(null)
    }
  }

  const handleReportApproved = updatedReport => {
    setReport(previous => ({ ...previous, ...updatedReport }))
    setShowApproval(false)
    setNotification({ message: 'Report approval and severity saved successfully', type: 'success' })
  }

  const handleResolveReport = async () => {
    // Check if trying to resolve without photos
    if (!report.before_photo_url || !report.after_photo_url) {
      setNotification({ message: 'Please upload both before and after photos before resolving the report.', type: 'warning' })
      return
    }

    setResolvingReport(true)
    try {
      const updatedReport = await lguResolveReport(reportId)
      setReport(updatedReport)
      setNotification({ message: 'Report resolved successfully. Waiting for reporter feedback.', type: 'success' })
    } catch (error) {
      reportDiagnostic('error', 'media', 'Failed to resolve report:', error)
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


    const formData = new FormData()
    formData.append('image', file)
    formData.append('photo_type', photoType)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/reports/${reportId}/photo`, {
        method: 'POST',
        headers: {
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Failed to upload photo')
      }

      const data = await response.json()
      setReport(data.report)
      setNotification({ message: 'Photo uploaded successfully', type: 'success' })
    } catch (error) {
      reportDiagnostic('error', 'media', 'Failed to upload photo:', error)
      setNotification({ message: error.message || 'Failed to upload photo. Please try again.', type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const handlePhotoDelete = async (photoType) => {
    if (!await confirmAction({ title: 'Delete report photo?', description: 'This removes the selected evidence photo from this report. This action cannot be undone.', action: 'Delete photo' })) {
      return
    }



    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/reports/${reportId}/photo`, {
        method: 'DELETE',
        headers: {
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
      reportDiagnostic('error', 'media', 'Failed to delete photo:', error)
      setNotification({ message: error.message || 'Failed to delete photo. Please try again.', type: 'error' })
    }
  }

  const handlePropertyOwnerConsent = async (newStatus) => {
    if (newStatus === 'denied') {
      const confirmed = await confirmAction({
        title: 'Deny Property Owner Consent?',
        description: 'Marking property owner consent as denied will halt field crew operations and restrict crew dispatch for this private property report. Are you sure you want to proceed?',
        action: 'Confirm Denial'
      })
      if (!confirmed) return
    }

    setUpdatingConsent(true)
    try {
      await updatePropertyOwnerConsent(reportId, newStatus)
      await loadReportData()
      setNotification({ message: `Property owner consent status updated to ${newStatus}`, type: 'success' })
    } catch (error) {
      reportDiagnostic('error', 'media', 'Failed to update consent status:', error)
      setNotification({ message: 'Failed to update consent status', type: 'error' })
    } finally {
      setUpdatingConsent(false)
    }
  }

  if (loading && !report && !isNavigating) {
    return (
      <div className="workspace-page workspace-page--flow">
        <PageHeader
          title="Report Details"
          subtitle="Loading report information..."
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Reports', href: '/dashboard/raw-data' },
            { label: 'Details' }
          ]}
        />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <SkeletonCard />
            <div className="card animate-pulse">
              <SkeletonLine className="h-7 w-2/3 mb-3" />
              <SkeletonLine className="h-4 w-1/4 mb-6" />
              <SkeletonLine className="h-4 w-full mb-2" />
              <SkeletonLine className="h-4 w-5/6 mb-2" />
              <SkeletonLine className="h-4 w-3/4" />
            </div>
            <div className="card animate-pulse">
              <SkeletonLine className="h-5 w-1/4 mb-4" />
              <div className="grid grid-cols-3 gap-4">
                <SkeletonLine className="h-48 w-full rounded-lg" />
                <SkeletonLine className="h-48 w-full rounded-lg" />
                <SkeletonLine className="h-48 w-full rounded-lg" />
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="card animate-pulse">
              <SkeletonLine className="h-5 w-1/3 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i}>
                    <SkeletonLine className="h-3 w-1/4 mb-1" />
                    <SkeletonLine className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            </div>
            <div className="card animate-pulse">
              <SkeletonLine className="h-5 w-1/3 mb-4" />
              <SkeletonLine className="h-10 w-full mb-2" />
              <SkeletonLine className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="workspace-page workspace-page--flow">
        <PageHeader
          title="Report Details"
          subtitle="Error loading report"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Reports', href: '/dashboard/raw-data' },
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

  const dateStr = new Date(report.created_at).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <div className="workspace-page workspace-page--flow">
      <PageHeader
        title="Report Details"
        subtitle="View detailed report information"
        breadcrumbs={[
          {
            label: 'Dashboard',
            href: user?.role === 'officer' ? '/dashboard/officer' :
                  user?.role === 'field_crew' ? '/dashboard/field-crew' :
                  '/dashboard'
          },
          {
            label: 'Reports',
            href: user?.role === 'officer' ? '/dashboard/officer/reports' :
                  user?.role === 'field_crew' ? '/dashboard/field-crew/raw-data' :
                  '/dashboard/raw-data'
          },
          { label: 'Details' }
        ]}
      >
        <button
          onClick={() => loadReportData(true)}
          disabled={loading || isRefreshing}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw size={16} aria-hidden="true" className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </PageHeader>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-4">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Lifecycle Timeline - Read-only display */}
              <div className="card border border-border border-primary">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-text-primary mb-1">Operational Lifecycle</h2>
                  <p className="text-xs text-text-muted mb-4">Track progress from citizen submission through field resolution</p>
                  <div className="flex justify-center gap-3 flex-wrap items-center">
                    {report.validation_status === 'rejected' || (report.on_private_property && report.property_owner_consent_status === 'denied') ? (
                      <>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-elevated rounded-lg border border-border">
                          <span className="text-xs font-medium text-text-secondary">Review:</span>
                          <StatusBadge status={report.validation_status} type="validation" size="small" />
                        </div>
                        {report.on_private_property && report.property_owner_consent_status === 'denied' && (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-elevated rounded-lg border border-border">
                            <span className="text-xs font-medium text-text-secondary">Consent:</span>
                            <StatusBadge status={report.property_owner_consent_status} type="consent" size="small" />
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-elevated rounded-lg border border-border">
                          <span className="text-xs font-medium text-text-secondary">Report status:</span>
                          <StatusBadge status={report.status} type="report" size="small" />
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-elevated rounded-lg border border-border">
                          <span className="text-xs font-medium text-text-secondary">Citizen review:</span>
                          <StatusBadge status={report.validation_status} type="validation" size="small" />
                        </div>
                        {report.on_private_property && (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-elevated rounded-lg border border-border">
                            <span className="text-xs font-medium text-text-secondary">Consent:</span>
                            <StatusBadge
                              status={report.property_owner_consent_status}
                              type="consent"
                              size="small"
                            />
                          </div>
                        )}
                        {(report.stage || report.lifecycle_stage) && (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-elevated rounded-lg border border-border">
                            <span className="text-xs font-medium text-text-secondary">Progress:</span>
                            <StatusBadge status={report.stage || report.lifecycle_stage} type="lifecycle" size="small" />
                          </div>
                        )}
                        {slaInfo && (
                          <div
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border ${
                              slaInfo.status === 'breached'
                                ? 'bg-error/10 text-error border-error/30 font-semibold'
                                : slaInfo.status === 'risk'
                                ? 'bg-warning/10 text-warning border-warning/30 font-semibold'
                                : 'bg-surface-elevated text-text-muted border-border font-medium'
                            }`}
                          >
                            {slaInfo.status === 'breached' ? <AlertTriangle size={13} /> : <Clock size={13} />}
                            <span className="text-xs">{slaInfo.label}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-0 px-4 relative">
                  {/* Continuous background line */}
                  <div className="absolute top-3 left-3 right-3 h-1 bg-gray-300 dark:bg-gray-700 -z-10" />
                  {/* Colored progress line */}
                  {(() => {
                    const currentStageValue = report.stage || report.lifecycle_stage
                    const stages = ['submitted', 'assigned', 'in_progress', 'resolved', 'closed']
                    const currentIndex = stages.indexOf(currentStageValue)
                    const totalSegments = stages.length - 1

                    let lineWidthCalc = '0px'
                    if (currentIndex === 0) {
                      lineWidthCalc = '12px'
                    } else if (currentIndex > 0) {
                      lineWidthCalc = `calc(12px + ((100% - 24px) / ${totalSegments}) * ${currentIndex})`
                    }

                    return (
                      <div
                        className="absolute top-3 left-3 h-1 bg-[var(--primary)] -z-10 transition-all"
                        style={{ width: lineWidthCalc }}
                      />
                    )
                  })()}
                  {['submitted', 'assigned', 'in_progress', 'resolved', 'closed'].map((stage, index) => {
                    const currentStageValue = report.stage || report.lifecycle_stage
                    const stages = ['submitted', 'assigned', 'in_progress', 'resolved', 'closed']
                    const currentIndex = stages.indexOf(currentStageValue)
                    const isCompleted = currentIndex >= index
                    const isCurrent = currentStageValue === stage
                    return (
                      <div key={stage} className="flex-1 flex flex-col items-center z-10">
                        <div className={`w-6 h-6 rounded-full ${isCurrent ? 'bg-[var(--primary)] ring-4 ring-[var(--primary)]/20' : isCompleted ? 'bg-[var(--primary)]' : 'bg-gray-300 dark:bg-gray-700'} transition-all relative`} />
                        <span className={`text-xs mt-2 font-medium capitalize ${isCurrent || isCompleted ? 'text-[var(--workspace-link)]' : 'text-text-secondary'}`}>
                          {stage.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Report Information */}
              <div className="card">
                <h2 className="text-xl font-semibold text-text-primary mb-2">{report.title}</h2>
                <p className="text-sm text-text-secondary mb-6">Issue: {report.issue_type?.replaceAll('_', ' ') || 'General'}</p>

                <h2 className="text-lg font-semibold text-text-primary mb-3">Description</h2>
                <p className="text-text-primary leading-relaxed mb-6">
                  {report.description || 'No description provided.'}
                </p>

              </div>

              {/* Evidence Photos & Videos */}
              {['officer', 'admin'].includes(user?.role) &&
                typeof report.notes === 'string' &&
                report.notes.startsWith('Reporter requested manual review:') && (
                  <section className="card" aria-labelledby="manual-review-request-title">
                    <h2 id="manual-review-request-title" className="text-xl font-semibold text-text-primary mb-2">
                      Manual review request
                    </h2>
                    <p className="text-sm text-text-secondary mb-4">
                      The citizen requested a human review. Read their explanation alongside the evidence before making a decision. Any recorded officer rejection reason appears below as well.
                    </p>
                    <p className="text-text-primary leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {report.notes}
                    </p>
                  </section>
                )}

              <div className="card">
                <h2 className="text-xl font-bold text-text-primary mb-4">Evidence Media</h2>
                {(loading || isRefreshing) ? (
                  <div className="h-48 bg-surface-elevated rounded-lg flex flex-col items-center justify-center border border-dashed border-border gap-2">
                    <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" aria-hidden="true" />
                    <p className="text-sm text-text-muted">Loading evidence media...</p>
                  </div>
                ) : evidence.length === 0 ? (
                  <div className="h-48 bg-surface-elevated rounded-lg flex items-center justify-center border border-dashed border-border">
                    <div className="text-center">
                      <ImageIcon size={48} className="text-text-muted mx-auto mb-2" aria-hidden="true" />
                      <p className="text-text-muted">No evidence media available</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {evidence.map((img, index) => {
                      const isVideo = img.resource_type === 'video' || isVideoResource(img.url, img.resource_type)
                      return (
                        <div key={index} className="relative group rounded-lg overflow-hidden border border-border bg-black">
                          {isVideo ? (
                            <VideoEvidenceCard
                              url={img.url}
                              name={img.name}
                              onExpand={openLightboxAtUrl}
                            />
                          ) : (
                            <SecureImage
                              src={img.url}
                              alt={`Evidence ${index + 1}`}
                              className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => openLightboxAtUrl(img.url)}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Before & After Photos */}
                {report.status !== 'closed' && report.status !== 'resolved' && report.validation_status !== 'rejected' && !(report.on_private_property && report.property_owner_consent_status === 'denied') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {/* Before Photo */}
                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold">Before Photo</h3>
                      {user?.role === 'field_crew' && report.before_photo_url && (
                        <button
                          onClick={() => handlePhotoDelete('before')}
                          className="px-3 py-1 bg-error hover:bg-error/90 text-white text-sm rounded transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    {report.before_photo_url ? (
                      isVideoResource(report.before_photo_url) ? (
                        <VideoEvidenceCard
                          url={report.before_photo_url}
                          name="Before Cleanup Video"
                          onExpand={openLightboxAtUrl}
                        />
                      ) : (
                        <SecureImage
                          src={report.before_photo_url}
                          alt="Before"
                          className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => openLightboxAtUrl(report.before_photo_url)}
                        />
                      )
                    ) : user?.role === 'field_crew' ? (
                      <div
                        className={`border border-border border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${uploadingBefore ? 'border-border bg-surface' : 'border-border hover:border-accent-green hover:bg-accent-green/5'
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
                            <div className="w-8 h-8 border border-border border-accent-green border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm text-text-muted">Uploading...</p>
                          </div>
                        ) : (
                          <>
                            <Upload size={48} className="text-text-muted mx-auto mb-2" aria-hidden="true" />
                            <p className="text-sm font-medium text-text-primary">Click or drag to upload</p>
                            <p className="text-xs text-text-muted mt-1">JPG, PNG, or WEBP • Max 10MB</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="h-48 bg-surface-elevated rounded-lg flex items-center justify-center border border-dashed border-border">
                        <p className="text-text-muted">No before photo uploaded</p>
                      </div>
                    )}
                  </div>

                  {/* After Photo */}
                  <div className="p-4 border border-border rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-semibold">After Photo</h3>
                      {user?.role === 'field_crew' && report.after_photo_url && (
                        <button
                          onClick={() => handlePhotoDelete('after')}
                          className="px-3 py-1 bg-error hover:bg-error/90 text-white text-sm rounded transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                    {report.after_photo_url ? (
                      isVideoResource(report.after_photo_url) ? (
                        <VideoEvidenceCard
                          url={report.after_photo_url}
                          name="After Cleanup Video"
                          onExpand={openLightboxAtUrl}
                        />
                      ) : (
                        <SecureImage
                          src={report.after_photo_url}
                          alt="After"
                          className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => openLightboxAtUrl(report.after_photo_url)}
                        />
                      )
                    ) : user?.role === 'field_crew' ? (
                      <div
                        className={`border border-border border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${uploadingAfter ? 'border-border bg-surface' : 'border-border hover:border-primary hover:bg-primary/5'
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
                            <div className="w-8 h-8 border border-border border-accent-green border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm text-text-muted">Uploading...</p>
                          </div>
                        ) : (
                          <>
                            <Upload size={48} className="text-text-muted mx-auto mb-2" aria-hidden="true" />
                            <p className="text-sm font-medium text-text-primary">Click or drag to upload</p>
                            <p className="text-xs text-text-muted mt-1">JPG, PNG, or WEBP • Max 10MB</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="h-48 bg-surface-elevated rounded-lg flex items-center justify-center border border-dashed border-border">
                        <p className="text-text-muted">No after photo uploaded</p>
                      </div>
                    )}
                  </div>
                </div>
                )}
              </div>

              {/* Audit Log - Moved to main content */}
              <div className="card">
                <h2 className="text-xl font-bold text-text-primary mb-4">Activity Log</h2>
                <div className="bg-surface-elevated p-4 rounded-lg border border-border">
                  <p className="text-text-muted text-sm">
                    Activity log is now managed through cleanup tasks.
                  </p>
                </div>
              </div>
            </div>

            {/* Sidebar - Simplified */}
            <div className="space-y-6 self-start">
              {/* Report Metadata */}
              <div className="card">
                <h2 className="text-lg font-bold text-text-primary mb-4">Report Details</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-text-muted">Severity score</p>
                    <p className="text-text-primary font-medium text-sm">{report.severity_score == null ? 'Not assigned' : `${report.severity_score} / 100${report.severity_level ? ` · ${report.severity_level}` : ''}`}</p>
                    {report.validation_status === 'approved' && report.severity_score == null && ['officer', 'admin'].includes(user?.role) && (
                      <button type="button" className="btn-secondary mt-2 min-h-11" onClick={() => setShowApproval(true)}>Set severity</button>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Report ID</p>
                    <p className="text-text-primary font-medium text-sm font-mono">{report.id}</p>
                  </div>
                  {/* Street Address */}
                  <div>
                    <p className="text-xs text-text-muted">Street Address</p>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-text-primary font-medium text-sm leading-snug break-words">
                        {effectiveAddress}
                      </p>
                      {effectiveAddress && effectiveAddress !== 'Street address not available' && (
                        <button
                          type="button"
                          onClick={() => handleCopy(effectiveAddress, 'address')}
                          className="p-1.5 rounded-lg border border-border hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
                          title="Copy street address"
                          aria-label="Copy street address"
                        >
                          {copiedField === 'address' ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Location Coordinates */}
                  <div>
                    <p className="text-xs text-text-muted">Coordinates</p>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-text-primary font-medium text-sm font-mono">
                        {location.latitude && location.longitude
                          ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                          : 'Not available'
                        }
                      </p>
                      {location.latitude && location.longitude && (
                        <button
                          type="button"
                          onClick={() => handleCopy(`${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`, 'coords')}
                          className="p-1.5 rounded-lg border border-border hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
                          title="Copy coordinates"
                          aria-label="Copy coordinates"
                        >
                          {copiedField === 'coords' ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                        </button>
                      )}
                    </div>
                  </div>
                  {/* SLA Status in Sidebar */}
                  {slaInfo && (
                    <div>
                      <p className="text-xs text-text-muted">SLA Timeline</p>
                      <div className="mt-1">
                        {slaInfo.status === 'breached' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-error/10 text-error border border-error/30">
                            <AlertTriangle size={13} /> {slaInfo.label}
                          </span>
                        )}
                        {slaInfo.status === 'risk' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-warning/10 text-warning border border-warning/30">
                            <Clock size={13} /> {slaInfo.label}
                          </span>
                        )}
                        {slaInfo.status === 'within' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-text-muted bg-surface-elevated border border-border">
                            <Clock size={13} /> {slaInfo.label}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-text-muted">Submitted</p>
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

              {/* Property Owner Consent */}
              {report.on_private_property && report.status !== 'closed' && report.status !== 'resolved' && report.validation_status !== 'rejected' && report.property_owner_consent_status !== 'denied' && (
                <div className="card">
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-lg font-bold text-text-primary">Property Owner Consent</h2>
                    <StatusBadge status={report.property_owner_consent_status} type="consent" size="medium" />
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handlePropertyOwnerConsent('pending')}
                        disabled={updatingConsent}
                        className={`text-sm py-2 rounded-lg border transition-all ${report.property_owner_consent_status === 'pending'
                          ? 'bg-warning/10 text-warning border-warning/30 font-semibold'
                          : 'btn-secondary'
                          }`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => handlePropertyOwnerConsent('obtained')}
                        disabled={updatingConsent}
                        className={`text-sm py-2 rounded-lg border transition-all ${report.property_owner_consent_status === 'obtained'
                          ? 'bg-success text-white border-success font-semibold'
                          : 'btn-secondary'
                          }`}
                      >
                        Obtained
                      </button>
                      <button
                        onClick={() => handlePropertyOwnerConsent('denied')}
                        disabled={updatingConsent}
                        className={`text-sm py-2 rounded-lg border transition-all ${report.property_owner_consent_status === 'denied'
                          ? 'bg-error/10 text-error border-error/30 font-semibold'
                          : 'btn-secondary'
                          }`}
                      >
                        Denied
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Client Satisfaction */}
              {report.status === 'closed' && (
                <div className="card">
                  <h2 className="text-lg font-bold text-text-primary mb-4">Client Satisfaction</h2>
                  {report.satisfaction_rating ? (
                    <div className="flex items-center gap-4">
                      <span className="text-5xl">{getSatisfactionEmoji(report.satisfaction_rating)}</span>
                      <div className="flex-1">
                        <p className="text-xl font-semibold text-text-primary">
                          {getSatisfactionLabel(report.satisfaction_rating)}
                        </p>
                        <p className="text-sm text-text-muted mt-1">
                          Rating: {report.satisfaction_rating}/5
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-text-muted text-sm">No satisfaction rating provided</p>
                  )}
                </div>
              )}

              {/* Actions */}
              {report.status !== 'closed' && report.status !== 'resolved' && report.validation_status !== 'rejected' && !(report.on_private_property && report.property_owner_consent_status === 'denied') && (
                <div className="card">
                  <h2 className="text-lg font-bold text-text-primary mb-4">Actions</h2>
                  <div className="space-y-3">
                  {/* Cleanup Task Link/Dispatch - Same as cluster dispatch button */}
                  {existingTask ? (
                    <button
                      onClick={() => router.push(`/dashboard/officer/operations/${existingTask.id}`)}
                      className="btn-primary w-full"
                    >
                      View Dispatched Task
                    </button>
                  ) : (
                    <button
                      onClick={() => router.push(`/dashboard/officer/operations/create?preselect=${report.cluster_id || report.id}`)}
                      disabled={report.validation_status === 'manual_review' || report.validation_status === 'Manual_Review'}
                      className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Dispatch Field Crew
                    </button>
                  )}

                  {/* Validate/Reject Report for Manual Review */}
                  {(report.validation_status === 'manual_review' || report.validation_status === 'Manual_Review') && ['officer', 'admin'].includes(user?.role) && (
                    <div className="flex flex-col gap-2.5 pt-2 border-t border-border">
                      <button
                        onClick={() => setShowApproval(true)}
                        disabled={validatingReport === reportId}
                        className="w-full min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {validatingReport === reportId ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Approving report...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={18} />
                            <span>Approve Report</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleRejectReport}
                        disabled={validatingReport === reportId}
                        className="w-full min-h-[44px] px-4 py-2.5 bg-error/5 hover:bg-error/15 active:bg-error/25 text-error border border-error/30 font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {validatingReport === reportId ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>Rejecting report...</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={18} />
                            <span>Reject Report</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      const basePath = user?.role === 'officer' ? '/dashboard/officer' : '/dashboard'
                      router.push(`${basePath}/map-grid?lat=${location.latitude}&lng=${location.longitude}&id=${reportId}&validationStatus=${report.validation_status}&status=${report.status}`)
                    }}
                    className="btn-secondary w-full"
                  >
                    View on Map
                  </button>
                  </div>
                </div>
              )}
            </div>
          </div>

      {/* Reusable Image Lightbox with Multi-Photo Navigation & Zoom */}
      <ImageLightbox
        images={allReportPhotos}
        currentIndex={lightboxIndex}
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        onNavigate={(newIdx) => setLightboxIndex(newIdx)}
      />

      {confirmation}
      {showApproval && <ReportApprovalDialog report={report} onClose={() => setShowApproval(false)} onApproved={handleReportApproved} />}
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
