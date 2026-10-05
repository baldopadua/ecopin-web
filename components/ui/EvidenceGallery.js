'use client'
import React, { useState, useEffect } from 'react'
import { fetchReportEvidence } from '@/lib/api/reports'

export default function EvidenceGallery({ reports = [] }) {
  const [evidence, setEvidence] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightboxImage, setLightboxImage] = useState(null)

  useEffect(() => {
    let isMounted = true
    const abortController = new AbortController()

    const loadEvidence = async () => {
      setLoading(true)
      try {
        const promises = reports.map(r => 
          fetchReportEvidence(r.id, abortController.signal).then(ev => 
            (ev || []).map(item => ({ ...item, reportTitle: r.title, reportId: r.id }))
          ).catch(() => [])
        )
        const results = await Promise.all(promises)
        if (isMounted) {
          setEvidence(results.flat())
        }
      } catch (error) {
        console.error('Failed to load evidence', error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (reports.length > 0) {
      loadEvidence()
    } else {
      setLoading(false)
      setEvidence([])
    }

    return () => {
      isMounted = false
      abortController.abort()
    }
  }, [reports])

  const handleNextPhoto = () => {
    if (evidence.length === 0 || lightboxImage === null) return
    const nextIndex = (lightboxImage + 1) % evidence.length
    setLightboxImage(nextIndex)
  }

  const handlePreviousPhoto = () => {
    if (evidence.length === 0 || lightboxImage === null) return
    const prevIndex = (lightboxImage - 1 + evidence.length) % evidence.length
    setLightboxImage(prevIndex)
  }

  return (
    <div className="card mt-6 border border-border p-6 bg-surface-elevated">
      <h2 className="text-xl font-bold text-text-primary mb-4 uppercase tracking-tight">Evidence Photos</h2>
      
      {loading ? (
        <div className="flex items-center justify-center p-8 bg-surface-elevated border border-border border-dashed border-border animate-pulse">
          <p className="text-text-muted text-sm font-mono uppercase">Loading evidence...</p>
        </div>
      ) : evidence.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {evidence.map((item, idx) => (
            <div 
              key={item.id || idx} 
              className="relative cursor-pointer border border-border overflow-hidden group"
              onClick={() => setLightboxImage(idx)}
            >
              <img 
                src={item.photo_url || item.url} 
                alt={`Evidence for ${item.reportTitle}`} 
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" 
              />
              <span className="absolute bottom-2 left-2 bg-black/80 text-white font-mono text-xs px-2 py-1 truncate max-w-[90%] border border-white/20">
                {item.reportTitle || `Report ${item.reportId}`}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 bg-surface-elevated border border-border border-dashed border-border">
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
              className="absolute top-4 right-4 text-white hover:text-accent-green z-50 p-2 transition-colors border border-border border-transparent hover:border-accent-green bg-black/50"
              onClick={() => setLightboxImage(null)}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button 
              className="absolute left-4 text-white hover:text-accent-green z-50 p-3 transition-colors border border-border border-transparent hover:border-accent-green bg-black/50"
              onClick={handlePreviousPhoto}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <img 
              src={evidence[lightboxImage].photo_url || evidence[lightboxImage].url} 
              alt="Evidence Full" 
              className="max-w-full max-h-full object-contain border border-border border-white/20"
            />
            <button 
              className="absolute right-4 text-white hover:text-accent-green z-50 p-3 transition-colors border border-border border-transparent hover:border-accent-green bg-black/50"
              onClick={handleNextPhoto}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black/80 px-4 py-2 font-mono text-sm border border-border border-white/20">
              {evidence[lightboxImage].reportTitle || `Report ${evidence[lightboxImage].reportId}`} 
              <span className="opacity-50 ml-2">({lightboxImage + 1} / {evidence.length})</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
