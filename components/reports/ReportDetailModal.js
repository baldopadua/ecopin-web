'use client'
import ReportPriorityBadge from '@/components/reports/ReportPriorityBadge'
import PublicCleanupProof from './PublicCleanupProof'
import PageTabs from '@/components/ui/PageTabs'
import { buildReportPhotos, countPhotos, presentGroups, photoSummaryLines } from '@/lib/report-photos.mjs'
import {reportDiagnostic} from '@/lib/diagnostics.mjs'
import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import SecureImage from '@/components/ui/SecureImage'
import StatusBadge from '@/components/ui/StatusBadge'
import ImageLightbox from '@/components/ui/ImageLightbox'
import Dialog from '@/components/ui/Dialog'
import { getOptimizedImageUrl } from '@/components/ui/EvidenceGallery'
import { isVideoResource, getVideoPosterUrl } from '@/lib/helpers/mediaHelpers'
import { formatReportAddress } from '@/lib/format-location.mjs'
import { X, ChevronLeft, ChevronRight, Maximize2, ExternalLink, Video, Play, User, HardHat, CircleCheck, FileText } from 'lucide-react'

function ModalVideoPlayer({ src, poster }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = React.useRef(null)

  if (!src) return null

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
              .catch((retryErr) => reportDiagnostic('error','media','Modal muted play retry failed:',retryErr))
          } else {
            reportDiagnostic('warn','media','Modal video play error:',err)
          }
        })
    }
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <video
        ref={videoRef}
        key={src}
        src={src}
        poster={poster || undefined}
        controls
        playsInline
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPlaying={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        className="max-w-full max-h-full object-contain"
      />
      {!isPlaying && (
        <button
          type="button"
          onClick={handlePlayClick}
          className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/60 hover:bg-black/80 text-white border-2 border-white/80 hover:border-white shadow-2xl backdrop-blur-xs flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 z-10 cursor-pointer pointer-events-auto"
          aria-label="Play video"
          title="Play video"
        >
          <Play className="w-7 h-7 fill-white text-white translate-x-0.5" />
        </button>
      )}
    </div>
  )
}


// The photo viewer sits on black, so these are the light-theme-independent
// versions of the status colours. Colour backs up the written label.
const GROUP_LOOK = {
  citizen: { color: '#82B6FF', token: 'var(--info)', Icon: User, tab: 'Citizen' },
  before: { color: '#FCD34D', token: 'var(--warning)', Icon: HardHat, tab: 'Crew before' },
  after: { color: '#83CBA0', token: 'var(--success)', Icon: CircleCheck, tab: 'Crew after' },
}
const GROUP_HEADING = { citizen: 'Citizen', before: 'Before', after: 'After' }

