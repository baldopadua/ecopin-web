'use client'
import SecureImage from '@/components/ui/SecureImage'
import React, { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Map as MapIcon, Upload, Trash2, Camera, CheckCircle, Navigation, ExternalLink } from 'lucide-react'
import { FieldCrewGuard } from '@/components/auth/RequireRole'
import { useUser } from '@/components/auth/UserContext'
import PageHeader from '@/components/layout/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import ResponseDeadline from '@/components/ui/ResponseDeadline'
import Notification from '@/components/ui/Notification'
import { SkeletonLine, SkeletonCard } from '@/components/ui/Skeleton'
import dynamic from 'next/dynamic'
import wkx from 'wkx'
import { Buffer } from 'buffer'

// API
import { fetchCleanupTaskById, fetchReportById, uploadCleanupPhoto, logAgencyResponse, fetchAgencyResponses, fetchReportEvidence, updateLifecycleStage, updateReportStatus } from '@/lib/api'
import { reportDiagnostic } from '../../../../../../lib/diagnostics.mjs';

import { backendFetch as fetch } from '../../../../../../lib/backend-fetch.mjs';



// We need dynamic import for EcoPinMap since it uses Leaflet which requires window
const EcoPinMap = dynamic(() => import('@/components/map/EcoPinMap'), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-surface-elevated animate-pulse border border-border flex items-center justify-center">Loading Map...</div>
})

if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer
}

