'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import SecureImage from '@/components/ui/SecureImage'
import Dialog from './Dialog'
import { getOptimizedImageUrl } from '@/components/ui/EvidenceGallery'
import { isVideoResource } from '@/lib/helpers/mediaHelpers'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Play } from 'lucide-react'

function LightboxVideoPlayer({ src, poster }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef(null)

  if (!src) return null

  const handlePlayClick = (e) => {
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
              .catch((retryErr) => console.error('Lightbox muted play retry failed:', retryErr))
          } else {
            console.warn('Lightbox video play error:', err?.name, err?.message)
          }
        })
    }
  }

  return (
    <div className="relative max-w-full max-h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
      <video
        ref={videoRef}
        key={src}
        src={src}
        poster={poster || undefined}
        controls
        playsInline
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPlaying={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
      />
      {!isPlaying && (
        <button
          type="button"
          onClick={handlePlayClick}
          className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-black/60 hover:bg-black/80 text-white border-2 border-white/80 hover:border-white shadow-2xl backdrop-blur-xs flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 z-30 cursor-pointer pointer-events-auto"
          aria-label="Play video"
          title="Play video"
        >
          <Play className="w-9 h-9 fill-white text-white translate-x-0.5" />
        </button>
      )}
    </div>
  )
}

export default function ImageLightbox({
  images = [],
  currentIndex = 0,
  isOpen = false,
  onClose,
  onNavigate
}) {
  const [position, setPosition] = useState({ source: currentIndex, index: currentIndex || 0 })
  const [zoomedPhoto, setZoomedPhoto] = useState(null)
  const touchStartX = useRef(null)

  if (position.source !== currentIndex) {
    setPosition({ source: currentIndex, index: currentIndex || 0 })
    setZoomedPhoto(null)
  }

  const normalizedImages = React.useMemo(() => (images || []).map(img => {
    if (typeof img === 'string') {
      const isVideo = isVideoResource(img)
      return { url: img, label: '', isVideo }
    }
    const url = img.photo_url || img.file_url || img.url || ''
    const isVideo = img.isVideo || img.resource_type === 'video' || isVideoResource(url, img.resource_type)
    return {
      url,
      label: img.label || img.reportTitle || (img.reportId ? `Report ${img.reportId}` : ''),
      title: img.title || '',
      isVideo,
      resource_type: img.resource_type
    }
  }).filter(img => Boolean(img.url)), [images])

  const total = normalizedImages.length
  const index = Math.min(Math.max(position.index, 0), Math.max(0, total - 1))
  const currentImage = normalizedImages[index]
  const isZoomed = Boolean(currentImage && zoomedPhoto === currentImage.url)
  const toggleZoom = () => setZoomedPhoto(isZoomed ? null : currentImage.url)

  const handleNext = useCallback(() => {
    if (total <= 1) return
    const nextIdx = (index + 1) % total
    setPosition({ source: currentIndex, index: nextIdx })
    setZoomedPhoto(null)
    onNavigate?.(nextIdx)
  }, [index, total, onNavigate, currentIndex])

  const handlePrev = useCallback(() => {
    if (total <= 1) return
    const prevIdx = (index - 1 + total) % total
    setPosition({ source: currentIndex, index: prevIdx })
    setZoomedPhoto(null)
    onNavigate?.(prevIdx)
  }, [index, total, onNavigate, currentIndex])

  // Keyboard navigation & Escape-to-close
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        handlePrev()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleNext, handlePrev, onClose])

  // Preload adjacent images
  useEffect(() => {
    if (!isOpen || total <= 1) return
    const prevIdx = (index - 1 + total) % total
    const nextIdx = (index + 1) % total
    const preload = (url) => {
      if (!url || typeof window === 'undefined') return
      const img = new Image()
      img.src = getOptimizedImageUrl(url, { width: 1600 })
    }
    preload(normalizedImages[prevIdx]?.url)
    preload(normalizedImages[nextIdx]?.url)
  }, [isOpen, index, total, normalizedImages])

  // Touch swipe support for mobile
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext()
      else handlePrev()
    }
    touchStartX.current = null
  }

  if (!isOpen || !currentImage) return null

  return (
    <Dialog open={isOpen} onClose={onClose} label="Evidence photos">
      <div
        className="relative w-full max-w-5xl h-[92dvh] bg-black rounded-2xl flex flex-col items-center justify-center"
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top Control Bar */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 flex items-center gap-2">
          {!currentImage.isVideo && (
            <button
              type="button"
              onClick={toggleZoom}
              className="p-2 min-h-11 min-w-11 inline-flex items-center justify-center bg-black/60 text-white hover:text-secondary transition-colors rounded-full border border-white/20 hover:border-secondary"
              aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
              title={isZoomed ? 'Zoom out' : 'Zoom in'}
            >
              {isZoomed ? <ZoomOut className="w-5 h-5 shrink-0" /> : <ZoomIn className="w-5 h-5 shrink-0" />}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-h-11 min-w-11 inline-flex items-center justify-center bg-black/60 text-white hover:text-secondary transition-colors rounded-full border border-white/20 hover:border-secondary"
            aria-label="Close lightbox"
            title="Close (Esc)"
          >
            <X className="w-5 h-5 shrink-0" />
          </button>
        </div>

        {/* Previous Button */}
        {total > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 z-50 min-h-11 min-w-11 p-2 sm:p-3 inline-flex items-center justify-center bg-black/60 text-white hover:text-secondary transition-colors rounded-full border border-white/20 hover:border-secondary"
            aria-label="Previous photo"
            title="Previous (Left arrow)"
          >
            <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 shrink-0" />
          </button>
        )}

        {/* Media Display */}
        <div
          className={`w-full h-full flex items-center justify-center p-2 sm:p-8 overflow-auto transition-transform duration-200 ${
            currentImage.isVideo ? '' : `cursor-${isZoomed ? 'zoom-out' : 'zoom-in'}`
          }`}
          onClick={currentImage.isVideo ? undefined : toggleZoom}
        >
          {currentImage.isVideo ? (
            <LightboxVideoPlayer
              key={currentImage.url}
              src={currentImage.url}
              poster={currentImage.poster}
            />
          ) : (
            <SecureImage
              src={getOptimizedImageUrl(currentImage.url, { width: 1600 })}
              alt={currentImage.label || currentImage.title || 'Evidence Photo'}
              decoding="async"
              className={`max-w-full max-h-full object-contain rounded-sm transition-transform duration-200 ${
                isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
              }`}
            />
          )}
        </div>

        {/* Next Button */}
        {total > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2 sm:right-4 z-50 min-h-11 min-w-11 p-2 sm:p-3 inline-flex items-center justify-center bg-black/60 text-white hover:text-secondary transition-colors rounded-full border border-white/20 hover:border-secondary"
            aria-label="Next photo"
            title="Next (Right arrow)"
          >
            <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 shrink-0" />
          </button>
        )}

        {/* Bottom Caption Bar */}
        <div role="status" className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 text-sm border border-white/20 rounded-xl max-w-[90%] max-h-24 overflow-auto text-center">
          <span>{currentImage.label || currentImage.title || `Photo ${index + 1}`}</span>
          {total > 1 && (
            <span className="opacity-60 ml-2 font-normal">
              ({index + 1} / {total})
            </span>
          )}
        </div>
      </div>
    </Dialog>
  )
}
