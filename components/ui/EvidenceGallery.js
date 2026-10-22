'use client'
import SecureImage from '@/components/ui/SecureImage'
import ImageLightbox from '@/components/ui/ImageLightbox'
import React, { useState, useEffect, useMemo } from 'react'
import { Play } from 'lucide-react'
import { fetchBatchReportEvidence } from '@/lib/api/reports'
import { isVideoResource, getVideoPosterUrl } from '@/lib/helpers/mediaHelpers'

// Efficiently transforms Cloudinary media URLs into lightweight, auto-formatted thumbnails or previews
export function getOptimizedImageUrl(url, { width = 400, quality = 'auto', format = 'auto' } = {}) {
  if (!url || typeof url !== 'string') return url
  if (url.includes('res.cloudinary.com')) {
    if (url.includes('/video/upload/')) {
      const posterUrl = getVideoPosterUrl(url) || url
      if (posterUrl.includes('/video/upload/w_') || posterUrl.includes('/video/upload/f_auto')) {
        return posterUrl
      }
      const transform = `f_${format},q_${quality},w_${width},c_limit/`
      return posterUrl.replace('/video/upload/', `/video/upload/${transform}`)
    }
    if (url.includes('/image/upload/')) {
      if (url.includes('/image/upload/w_') || url.includes('/image/upload/f_auto')) {
        return url
      }
      const transform = `f_${format},q_${quality},w_${width},c_limit/`
      return url.replace('/image/upload/', `/image/upload/${transform}`)
    }
  }
  return url
}

export default function EvidenceGallery({ reports = [] }) {
  const [resource, setResource] = useState({ key: '', version: 0, data: [], error: null })
  const [retryVersion, setRetryVersion] = useState(0)
  const [lightboxImage, setLightboxImage] = useState(null)
  const [displayLimit, setDisplayLimit] = useState(24)
  const reportIdsKey = useMemo(() => JSON.stringify([...new Set((reports || []).map(report => report?.id).filter(Boolean))].sort()), [reports])
  const ready = resource.key === reportIdsKey && resource.version === retryVersion
  const loading = reportIdsKey !== '[]' && !ready
  const error = ready ? resource.error : null
  const evidence = useMemo(() => ready ? resource.data.map(item => ({ ...item, reportTitle: reports.find(report => report.id === item.reportId)?.title })) : [], [ready, resource.data, reports])

  useEffect(() => {
    const ids = JSON.parse(reportIdsKey)
    if (!ids.length) return
    const controller = new AbortController()
    fetchBatchReportEvidence(ids, controller.signal, { throwOnError: true }).then(evidenceMap => {
      if (controller.signal.aborted) return
      const data = ids.flatMap(reportId => (evidenceMap[reportId] || []).map(item => ({ ...item, reportId })))
      setResource({ key: reportIdsKey, version: retryVersion, data, error: null })
      setDisplayLimit(24)
    }).catch(error => {
      if (!controller.signal.aborted) setResource({ key: reportIdsKey, version: retryVersion, data: [], error: error.message || 'Evidence could not load.' })
    })
    return () => controller.abort()
  }, [reportIdsKey, retryVersion])
  const visibleEvidence = useMemo(() => {
    return evidence.slice(0, displayLimit)
  }, [evidence, displayLimit])

  return (
    <div className="card mt-6 border border-border p-6 bg-surface-elevated">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-medium text-text-primary">Evidence Photos</h2>
        {evidence.length > 0 && (
          <span className="text-text-secondary text-sm">
            {Math.min(displayLimit, evidence.length)} of {evidence.length} photos
          </span>
        )}
      </div>
      
      {error ? <div role="alert" className="p-4 text-sm"><p>{error}</p><button type="button" className="btn-secondary mt-3" onClick={() => setRetryVersion(version => version + 1)}>Try again</button></div> : loading ? (
        <div className="flex items-center justify-center p-8 bg-surface-elevated border border-border border-dashed animate-pulse">
          <p className="text-text-secondary text-sm">Loading evidence...</p>
        </div>
      ) : evidence.length > 0 ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {visibleEvidence.map((item, idx) => {
              const rawUrl = item.photo_url || item.url
              const isVideo = item.resource_type === 'video' || isVideoResource(rawUrl, item.resource_type)
              const thumbUrl = getOptimizedImageUrl(rawUrl, { width: 400 })
              return (
                <button type="button"
                  key={item.id || item.public_id || idx} 
                  className="relative text-left border border-border overflow-hidden group bg-surface rounded-xl"
                  aria-label={`Open evidence ${isVideo ? 'video' : 'photo'} ${idx + 1} for ${item.reportTitle || 'this report'}`}
                  onClick={() => setLightboxImage(idx)}
                >
                  <SecureImage 
                    src={thumbUrl} 
                    alt={`Evidence for ${item.reportTitle}`} 
                    loading="lazy"
                    decoding="async"
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                  {isVideo && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none group-hover:bg-black/35 transition-colors">
                      <span className="w-10 h-10 rounded-full bg-black/60 border border-white/60 flex items-center justify-center shadow-lg backdrop-blur-xs">
                        <Play size={18} className="text-white fill-white translate-x-0.5" />
                      </span>
                    </span>
                  )}
                  <span className="absolute bottom-2 left-2 bg-black/80 text-white text-xs px-2 py-1 truncate max-w-[90%] border border-white/20">
                    {item.reportTitle || `Report ${item.reportId}`}
                  </span>
                </button>
              )
            })}
          </div>

          {evidence.length > displayLimit && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setDisplayLimit(prev => prev + 24)}
                className="btn-secondary text-sm py-2 px-6 hover:border-primary transition-colors"
              >
                Load More Photos ({evidence.length - displayLimit} remaining)
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 bg-surface-elevated border border-border border-dashed">
          <p className="text-text-secondary text-sm">No evidence photos found</p>
        </div>
      )}

      {/* Reusable Lightbox */}
      <ImageLightbox
        images={evidence}
        currentIndex={lightboxImage}
        isOpen={lightboxImage !== null}
        onClose={() => setLightboxImage(null)}
        onNavigate={(newIdx) => setLightboxImage(newIdx)}
      />
    </div>
  )
}