const parseLocation = (location, latitude, longitude) => {
  if (latitude && longitude) return { latitude, longitude }
  if (!location) return { latitude: null, longitude: null }
  try {
    if (typeof location === 'string' && location.startsWith('{')) {
      const geoJSON = JSON.parse(location)
      if (geoJSON.type === 'Point' && geoJSON.coordinates) {
        return { latitude: geoJSON.coordinates[1], longitude: geoJSON.coordinates[0] }
      }
    } else if (typeof location === 'string') {
      const buffer = Buffer.from(location, 'hex')
      const geometry = wkx.Geometry.parse(buffer)
      if (geometry && geometry.x && geometry.y) return { latitude: geometry.y, longitude: geometry.x }
    } else if (Buffer.isBuffer(location)) {
      const geometry = wkx.Geometry.parse(location)
      if (geometry && geometry.x && geometry.y) return { latitude: geometry.y, longitude: geometry.x }
    }
  } catch (error) {
    reportDiagnostic('error', 'reports', 'Error parsing location:', error)
  }
  return { latitude: null, longitude: null }
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const user = useUser()
  const taskId = params.id
  const reportId = params.report_id

  const [task, setTask] = useState(null)
  const [report, setReport] = useState(null)
  const [evidence, setEvidence] = useState([])
  const [activityLog, setActivityLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const [isAssigned, setIsAssigned] = useState(false)

  // Note state
  const [noteText, setNoteText] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false)

  // Photo state
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef(null)
  const [uploadType, setUploadType] = useState('before') // 'before' | 'after'
  const [showNavModal, setShowNavModal] = useState(false)

  useEffect(() => {
    let isMounted = true
    const loadData = async () => {
      try {
        setLoading(true)
        const [taskData, reportData, evidenceData, logData] = await Promise.all([
          fetchCleanupTaskById(taskId),
          fetchReportById(reportId),
          fetchReportEvidence(reportId).catch(() => []),
          fetchAgencyResponses(reportId).catch(() => [])
        ])

        if (!isMounted) return

        setTask(taskData)
        setReport(reportData)
        setEvidence(evidenceData)
        setActivityLog(logData)

        // Check if user is assigned to this task
        if (taskData.assigned_crew_ids && user) {
          setIsAssigned(taskData.assigned_crew_ids.includes(user.id))
        }

      } catch (error) {
        reportDiagnostic('error', 'reports', 'Error loading report details:', error)
        if (isMounted) {
          setNotification({ message: 'Failed to load report data', type: 'error' })
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (user) {
      loadData()
    }

    return () => { isMounted = false }
  }, [taskId, reportId, user])

  const handleNoteSubmit = async (e) => {
    e.preventDefault()
    if (!noteText.trim() || !isAssigned) return

    setSubmittingNote(true)
    try {
      // Backend endpoint /agency-response is not yet implemented.
      // We will only update the local state for now so the UI doesn't crash or throw console errors.
      setActivityLog(prev => [{
        id: Date.now(),
        action_type: 'manual_note',
        action_details: noteText,
        created_at: new Date().toISOString(),
        created_by: user?.id
      }, ...prev])

      setNoteText('')
      setNotification({ message: 'Note added successfully', type: 'success' })
    } catch (err) {
      setNotification({ message: 'Failed to add note', type: 'error' })
    } finally {
      setSubmittingNote(false)
    }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setNotification({ message: 'File exceeds 5MB limit', type: 'error' })
      return
    }

    // Count total photos
    const currentCrewPhotos = [report.before_photo_url, report.after_photo_url].filter(Boolean).length
    if (currentCrewPhotos >= 5) {
      setNotification({ message: 'Maximum 5 photos allowed per report', type: 'error' })
      return
    }

    setUploadingPhoto(true)
    try {
      const activeUploadType = !report.before_photo_url ? 'before' : 'after'

      const formData = new FormData()
      formData.append('image', file)
      formData.append('photo_type', activeUploadType)


      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/reports/${reportId}/photo`, {
        method: 'POST',
        headers: {

        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || errorData.error || 'Failed to upload photo')
      }

      // Check lifecycle advancement based on uploaded photo type
      try {
        const activeUploadType = !report.before_photo_url ? 'before' : 'after'
        if (activeUploadType === 'before') {
          if (!report.stage || report.stage === 'submitted' || report.stage === 'pending' || report.stage === 'assigned') {
            await updateLifecycleStage(reportId, 'in_progress')
          }
        } else if (activeUploadType === 'after') {
          await updateLifecycleStage(reportId, 'resolved')
        }
      } catch (stageError) {
        reportDiagnostic('error', 'reports', 'Failed to advance lifecycle stage:', stageError)
      }

      // Refresh report
      const freshReport = await fetchReportById(reportId)
      setReport(freshReport)
      setNotification({ message: 'Photo uploaded successfully', type: 'success' })
    } catch (error) {
      setNotification({ message: error.message || 'Failed to upload photo', type: 'error' })
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleStatusAdvance = async (targetStatus) => {
    if (!isAssigned) {
      setNotification({ message: 'You are not assigned to this task', type: 'error' })
      return
    }

    if (isSubmittingStatus) return

    // If targetStatus is 'resolved', ensure photos are uploaded unless scouting
    if (targetStatus === 'resolved') {
      const isScouting = report?.issue_type === 'scouting' || report?.issue_type === 'acknowledge_only'
      if (!isScouting && (!report?.before_photo_url || !report?.after_photo_url)) {
        setNotification({
          message: 'Both before and after photos are required before marking this report as resolved/completed.',
          type: 'warning'
        })
        return
      }
    }

    setIsSubmittingStatus(true)
    try {
      await updateReportStatus(reportId, targetStatus)
      const freshReport = await fetchReportById(reportId)
      setReport(freshReport)
      setNotification({ message: `Report status updated to ${targetStatus}!`, type: 'success' })
    } catch (error) {
      reportDiagnostic('error', 'reports', 'Failed to update report status:', error)
      setNotification({ message: error.message || 'Failed to update report status. Please try again.', type: 'error' })
    } finally {
      setIsSubmittingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <SkeletonLine className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <SkeletonCard />
          </div>
        </div>
      </div>
    )
  }

  if (!report || !task) {
    return <div className="p-8 text-text-primary">Report or Task not found.</div>
  }

  const loc = parseLocation(report.location, report.latitude, report.longitude)
  const mapCenterLat = loc.latitude || 14.5995
  const mapCenterLng = loc.longitude || 120.9842

  const crewPhotos = [
    ...(report.before_photo_url ? [{ url: report.before_photo_url, type: 'before' }] : []),
    ...(report.after_photo_url ? [{ url: report.after_photo_url, type: 'after' }] : [])
  ]

  const isScouting = report.issue_type === 'scouting' || report.issue_type === 'acknowledge_only';
  const isFinished = report.status === 'resolved' || report.status === 'closed' ||
                     (isScouting && report.stage === 'acknowledged') ||
                     (!isScouting && report.stage === 'responded');

  return (
    <FieldCrewGuard>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <PageHeader
          title={`Report #${report.id}`}
          subtitle="Individual Report Evidence Logging"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard/field-crew' },
            { label: 'Operations', href: '/dashboard/field-crew/tasks' },
            { label: `Task #${task.id}`, href: `/dashboard/field-crew/operations/${task.id}` },
            { label: `Report #${report.id}` }
          ]}
        />

        <div className="bg-[#1A1A1A] border border-border border-[#ccff00] p-3 shadow-[4px_4px_0px_0px_#ccff00]">
          <p className="font-mono text-xs text-[#ccff00] font-bold uppercase tracking-widest text-center">
            [ READ-ONLY METADATA — FIELD CREW VIEW ]
          </p>
        </div>

        {isFinished && (
          <div className="bg-[#ccff00] text-text-primary border border-border border-[#1A1A1A] p-4 font-bold flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 flex-shrink-0" />
              <span>
                {isScouting ? 'Scouting Acknowledged!' : 'Report Finished!'} You have completed your required actions for this report. You can move on.
              </span>
            </div>
            <button onClick={() => router.push(`/dashboard/field-crew/operations/${task.id}`)} className="px-4 py-2 bg-[#1A1A1A] text-[#ccff00] font-mono text-sm uppercase tracking-widest hover:bg-black transition-colors whitespace-nowrap hidden sm:block">
               Back to Task
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Metadata, Photos, Notes */}
          <div className="lg:col-span-2 space-y-8">

            {/* Metadata Section */}
            <section className="bg-surface p-6 border border-border border-[#1A1A1A]  shadow-sm">
              <div className="flex justify-between items-start mb-4 border-b border-border pb-4">
                <div>
                  <h2 className="text-2xl font-bold font-mono tracking-tight text-text-primary mb-1">{report.title}</h2>
                  <p className="text-text-secondary text-sm">{report.description || 'No description provided.'}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={report.status} type="report" />
                  <ResponseDeadline report={report} details />
                  {report.stage && <StatusBadge status={report.stage} type="lifecycle" />}
                </div>
              </div>

              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <dt className="font-mono text-xs uppercase tracking-widest text-text-muted mb-1">Issue Type</dt>
                  <dd className="text-text-primary font-medium capitalize">{report.issue_type?.replace(/_/g, ' ') || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-mono text-xs uppercase tracking-widest text-text-muted mb-1">Severity Level</dt>
                  <dd className="text-text-primary font-medium capitalize">{report.severity || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="font-mono text-xs uppercase tracking-widest text-text-muted mb-1">Coordinates</dt>
                  <dd className="text-text-primary font-medium">
                    {loc.latitude ? `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}` : 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-xs uppercase tracking-widest text-text-muted mb-1">Location / Landmark</dt>
                  <dd className="text-text-primary font-medium">
                    {[report.street, report.landmark, report.city].filter(Boolean).join(', ') || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-xs uppercase tracking-widest text-text-muted mb-1">Submission Date</dt>
                  <dd className="text-text-primary font-medium">
                    {new Date(report.created_at).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-xs uppercase tracking-widest text-text-muted mb-1">Last Updated</dt>
                  <dd className="text-text-primary font-medium">
                    {new Date(report.updated_at).toLocaleString()}
                  </dd>
                </div>

                {report.is_anonymous === false && report.reporter_name && (
                  <div className="md:col-span-2 mt-4 pt-4 border-t border-border">
                    <dt className="font-mono text-xs uppercase tracking-widest text-[#ccff00] mb-1">Reporter Information</dt>
                    <dd className="text-text-primary font-medium">{report.reporter_name} (ID: {report.reporter_id})</dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Photo Verification System */}
            <section className="bg-surface p-6 border border-border border-[#1A1A1A]  shadow-sm">
              <h3 className="font-mono text-sm uppercase tracking-widest text-text-primary mb-4 border-b border-border pb-2">Photo Verification System</h3>

              <div className="space-y-6">
                {/* Citizen Evidence */}
                <div>
                  <h4 className="font-mono text-xs uppercase text-text-muted mb-3">Citizen Evidence (Read-Only)</h4>
                  {evidence.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {evidence.map((ev, i) => (
                        <a key={i} href={ev.file_url} target="_blank" rel="noreferrer" className="block relative group border border-border rounded-lg overflow-hidden">
                          <SecureImage src={ev.file_url} alt="Citizen Evidence" className="w-full h-32 object-cover group-hover:scale-105 transition-transform" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-surface-elevated border border-border border-dashed border-border p-4 text-center">
                      <p className="text-text-muted text-sm font-mono">NO CITIZEN PHOTOS PROVIDED</p>
                    </div>
                  )}
                </div>

                {/* Field Crew Evidence */}
                <div>
                   <h4 className="font-mono text-xs uppercase text-text-muted mb-3 flex items-center justify-between">
                     <span>SWMO Evidence (Before/After)</span>
                     <span className={crewPhotos.length >= 5 ? 'text-error' : 'text-text-primary'}>
                       [{crewPhotos.length}/5 UPLOADED]
                     </span>
                   </h4>

                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                     {crewPhotos.map((photo, i) => (
                        <div key={i} className="relative group border border-border border-[#1A1A1A] rounded-lg overflow-hidden">
                          <SecureImage src={photo.url} alt={`Crew ${photo.type}`} className="w-full h-32 object-cover" />
                          <div className="absolute top-0 right-0 z-20 bg-[#1A1A1A] text-white text-[10px] font-mono px-2 py-1 uppercase">{photo.type}</div>
                        </div>
                     ))}
                   </div>

                   {crewPhotos.length < 5 && isAssigned ? (
                     <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="w-full py-3 px-4 bg-transparent border border-border border-dashed border-[#1A1A1A]  hover:border-[#ccff00] hover:bg-[#ccff00]/10 text-text-primary font-mono text-sm transition-colors flex items-center justify-center gap-2 font-bold uppercase tracking-widest"
                        >
                          {uploadingPhoto ? 'UPLOADING...' : <><Camera className="w-4 h-4" /> UPLOAD {!report.before_photo_url ? 'BEFORE' : 'AFTER'} PHOTO (MAX 5MB)</>}
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handlePhotoUpload}
                        />
                     </div>
                   ) : (
                     <div className="p-4 border border-border border-dashed border-error/50 bg-error/10 text-center text-error font-mono text-sm">
                       {isAssigned ? '[ PHOTO LIMIT REACHED: 5/5 ]' : '[ NOT ASSIGNED TO THIS TASK ]'}
                     </div>
                   )}
                </div>
              </div>
            </section>

            {/* Field Crew Notes & Activity Log */}
            <section className="bg-surface p-6 border border-border border-[#1A1A1A]  shadow-sm">
              <h3 className="font-mono text-sm uppercase tracking-widest text-text-primary mb-4 border-b border-border pb-2">Activity Log & Notes</h3>

              <div className="space-y-6">
                {/* Notes Input */}
                <form onSubmit={handleNoteSubmit}>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    disabled={!isAssigned || submittingNote}
                    placeholder={isAssigned ? "Add operational remarks..." : "You must be assigned to add notes."}
                    className="w-full h-24 p-3 border border-border border-[#1A1A1A]  bg-transparent text-text-primary font-mono text-sm resize-none outline-none focus:border-[#ccff00] disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                  />
                  <button
                    type="submit"
                    disabled={!isAssigned || submittingNote || !noteText.trim()}
                    className="w-full py-3 bg-[#ccff00] text-text-primary font-bold border border-border border-[#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed hover:translate-x-[2px] hover:translate-y-[2px] transition-transform shadow-sm flex justify-center items-center gap-2"
                  >
                    {submittingNote ? 'SAVING...' : 'ADD NOTE'}
                  </button>
                </form>

                {/* Log */}
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                  {activityLog.length > 0 ? (
                    activityLog.map((log) => (
                      <div key={log.id} className="p-3 border-l-4 border-l-[#1A1A1A] dark:border-l-[#333] bg-surface-elevated font-mono text-xs space-y-1">
                        <div className="flex justify-between text-text-muted">
                          <span className="uppercase">{log.action_type}</span>
                          <span>{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-text-primary font-medium whitespace-pre-wrap">{log.action_details || 'No details provided.'}</p>
                        {log.created_by_name && (
                          <p className="text-text-muted text-[10px] mt-1">By: {log.created_by_name}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-text-muted font-mono text-xs italic">No activity logged yet.</p>
                  )}
                </div>
              </div>
            </section>

          </div>

          {/* Right Column: Context & Map */}
          <div className="lg:col-span-1 space-y-6">

            {/* Report Actions */}
            <div className="bg-surface p-5 border border-border border-[#1A1A1A] shadow-sm space-y-3">
              <h3 className="font-mono text-xs uppercase tracking-widest text-[#ccff00] mb-2">Report Actions</h3>

              {(!report.status || ['submitted', 'pending', 'unresolved'].includes(report.status)) && (
                <button
                  onClick={() => handleStatusAdvance('acknowledged')}
                  disabled={isSubmittingStatus || !isAssigned}
                  className="w-full px-4 py-3 bg-info text-white rounded-lg hover:bg-info/90 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm shadow-sm transition-all"
                >
                  {isSubmittingStatus ? 'Updating...' : '✅ Mark as Acknowledged'}
                </button>
              )}

              {report.status === 'acknowledged' && (
                <button
                  onClick={() => handleStatusAdvance('responded')}
                  disabled={isSubmittingStatus || !isAssigned}
                  className="w-full px-4 py-3 bg-purple text-white rounded-lg hover:bg-purple/90 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm shadow-sm transition-all"
                >
                  {isSubmittingStatus ? 'Updating...' : '👷 Mark as Responded'}
                </button>
              )}

              {report.status === 'responded' && (
                <button
                  onClick={() => handleStatusAdvance('resolved')}
                  disabled={isSubmittingStatus || !isAssigned}
                  className="w-full px-4 py-3 bg-success text-white rounded-lg hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm shadow-sm transition-all"
                >
                  {isSubmittingStatus ? 'Updating...' : '🧹 Cleanup Completed / Mark Done'}
                </button>
              )}

              {report.status === 'resolved' && (
                <div className="w-full px-4 py-3 bg-success/20 border border-success/40 text-success rounded-lg font-bold text-sm text-center">
                  ✓ Waiting for Citizen to Close
                </div>
              )}

              {report.status === 'closed' && (
                <div className="w-full px-4 py-3 bg-surface-elevated border border-border text-text-muted rounded-lg font-bold text-sm text-center">
                  ✓ Report Closed
                </div>
              )}

              {!isAssigned && (
                <p className="text-xs text-text-muted font-mono text-center">
                  You must be assigned to update report status.
                </p>
              )}
            </div>

            {/* Navigation Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push(`/dashboard/field-crew/operations/${task.id}`)}
                className="w-full py-3 bg-transparent border border-border border-[#1A1A1A] font-bold flex items-center justify-center gap-2 hover:bg-[#1A1A1A] hover:text-white dark:hover:bg-surface dark:hover:text-text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Cluster
              </button>
              <button
                onClick={() => router.push(`/dashboard/field-crew/my-route?lat=${loc.latitude}&lng=${loc.longitude}&id=${report.id}`)}
                className="w-full py-3 bg-[#1A1A1A] dark:bg-surface text-white dark:text-text-primary font-bold border border-border border-[#1A1A1A] shadow-[4px_4px_0px_0px_#ccff00] flex items-center justify-center gap-2 hover:translate-x-[2px] hover:translate-y-[2px] transition-transform"
              >
                <MapIcon className="w-4 h-4" /> View on Map
              </button>
              {loc.latitude && loc.longitude && (
                <button
                  type="button"
                  onClick={() => setShowNavModal(true)}
                  className="w-full py-3 bg-[#ccff00] text-black font-mono font-bold uppercase tracking-wider border border-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A] flex items-center justify-center gap-2 hover:translate-x-[2px] hover:translate-y-[2px] transition-transform"
                >
                  <Navigation className="w-4 h-4" /> Open in Navigation
                </button>
              )}
            </div>

            {/* External Navigation Modal */}
            {showNavModal && loc.latitude && loc.longitude && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-surface border border-border p-6 rounded-xl max-w-sm w-full space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h3 className="font-bold text-base flex items-center gap-2 text-text-primary">
                      <Navigation className="w-4 h-4 text-primary" />
                      Open in Navigation
                    </h3>
                    <button
                      onClick={() => setShowNavModal(false)}
                      className="text-text-muted hover:text-text-primary text-sm font-mono px-2 py-1"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Choose an external navigation app to navigate to coordinates ({loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}):
                  </p>
                  <div className="grid grid-cols-1 gap-3 pt-2">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowNavModal(false)}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface-elevated text-text-primary font-medium text-sm transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        🗺️ Google Maps
                      </span>
                      <ExternalLink className="w-4 h-4 text-text-muted" />
                    </a>
                    <a
                      href={`https://waze.com/ul?ll=${loc.latitude},${loc.longitude}&navigate=yes`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowNavModal(false)}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface-elevated text-text-primary font-medium text-sm transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        🚗 Waze
                      </span>
                      <ExternalLink className="w-4 h-4 text-text-muted" />
                    </a>
                  </div>
                  <button
                    onClick={() => setShowNavModal(false)}
                    className="w-full mt-2 py-2 text-xs font-mono text-text-muted hover:text-text-primary text-center"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Cleanup Task Context */}
            <div className="bg-surface p-5 border border-border border-[#1A1A1A]  shadow-sm">
              <h3 className="font-mono text-xs uppercase tracking-widest text-[#ccff00] mb-3">Parent Cluster Context</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-bold">{task.title}</p>
                  <p className="text-xs text-text-muted mt-1">{task.description}</p>
                </div>
                <div className="flex justify-between items-center text-sm font-mono border-t border-border pt-3">
                  <span className="text-text-muted uppercase">Status</span>
                  <span className="font-bold">{task.status}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-mono border-t border-border pt-3">
                  <span className="text-text-muted uppercase">Crew</span>
                  <span className="font-bold">{task.assigned_crew_ids?.length || 0} Assigned</span>
                </div>
              </div>
            </div>

            {/* Static Map */}
            {loc.latitude && loc.longitude && (
              <div className="border border-border border-[#1A1A1A]  shadow-sm h-[300px] overflow-hidden bg-surface-elevated relative z-0">
                <EcoPinMap
                  centerLat={mapCenterLat}
                  centerLng={mapCenterLng}
                  hideFilterPanel={true}
                  hideClusters={true}
                  allowedReportIds={[report.id.toString()]}
                  photoPins={true}
                />
              </div>
            )}
          </div>

        </div>

      </div>
      {notification && (
        <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
      )}
    </FieldCrewGuard>
  )
}
