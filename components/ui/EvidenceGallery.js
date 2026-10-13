'use client'
import SecureImage from '@/components/ui/SecureImage'
import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { fetchBatchReportEvidence } from '@/lib/api/reports'

// Efficiently transforms Cloudinary media URLs into lightweight, auto-formatted thumbnails or previews
export function getOptimizedImageUrl(url, { width = 400, quality = 'auto', format = 'auto' } = {}) {
  if (!url || typeof url !== 'string') return url
  if (url.includes('res.cloudinary.com') && url.includes('/image/upload/')) {
    if (url.includes('/image/upload/w_') || url.includes('/image/upload/f_auto')) {
      return url
    }
    const transform = `f_${format},q_${quality},w_${width},c_limit/`
    return url.replace('/image/upload/', `/image/upload/${transform}`)
  }
  return url
}

export default function EvidenceGallery({ reports = [] }) {
  const [evidence, setEvidence] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightboxImage, setLightboxImage] = useState(null)
  const [displayLimit, setDisplayLimit] = useState(24)

  // Stable report ID key prevents spurious refetches on parent re-renders
  const reportIdsKey = useMemo(() => {
    return (reports || []).map(r => r?.id).filter(Boolean).sort().join(',')
  }, [reports])

  useEffect(() => {
    let isMounted = true
    const abortController = new AbortController()

    const loadEvidence = async () => {
      setLoading(true)
      try {
        const reportIds = (reports || []).map(r => r?.id).filter(Boolean)
        const evidenceMap = await fetchBatchReportEvidence(reportIds, abortController.signal)
        if (isMounted) {
          const aggregated = []
          for (const r of reports) {
            const items = evidenceMap[r?.id] || []
            items.forEach(item => {
              aggregated.push({ ...item, reportTitle: r.title, reportId: r.id })
            })
          }
          setEvidence(aggregated)
          setDisplayLimit(24)
        }
      } catch (error) {
        console.error('Failed to load evidence', error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (reports && reports.length > 0) {
      loadEvidence()
    } else {
      setLoading(false)
      setEvidence([])
    }

    return () => {
      isMounted = false
      abortController.abort('Component unmounted')
    }
  }, [reportIdsKey])

  const handleNextPhoto = useCallback(() => {
    if (evidence.length === 0 || lightboxImage === null) return
    const nextIndex = (lightboxImage + 1) % evidence.length
    setLightboxImage(nextIndex)
  }, [evidence.length, lightboxImage])

  const handlePreviousPhoto = useCallback(() => {
    if (evidence.length === 0 || lightboxImage === null) return
    const prevIndex = (lightboxImage - 1 + evidence.length) % evidence.length
    setLightboxImage(prevIndex)
  }, [evidence.length, lightboxImage])

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxImage === null) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxImage(null)
      else if (e.key === 'ArrowRight') handleNextPhoto()
      else if (e.key === 'ArrowLeft') handlePreviousPhoto()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxImage, handleNextPhoto, handlePreviousPhoto])

  // Preload adjacent images in lightbox
  useEffect(() => {
    if (lightboxImage === null || evidence.length === 0) return
    const prevIdx = (lightboxImage - 1 + evidence.length) % evidence.length
    const nextIdx = (lightboxImage + 1) % evidence.length

    const preload = (url) => {
      if (!url || typeof window === 'undefined') return
      const img = new Image()
      img.src = getOptimizedImageUrl(url, { width: 1600 })
    }

    preload(evidence[prevIdx]?.photo_url || evidence[prevIdx]?.url)
    preload(evidence[nextIdx]?.photo_url || evidence[nextIdx]?.url)
  }, [lightboxImage, evidence])

  const visibleEvidence = useMemo(() => {
    return evidence.slice(0, displayLimit)
  }, [evidence, displayLimit])

  return (
    <div className="card mt-6 border border-border p-6 bg-surface-elevated">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-text-primary uppercase tracking-tight">Evidence Photos</h2>
        {evidence.length > 0 && (
          <span className="text-text-muted text-xs font-mono">
            {Math.min(displayLimit, evidence.length)} of {evidence.length} photos
          </span>
        )}
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center p-8 bg-surface-elevated border border-border border-dashed animate-pulse">
          <p className="text-text-muted text-sm font-mono uppercase">Loading evidence...</p>
        </div>
      ) : evidence.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {visibleEvidence.map((item, idx) => {
              const rawUrl = item.photo_url || item.url
              const thumbUrl = getOptimizedImageUrl(rawUrl, { width: 400 })
              return (
                <div 
                  key={item.id || item.public_id || idx} 
                  className="relative cursor-pointer border border-border overflow-hidden group bg-surface rounded-sm"
                  onClick={() => setLightboxImage(idx)}
                >
                  <SecureImage 
                    src={thumbUrl} 
                    alt={`Evidence for ${item.reportTitle}`} 
                    loading="lazy"
                    decoding="async"
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                  <span className="absolute bottom-2 left-2 bg-black/80 text-white font-mono text-xs px-2 py-1 truncate max-w-[90%] border border-white/20">
                    {item.reportTitle || `Report ${item.reportId}`}
                  </span>
                </div>
              )
            })}
          </div>

          {evidence.length > displayLimit && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setDisplayLimit(prev => prev + 24)}
                className="btn-secondary text-sm font-mono uppercase tracking-wider py-2 px-6 hover:border-accent-green transition-colors"
              >
                Load More Photos ({evidence.length - displayLimit} remaining)
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 bg-surface-elevated border border-border border-dashed">
          <p className="text-text-muted text-sm font-mono uppercase">No evidence photos found</p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage !== null && evidence[lightboxImage] && (
        <div 
          className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative w-full max-w-5xl h-[90vh] p-4 flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button 
              className="absolute top-4 right-4 text-white hover:text-accent-green z-50 p-2 transition-colors border border-transparent hover:border-accent-green bg-black/50"
              onClick={() => setLightboxImage(null)}
              aria-label="Close lightbox"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button 
              className="absolute left-4 text-white hover:text-accent-green z-50 p-3 transition-colors border border-transparent hover:border-accent-green bg-black/50"
              onClick={handlePreviousPhoto}
              aria-label="Previous photo"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <SecureImage 
              src={getOptimizedImageUrl(evidence[lightboxImage].photo_url || evidence[lightboxImage].url, { width: 1600 })} 
              alt="Evidence Full" 
              decoding="async"
              className="max-w-full max-h-full object-contain border border-white/20"
            />
            <button 
              className="absolute right-4 text-white hover:text-accent-green z-50 p-3 transition-colors border border-transparent hover:border-accent-green bg-black/50"
              onClick={handleNextPhoto}
              aria-label="Next photo"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black/80 px-4 py-2 font-mono text-sm border border-white/20">
              {evidence[lightboxImage].reportTitle || `Report ${evidence[lightboxImage].reportId}`} 
              <span className="opacity-50 ml-2">({lightboxImage + 1} / {evidence.length})</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