export default function ReportDetailModal({ report, evidence = [], agencyResponses = [], onClose, className = '' }) {
  const router = useRouter()
  const [tab, setTab] = useState('all')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  const photos = useMemo(
    () => buildReportPhotos(report, evidence, { isVideoResource, getVideoPosterUrl }),
    [report, evidence]
  )

  if (!report) return null

  const groups = presentGroups(photos)
  const counts = countPhotos(photos)
  const summary = photoSummaryLines(photos)
  // A tab for a group that has no photos never shows; a single group needs no tabs.
  const activeTab = tab === 'all' || groups.includes(tab) ? tab : 'all'
  const images = activeTab === 'all' ? photos : photos.filter(photo => photo.group === activeTab)
  const index = Math.min(currentImageIndex, Math.max(0, images.length - 1))
  const current = images[index]
  const look = current ? GROUP_LOOK[current.group] : null
  const tabs = [
    { id: 'photos-all', label: `All · ${photos.length}` },
    ...groups.map(group => ({ id: `photos-${group}`, label: `${GROUP_LOOK[group].tab} · ${counts[group]}` })),
  ]
  const chooseTab = (id) => {
    setTab(id.replace('photos-', ''))
    setCurrentImageIndex(0)
  }
  const hasCrewPhotos = counts.before + counts.after > 0

  const formattedAddr = formatReportAddress(report)
  const locationAddress = formattedAddr && formattedAddr !== 'Pasig City'
    ? formattedAddr
    : (report.street_address || report.location_address || report.address || formattedAddr)
  const hasCoordinates = report.latitude != null && report.longitude != null && report.latitude !== '' && report.longitude !== ''

  return (
    <>
      <Dialog className={className} open={Boolean(report)} onClose={onClose} labelledBy="report-modal-title">
        <div
          className="bg-surface-elevated flex flex-col md:flex-row w-full max-w-5xl h-[85dvh] max-h-[750px] shadow-lg rounded-3xl overflow-hidden relative border border-border cursor-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button Mobile (top-right absolute) */}
          <button
            type="button"
            onClick={onClose}
            className="md:hidden absolute top-3 right-3 z-50 bg-black/60 text-white rounded-full p-2 min-h-11 min-w-11 hover:bg-black/80 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left side: photos, grouped by who took them */}
          <div className="w-full md:w-[58%] bg-black flex-shrink-0 relative overflow-hidden flex flex-col border-b md:border-b-0 md:border-r border-border h-80 md:h-full">
            {photos.length === 0 ? (
              <div className="flex-1 text-white/70 text-sm flex flex-col items-center justify-center gap-2">
                <FileText className="w-8 h-8 opacity-50" aria-hidden="true" />
                <span>No photos or videos on this report</span>
              </div>
            ) : (
              <>
                {groups.length > 1 && (
                  <div className="shrink-0 p-2 pr-16 md:pr-2 bg-surface-elevated border-b border-border">
                    <PageTabs label="Photos by source" tabs={tabs} value={`photos-${activeTab}`} onChange={chooseTab} />
                  </div>
                )}

                <div
                  id={`photos-${activeTab}-panel`}
                  role="tabpanel"
                  aria-label="Selected photo"
                  className="flex-1 min-h-0 relative flex items-center justify-center group bg-black/90"
                >
                  {current?.isVideo ? (
                    <ModalVideoPlayer key={current.url} src={current.url} poster={current.poster} />
                  ) : (
                    <SecureImage
                      src={getOptimizedImageUrl(current?.url, { width: 1200 })}
                      alt={`${current?.label || 'Report photo'}${current?.fileName ? `, ${current.fileName}` : ''}`}
                      className="max-w-full max-h-full object-contain cursor-pointer"
                      wrapperClassName="w-full h-full flex items-center justify-center"
                      onClick={() => setIsLightboxOpen(true)}
                    />
                  )}

                  {/* Source label: who took this photo, in words */}
                  {current && look && (
                    <div
                      className="absolute top-3 left-3 z-20 max-w-[70%] flex items-center gap-2 bg-black/80 text-white pl-3 pr-3.5 py-1.5 text-sm font-medium rounded-full border-2"
                      style={{ borderColor: look.color }}
                    >
                      <look.Icon className="w-4 h-4 shrink-0" style={{ color: look.color }} aria-hidden="true" />
                      <span className="truncate">{current.label}</span>
                      {current.isVideo && <Video className="w-4 h-4 shrink-0 text-white/80" aria-hidden="true" />}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className={`absolute right-3 ${groups.length > 1 ? 'top-3' : 'top-16 md:top-3'} z-20 bg-black/70 text-white p-2 min-h-11 min-w-11 rounded-xl border border-white/30 hover:border-white transition-colors flex items-center justify-center`}
                    title="Expand to fullscreen"
                    aria-label="Expand photo"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setCurrentImageIndex(index > 0 ? index - 1 : images.length - 1)
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/60 text-white p-2 min-h-11 min-w-11 rounded-full hover:bg-black/90 flex items-center justify-center"
                        aria-label="Previous photo"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setCurrentImageIndex(index < images.length - 1 ? index + 1 : 0)
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/60 text-white p-2 min-h-11 min-w-11 rounded-full hover:bg-black/90 flex items-center justify-center"
                        aria-label="Next photo"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Caption: when it was added and its file name, kept apart from the label */}
                <div className="shrink-0 px-4 py-2 text-xs text-white/80 bg-black flex items-center justify-between gap-3" aria-live="polite">
                  <span className="truncate">
                    {[current?.caption, current?.fileName].filter(Boolean).join(' · ') || ' '}
                  </span>
                  <span className="shrink-0">{index + 1} of {images.length}</span>
                </div>

                {/* Thumbnails, with a heading and a coloured border per source */}
                {images.length > 1 && (
                  <div className="shrink-0 flex items-end gap-1.5 px-3 pb-3 pt-1 bg-black overflow-x-auto">
                    {images.map((img, idx) => {
                      const thumbLook = GROUP_LOOK[img.group]
                      const startsGroup = activeTab === 'all' && (idx === 0 || images[idx - 1].group !== img.group)
                      return (
                        <React.Fragment key={img.url}>
                          {startsGroup && idx > 0 && <span className="self-stretch w-px bg-white/30 mx-1" aria-hidden="true" />}
                          <div className="flex flex-col gap-1 shrink-0">
                            <span className="text-xs text-white/70 h-4">{startsGroup ? GROUP_HEADING[img.group] : ''}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setCurrentImageIndex(idx)
                              }}
                              aria-label={`${img.label}, ${idx + 1} of ${images.length}`}
                              aria-current={idx === index ? 'true' : undefined}
                              className={`w-11 h-11 rounded-lg overflow-hidden border-2 transition-opacity ${idx === index ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                              style={{ borderColor: idx === index ? '#fff' : thumbLook.color }}
                            >
                              <SecureImage
                                src={getOptimizedImageUrl(img.url, { width: 100 })}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </button>
                          </div>
                        </React.Fragment>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right side: details */}
          <div className="w-full md:w-[42%] flex-1 min-h-0 flex flex-col md:h-full bg-surface-elevated overflow-hidden">
            <div className="flex justify-between items-start p-5 border-b border-border bg-surface shrink-0">
              <div className="pr-4 min-w-0">
                <span className="text-xs font-mono text-text-muted">
                  Report {report.id?.slice(0, 13)}
                </span>
                <h2 id="report-modal-title" className="text-lg font-medium text-text-primary leading-snug mt-1">
                  {report.title || 'Untitled incident'}
                </h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <StatusBadge status={report.status} type="report" />
                  <ReportPriorityBadge priority={report.citizen_priority} />
                  {report.validation_status && (
                    <StatusBadge status={report.validation_status} type="validation" />
                  )}
                  {report.location_verification_status && (
                    <StatusBadge
                      status={report.location_verification_status}
                      type="location_verification"
                      distanceMeters={report.photo_distance_meters}
                    />
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="hidden md:flex min-h-11 min-w-11 items-center justify-center text-text-secondary hover:text-text-primary transition-colors p-2 rounded-xl hover:bg-surface-elevated"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {summary.length > 0 && (
                <section aria-label="Photos" className="bg-surface p-4 border border-border rounded-2xl space-y-2">
                  <h3 className="text-sm font-medium text-text-primary">Photos</h3>
                  <ul className="space-y-1.5">
                    {summary.map(line => {
                      const rowLook = GROUP_LOOK[line.group]
                      return (
                        <li key={line.group} className="flex items-center gap-2 text-sm text-text-primary">
                          <rowLook.Icon className="w-4 h-4 shrink-0" style={{ color: rowLook.token }} aria-hidden="true" />
                          <span>{line.text}</span>
                        </li>
                      )
                    })}
                  </ul>
                  {hasCrewPhotos && (
                    <p className="text-sm text-text-secondary">
                      Crew photos here are the originals, for staff only. The public sees privacy-reviewed proof once an officer approves it.
                    </p>
                  )}
                </section>
              )}

              <PublicCleanupProof key={report.id} reportId={report.id} />

              <section aria-label="Description">
                <h3 className="text-sm font-medium text-text-primary mb-1.5">Description</h3>
                <p className="text-sm text-text-primary whitespace-pre-line bg-surface p-3.5 border border-border rounded-2xl leading-relaxed">
                  {report.description || 'The reporter did not add a description.'}
                </p>
              </section>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface p-3.5 border border-border rounded-2xl">
                  <span className="text-sm text-text-secondary block mb-1">Category</span>
                  <span className="font-medium text-text-primary text-sm capitalize">
                    {report.issue_type?.replace(/_/g, ' ') || 'General'}
                  </span>
                </div>
                <div className="bg-surface p-3.5 border border-border rounded-2xl">
                  <span className="text-sm text-text-secondary block mb-1">Reported</span>
                  <span className="font-medium text-text-primary text-sm">
                    {report.created_at ? new Date(report.created_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
                    }) : 'Date not recorded'}
                  </span>
                </div>
              </div>

              <section aria-label="Location" className="bg-surface p-4 border border-border rounded-2xl">
                <h3 className="text-sm font-medium text-text-primary mb-1.5">Where</h3>
                <p className="text-sm text-text-primary">
                  {locationAddress || 'No address recorded'}
                </p>
                {hasCoordinates && (
                  <p className="text-sm text-text-secondary mt-1.5">
                    <span className="font-mono">{Number(report.latitude).toFixed(5)}, {Number(report.longitude).toFixed(5)}</span>
                  </p>
                )}
              </section>

              {agencyResponses && agencyResponses.length > 0 && (
                <section aria-label="Activity" className="space-y-2 pt-1">
                  <h3 className="text-sm font-medium text-text-primary">Activity</h3>
                  <ol className="space-y-3">
                    {agencyResponses.map((res, i) => (
                      <li key={i} className="border-l-2 border-primary pl-3">
                        <div className="text-xs text-text-secondary">
                          {new Date(res.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </div>
                        <div className="text-sm text-text-primary mt-0.5">{res.action_details || res.notes || 'Status updated'}</div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>

            <div className="p-4 border-t border-border bg-surface flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (onClose) onClose()
                  router.push(`/dashboard/raw-data/${report.id}`)
                }}
                className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium min-h-11"
              >
                <span>Open full report</span>
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary px-5 py-2 text-sm font-medium min-h-11"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* Lightbox when the user expands a photo; it keeps the same source labels */}
      {isLightboxOpen && (
        <ImageLightbox
          images={images}
          currentIndex={index}
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          onNavigate={(newIdx) => setCurrentImageIndex(newIdx)}
        />
      )}
    </>
  )
}
