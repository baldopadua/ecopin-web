'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import SecureImage from '@/components/ui/SecureImage'
import StatusBadge from '@/components/ui/StatusBadge'
import ImageLightbox from '@/components/ui/ImageLightbox'
import Dialog from '@/components/ui/Dialog'
import { getOptimizedImageUrl } from '@/components/ui/EvidenceGallery'
import { isVideoResource, getVideoPosterUrl } from '@/lib/helpers/mediaHelpers'
import { formatReportAddress } from '@/lib/format-location.mjs'
import { X, ChevronLeft, ChevronRight, Maximize2, MapPin, Calendar, Tag, AlertCircle, FileText, ExternalLink, Video, Play } from 'lucide-react'

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
              .catch((retryErr) => console.error('Modal muted play retry failed:', retryErr))
          } else {
            console.warn('Modal video play error:', err?.name, err?.message)
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

export default function ReportDetailModal({ report, evidence = [], agencyResponses = [], onClose, className = '' }) {
  const router = useRouter()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  if (!report) return null

  const locationAddress = report.street_address || report.location_address || report.address || (report.latitude && report.longitude ? formatReportAddress(report) : null)

  // Aggregate all photos and videos for this report
  const images = []
  if (report.image_url) {
    const isVideo = isVideoResource(report.image_url)
    images.push({ url: report.image_url, label: isVideo ? 'Reported Video' : 'Reported Photo', isVideo, poster: getVideoPosterUrl(report.image_url) })
  }
  if (report.video_url && !images.some(existing => existing.url === report.video_url)) {
    images.push({ url: report.video_url, label: 'Reported Video', isVideo: true, poster: getVideoPosterUrl(report.video_url) })
  }
  if (report.before_photo_url) {
    const isVideo = isVideoResource(report.before_photo_url)
    images.push({ url: report.before_photo_url, label: isVideo ? 'Before Cleanup Video' : 'Before Cleanup', isVideo, poster: getVideoPosterUrl(report.before_photo_url) })
  }
  if (report.after_photo_url) {
    const isVideo = isVideoResource(report.after_photo_url)
    images.push({ url: report.after_photo_url, label: isVideo ? 'After Cleanup Video' : 'After Cleanup', isVideo, poster: getVideoPosterUrl(report.after_photo_url) })
  }
  ;(evidence || []).forEach((img, idx) => {
    const url = img.photo_url || img.file_url || img.url
    if (url && !images.some(existing => existing.url === url)) {
      const isVideo = img.resource_type === 'video' || isVideoResource(url, img.resource_type)
      images.push({
        url,
        label: img.name || (isVideo ? `Evidence Video #${idx + 1}` : `Evidence #${idx + 1}`),
        isVideo,
        poster: getVideoPosterUrl(url)
      })
    }
  })

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

          {/* Left Side: Images Gallery */}
          <div className="w-full md:w-[58%] bg-black flex-shrink-0 relative overflow-hidden flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border h-64 md:h-full">
            {images.length === 0 ? (
              <div className="text-white/50 text-sm flex flex-col items-center gap-2">
                <FileText className="w-8 h-8 opacity-40" />
                <span>No Visual Evidence Attached</span>
              </div>
            ) : (
              <div className="w-full h-full relative flex items-center justify-center group bg-black/90">
                {images[currentImageIndex]?.isVideo ? (
                  <ModalVideoPlayer
                    key={images[currentImageIndex]?.url}
                    src={images[currentImageIndex]?.url}
                    poster={images[currentImageIndex]?.poster}
                  />
                ) : (
                  <SecureImage 
                    src={getOptimizedImageUrl(images[currentImageIndex]?.url, { width: 1200 })} 
                    alt={images[currentImageIndex]?.label || 'Report Evidence'} 
                    className="max-w-full max-h-full object-contain cursor-pointer"
                    wrapperClassName="w-full h-full flex items-center justify-center"
                    onClick={() => setIsLightboxOpen(true)}
                  />
                )}

                
                {/* Photo/Video Label Pill */}
                <div className="absolute top-3 left-3 z-20 bg-black/70 text-white px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider rounded border border-white/20 flex items-center gap-1.5">
                  {images[currentImageIndex]?.isVideo && <Video className="w-3.5 h-3.5 text-primary" />}
                  <span>{images[currentImageIndex]?.label}</span>
                </div>

                {/* Counter Pill */}
                {images.length > 1 && (
                  <div className="absolute top-3 right-12 md:right-14 z-20 bg-black/70 text-white px-2.5 py-1 text-[11px] font-mono tracking-wider rounded border border-white/20">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                )}

                {/* Expand Lightbox Button */}
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="absolute top-3 left-3 md:left-auto md:right-3 z-20 bg-black/70 text-white p-2 min-h-11 min-w-11 rounded-xl border border-white/20 hover:border-primary hover:text-primary transition-colors"
                  title="Expand to Fullscreen"
                  aria-label="Expand photo"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                {/* Prev / Next Carousel Controls */}
                {images.length > 1 && (
                  <>
                    <button 
                      type="button"
                      onClick={(e) => { 
                        e.stopPropagation()
                        setCurrentImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1)
                      }} 
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/60 text-white p-2 min-h-11 min-w-11 rounded-full opacity-100 transition-opacity hover:bg-black/90"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => { 
                        e.stopPropagation()
                        setCurrentImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0)
                      }} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/60 text-white p-2 min-h-11 min-w-11 rounded-full opacity-100 transition-opacity hover:bg-black/90"
                      aria-label="Next photo"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    {/* Bottom Thumbnail Strip */}
                    <div className="absolute bottom-2 left-0 right-0 z-20 flex justify-center gap-1.5 px-2 overflow-x-auto">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setCurrentImageIndex(idx)
                          }}
                          className={`w-9 h-9 border rounded-xs overflow-hidden transition-all ${
                            idx === currentImageIndex ? 'border-primary ring-2 ring-primary/40' : 'border-white/30 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <SecureImage
                            src={getOptimizedImageUrl(img.url, { width: 100 })}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Side: Details & Metadata */}
          <div className="w-full md:w-[42%] flex-1 min-h-0 flex flex-col md:h-full bg-surface-elevated overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-start p-5 border-b border-border bg-surface shrink-0">
              <div className="pr-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-text-muted">
                  Report ID: {report.id?.slice(0, 13)}
                </span>
                <h2 id="report-modal-title" className="text-lg font-medium text-text-primary tracking-tight leading-snug mt-1">
                  {report.title || 'Untitled Incident'}
                </h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <StatusBadge status={report.status} type="report" />
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

            {/* Scrollable Information Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Description */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Description
                </h4>
                <p className="text-sm text-text-primary whitespace-pre-line bg-surface p-3 border border-border rounded-sm leading-relaxed">
                  {report.description || 'No detailed description provided by reporter.'}
                </p>
              </div>

              {/* Incident Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-surface p-3 border border-border rounded-sm">
                  <span className="text-text-muted uppercase tracking-wider font-mono text-[10px] block mb-1 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Issue Category
                  </span>
                  <span className="font-bold text-text-primary text-sm capitalize">
                    {report.issue_type?.replace(/_/g, ' ') || 'General'}
                  </span>
                </div>

                <div className="bg-surface p-3 border border-border rounded-sm">
                  <span className="text-text-muted uppercase tracking-wider font-mono text-[10px] block mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Date Logged
                  </span>
                  <span className="font-bold text-text-primary text-xs font-mono">
                    {report.created_at ? new Date(report.created_at).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : '—'}
                  </span>
                </div>
              </div>

              {/* Geographic Coordinates & Location */}
              <div className="bg-surface p-3.5 border border-border rounded-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" /> Location Intel
                </h4>
                {locationAddress && (
                  <p className="text-xs text-text-primary mb-2 font-medium">
                    {locationAddress}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs font-mono text-text-muted bg-surface-elevated p-2 border border-border">
                  <span>Coordinates</span>
                  <span className="text-text-primary font-bold">
                    {report.latitude && report.longitude 
                      ? `${Number(report.latitude).toFixed(5)}, ${Number(report.longitude).toFixed(5)}`
                      : 'Geo-tagged on map'}
                  </span>
                </div>
              </div>

              {/* Audit Trail if available */}
              {agencyResponses && agencyResponses.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Audit Activity</h4>
                  <div className="space-y-2">
                    {agencyResponses.map((res, i) => (
                      <div key={i} className="border-l-2 border-primary pl-2.5 py-0.5">
                        <div className="text-[10px] font-mono text-text-muted">
                          {new Date(res.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-xs text-text-primary mt-0.5">{res.action_details || res.notes || 'Status updated'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-surface flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (onClose) onClose()
                  router.push(`/dashboard/raw-data/${report.id}`)
                }}
                className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-medium min-h-11"
              >
                <span>View Detailed Report</span>
                <ExternalLink className="w-4 h-4" />
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

      {/* Lightbox when user clicks full screen on any photo */}
      {isLightboxOpen && (
        <ImageLightbox
          images={images}
          currentIndex={currentImageIndex}
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          onNavigate={(newIdx) => setCurrentImageIndex(newIdx)}
        />
      )}
    </>
  )
}
