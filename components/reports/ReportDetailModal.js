'use client'
import React, { useState } from 'react'
import SecureImage from '@/components/ui/SecureImage'
import StatusBadge from '@/components/ui/StatusBadge'
import ImageLightbox from '@/components/ui/ImageLightbox'
import Dialog from '@/components/ui/Dialog'
import { getOptimizedImageUrl } from '@/components/ui/EvidenceGallery'
import { X, ChevronLeft, ChevronRight, Maximize2, MapPin, Calendar, Tag, AlertCircle, FileText } from 'lucide-react'

export default function ReportDetailModal({ report, evidence = [], agencyResponses = [], onClose }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)

  if (!report) return null

  // Aggregate all photos for this report
  const images = []
  if (report.image_url) images.push({ url: report.image_url, label: 'Reported Photo' })
  if (report.before_photo_url) images.push({ url: report.before_photo_url, label: 'Before Cleanup' })
  if (report.after_photo_url) images.push({ url: report.after_photo_url, label: 'After Cleanup' })
  ;(evidence || []).forEach((img, idx) => {
    const url = img.photo_url || img.file_url || img.url
    if (url && !images.some(existing => existing.url === url)) {
      images.push({ url, label: img.name || `Evidence #${idx + 1}` })
    }
  })

  return (
    <>
      <Dialog open={Boolean(report)} onClose={onClose} labelledBy="report-modal-title">
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
                <SecureImage 
                  src={getOptimizedImageUrl(images[currentImageIndex]?.url, { width: 1200 })} 
                  alt={images[currentImageIndex]?.label || 'Report Evidence'} 
                  className="max-w-full max-h-full object-contain cursor-pointer"
                  onClick={() => setIsLightboxOpen(true)}
                />
                
                {/* Photo Label Pill */}
                <div className="absolute top-3 left-3 bg-black/70 text-white px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-wider rounded border border-white/20">
                  {images[currentImageIndex]?.label}
                </div>

                {/* Counter Pill */}
                {images.length > 1 && (
                  <div className="absolute top-3 right-12 md:right-14 bg-black/70 text-white px-2.5 py-1 text-[11px] font-mono tracking-wider rounded border border-white/20">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                )}

                {/* Expand Lightbox Button */}
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="absolute top-3 left-3 md:left-auto md:right-3 bg-black/70 text-white p-2 min-h-11 min-w-11 rounded-xl border border-white/20 hover:border-primary hover:text-primary transition-colors"
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
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 text-white p-2 min-h-11 min-w-11 rounded-full opacity-100 transition-opacity hover:bg-black/90"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 text-white p-2 min-h-11 min-w-11 rounded-full opacity-100 transition-opacity hover:bg-black/90"
                      aria-label="Next photo"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    {/* Bottom Thumbnail Strip */}
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 px-2 overflow-x-auto">
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
                    {report.created_at ? new Date(report.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    }) : '—'}
                  </span>
                </div>
              </div>

              {/* Geographic Coordinates & Location */}
              <div className="bg-surface p-3.5 border border-border rounded-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" /> Location Intel
                </h4>
                {report.location_address && (
                  <p className="text-xs text-text-primary mb-2 font-medium">
                    {report.location_address}
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
            <div className="p-4 border-t border-border bg-surface flex justify-end shrink-0">
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
