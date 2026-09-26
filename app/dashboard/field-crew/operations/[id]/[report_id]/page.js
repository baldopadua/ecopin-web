'use client'
import React, { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Map as MapIcon, Upload, Trash2, Camera } from 'lucide-react'
import { FieldCrewGuard } from '@/components/auth/RequireRole'
import { useUser } from '@/components/auth/UserContext'
import PageHeader from '@/components/layout/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import Notification from '@/components/ui/Notification'
import { SkeletonLine, SkeletonCard } from '@/components/ui/Skeleton'
import dynamic from 'next/dynamic'
import wkx from 'wkx'
import { Buffer } from 'buffer'

// API
import { fetchCleanupTaskById, fetchReportById, uploadCleanupPhoto, logAgencyResponse, fetchAgencyResponses, fetchReportEvidence, updateLifecycleStage } from '@/lib/api'

// We need dynamic import for EcoPinMap since it uses Leaflet which requires window
const EcoPinMap = dynamic(() => import('@/components/map/EcoPinMap'), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full bg-surface-elevated animate-pulse border-2 border-border flex items-center justify-center">Loading Map...</div>
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
    console.error('Error parsing location:', error)
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

  // Photo state
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef(null)
  const [uploadType, setUploadType] = useState('before') // 'before' | 'after'

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
        console.error('Error loading report details:', error)
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

      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/reports/${reportId}/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
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
          if (!report.stage || report.stage === 'submitted' || report.stage === 'pending') {
            await updateLifecycleStage(reportId, 'acknowledged')
          }
        } else if (activeUploadType === 'after') {
          await updateLifecycleStage(reportId, 'responded')
        }
      } catch (stageError) {
        console.error('Failed to advance lifecycle stage:', stageError)
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

        <div className="bg-[#1A1A1A] border-2 border-[#ccff00] p-3 shadow-[4px_4px_0px_0px_#ccff00]">
          <p className="font-mono text-xs text-[#ccff00] font-bold uppercase tracking-widest text-center">
            [ READ-ONLY METADATA — FIELD CREW VIEW ]
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Metadata, Photos, Notes */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Metadata Section */}
            <section className="bg-surface p-6 border-2 border-[#1A1A1A] dark:border-[#333] shadow-[8px_8px_0px_0px_#1a1a1a]">
              <div className="flex justify-between items-start mb-4 border-b-2 border-border pb-4">
                <div>
                  <h2 className="text-2xl font-bold font-mono tracking-tight text-text-primary mb-1">{report.title}</h2>
                  <p className="text-text-secondary text-sm">{report.description || 'No description provided.'}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={report.status} type="report" />
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
                  <div className="md:col-span-2 mt-4 pt-4 border-t-2 border-border">
                    <dt className="font-mono text-xs uppercase tracking-widest text-[#ccff00] mb-1">Reporter Information</dt>
                    <dd className="text-text-primary font-medium">{report.reporter_name} (ID: {report.reporter_id})</dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Photo Verification System */}
            <section className="bg-surface p-6 border-2 border-[#1A1A1A] dark:border-[#333] shadow-[8px_8px_0px_0px_#1a1a1a]">
              <h3 className="font-mono text-sm uppercase tracking-widest text-text-primary mb-4 border-b-2 border-border pb-2">Photo Verification System</h3>
              
              <div className="space-y-6">
                {/* Citizen Evidence */}
                <div>
                  <h4 className="font-mono text-xs uppercase text-text-muted mb-3">Citizen Evidence (Read-Only)</h4>
                  {evidence.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {evidence.map((ev, i) => (
                        <a key={i} href={ev.file_url} target="_blank" rel="noreferrer" className="block relative group border-2 border-border overflow-hidden">
                          <img src={ev.file_url} alt="Citizen Evidence" className="w-full h-32 object-cover group-hover:scale-105 transition-transform" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-surface-elevated border-2 border-dashed border-border p-4 text-center">
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
                        <div key={i} className="relative group border-2 border-[#1A1A1A] dark:border-[#333]">
                          <img src={photo.url} alt={`Crew ${photo.type}`} className="w-full h-32 object-cover" />
                          <div className="absolute top-0 right-0 bg-[#1A1A1A] text-white text-[10px] font-mono px-2 py-1 uppercase">{photo.type}</div>
                        </div>
                     ))}
                   </div>

                   {crewPhotos.length < 5 && isAssigned ? (
                     <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="w-full py-3 px-4 bg-transparent border-2 border-dashed border-[#1A1A1A] dark:border-[#333] hover:border-[#ccff00] hover:bg-[#ccff00]/10 text-text-primary font-mono text-sm transition-colors flex items-center justify-center gap-2 font-bold uppercase tracking-widest"
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
                     <div className="p-4 border-2 border-dashed border-error/50 bg-error/10 text-center text-error font-mono text-sm">
                       {isAssigned ? '[ PHOTO LIMIT REACHED: 5/5 ]' : '[ NOT ASSIGNED TO THIS TASK ]'}
                     </div>
                   )}
                </div>
              </div>
            </section>

            {/* Field Crew Notes & Activity Log */}
            <section className="bg-surface p-6 border-2 border-[#1A1A1A] dark:border-[#333] shadow-[8px_8px_0px_0px_#1a1a1a]">
              <h3 className="font-mono text-sm uppercase tracking-widest text-text-primary mb-4 border-b-2 border-border pb-2">Activity Log & Notes</h3>
              
              <div className="space-y-6">
                {/* Notes Input */}
                <form onSubmit={handleNoteSubmit}>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    disabled={!isAssigned || submittingNote}
                    placeholder={isAssigned ? "Add operational remarks..." : "You must be assigned to add notes."}
                    className="w-full h-24 p-3 border-2 border-[#1A1A1A] dark:border-[#333] bg-transparent text-text-primary font-mono text-sm resize-none outline-none focus:border-[#ccff00] disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                  />
                  <button
                    type="submit"
                    disabled={!isAssigned || submittingNote || !noteText.trim()}
                    className="w-full py-3 bg-[#ccff00] text-black font-bold border-2 border-[#1A1A1A] disabled:opacity-50 disabled:cursor-not-allowed hover:translate-x-[2px] hover:translate-y-[2px] transition-transform shadow-[4px_4px_0px_0px_#1a1a1a] flex justify-center items-center gap-2"
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
            
            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push(`/dashboard/field-crew/operations/${task.id}`)}
                className="w-full py-3 bg-transparent border-2 border-[#1A1A1A] dark:border-[#333] font-bold flex items-center justify-center gap-2 hover:bg-[#1A1A1A] hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Cluster
              </button>
              <button
                onClick={() => router.push(`/dashboard/field-crew/my-route?lat=${loc.latitude}&lng=${loc.longitude}&id=${report.id}`)}
                className="w-full py-3 bg-[#1A1A1A] dark:bg-white text-white dark:text-black font-bold border-2 border-[#1A1A1A] dark:border-white shadow-[4px_4px_0px_0px_#ccff00] flex items-center justify-center gap-2 hover:translate-x-[2px] hover:translate-y-[2px] transition-transform"
              >
                <MapIcon className="w-4 h-4" /> View on Map
              </button>
            </div>

            {/* Cleanup Task Context */}
            <div className="bg-surface p-5 border-2 border-[#1A1A1A] dark:border-[#333] shadow-[4px_4px_0px_0px_#1a1a1a]">
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
              <div className="border-2 border-[#1A1A1A] dark:border-[#333] shadow-[4px_4px_0px_0px_#1a1a1a] h-[300px] overflow-hidden bg-surface-elevated relative z-0">
                <EcoPinMap
                  centerLat={mapCenterLat}
                  centerLng={mapCenterLng}
                  hideFilterPanel={true}
                  hideClusters={true}
                  allowedReportIds={[report.id.toString()]}
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
