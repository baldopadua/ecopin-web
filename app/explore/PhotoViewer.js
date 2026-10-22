'use client'

import { useEffect, useState, useRef } from 'react'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, MapPin, X, ImageOff } from 'lucide-react'
import SecureImage from '@/components/ui/SecureImage'
import {
  fetchBatchReportEvidence,
  getCachedEvidence,
  hasCachedEvidence,
  fetchBatchReportPublishers,
  getCachedPublisher
} from '@/lib/api/reports'
import { formatReportAddress } from '@/lib/format-location.mjs'
import useDialogFocus from './useDialogFocus'
import styles from './PhotoViewer.module.css'

// Global browser image cache tracker to avoid re-triggering decode/downloads
const preloadedImageUrls = new Set()
function preloadImage(url) {
  if (!url || typeof window === 'undefined') return
  if (preloadedImageUrls.has(url)) return
  preloadedImageUrls.add(url)
  const img = new Image()
  img.decoding = 'async'
  img.src = url
}

export default function PhotoViewer({
  report,
  initialIndex = 0,
  reports = [],
  evidenceCache = {},
  onClose,
  onMap
}) {
  const reportList = reports.length ? reports : [report]

  // Track active report by ID to preserve continuous browsing
  const [activeReportId, setActiveReportId] = useState(() => report?.id)
  const [photoIndex, setPhotoIndex] = useState(initialIndex || 0)
  const [, setEvidenceTick] = useState(0)
  const lastReportPropIdRef = useRef(report?.id)

  useDialogFocus(true, onClose)

  // Synchronize ONLY when parent explicitly changes the initial report prop
  useEffect(() => {
    if (report?.id && String(report.id) !== String(lastReportPropIdRef.current)) {
      lastReportPropIdRef.current = report.id
      setActiveReportId(report.id)
      setPhotoIndex(initialIndex || 0)
    }
  }, [report?.id, initialIndex])

  // Derive current report position and report object
  const reportIndex = Math.max(0, reportList.findIndex(r => String(r.id) === String(activeReportId)))
  const currentReport = reportList[reportIndex] || report

  // Preload immediate neighbors' direct photos
  useEffect(() => {
    const immediateNeighbors = [
      reportList[reportIndex + 1],
      reportList[reportIndex + 2],
      reportList[reportIndex - 1]
    ].filter(Boolean)

    for (const neighbor of immediateNeighbors) {
      if (neighbor.before_photo_url) preloadImage(neighbor.before_photo_url)
      if (neighbor.after_photo_url) preloadImage(neighbor.after_photo_url)
      if (neighbor.image) preloadImage(neighbor.image)
      const neighborEvidence = (evidenceCache && evidenceCache[neighbor.id]) || getCachedEvidence(neighbor.id)
      if (neighborEvidence?.length) {
        for (const ev of neighborEvidence) {
          if (ev.url) preloadImage(ev.url)
        }
      }
    }

    // Debounce evidence batch fetch (200ms) for Cloudinary media
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const windowReports = [
          reportList[reportIndex],
          reportList[reportIndex + 1],
          reportList[reportIndex + 2],
          reportList[reportIndex + 3],
          reportList[reportIndex - 1],
          reportList[reportIndex - 2],
        ].filter(Boolean)

        const missingIds = windowReports
          .filter(r => !hasCachedEvidence(r.id))
          .map(r => r.id)

        if (!missingIds.length) return

        const batchResults = await fetchBatchReportEvidence(missingIds, controller.signal)
        if (controller.signal.aborted) return

        for (const items of Object.values(batchResults || {})) {
          for (const item of items || []) {
            if (item.url && (!item.resource_type || item.resource_type === 'image')) {
              preloadImage(item.url)
            }
          }
        }

        // Also fetch publishers for visible window if not cached
        const missingPubIds = windowReports
          .filter(r => r.id && !getCachedPublisher(r.id))
          .map(r => r.id)
        if (missingPubIds.length) {
          fetchBatchReportPublishers(missingPubIds, controller.signal).then(() => {
            setEvidenceTick(t => t + 1)
          }).catch(() => {})
        }

        setEvidenceTick(t => t + 1)
      } catch {
        // Silently ignore aborts during fast navigation
      }
    }, 200)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [activeReportId, reportIndex, reportList, evidenceCache])

  // Derive photos for THIS specific currentReport
  const cachedEvidence = (evidenceCache && evidenceCache[currentReport?.id]) ||
    (currentReport?.id ? getCachedEvidence(currentReport.id) : null) || []

  const photos = []
  if (currentReport?.before_photo_url) {
    photos.push({ url: currentReport.before_photo_url, label: 'Before photo' })
  }
  if (currentReport?.after_photo_url) {
    photos.push({ url: currentReport.after_photo_url, label: 'After photo' })
  }
  if (currentReport?.image && !photos.some(p => p.url === currentReport.image)) {
    photos.push({ url: currentReport.image, label: 'Report photo' })
  }
  for (const item of cachedEvidence) {
    if (item.url && (!item.resource_type || item.resource_type === 'image')) {
      if (!photos.some(p => p.url === item.url)) {
        photos.push({ url: item.url, label: item.name || 'Report photo' })
      }
    }
  }

  const hasNoPhotos = photos.length === 0

  // Preload photos for active report
  for (const p of photos) {
    if (p.url) preloadImage(p.url)
  }

  const safePhotoIndex = hasNoPhotos ? 0 : Math.min(Math.max(0, photoIndex), photos.length - 1)
  const activePhoto = hasNoPhotos ? null : (photos[safePhotoIndex] || photos[0])

  const handlePreviousReport = () => {
    if (reportIndex > 0) {
      const prevReport = reportList[reportIndex - 1]
      if (prevReport) {
        setActiveReportId(prevReport.id)
        setPhotoIndex(0)
      }
    }
  }

  const handleNextReport = () => {
    if (reportIndex < reportList.length - 1) {
      const nextReport = reportList[reportIndex + 1]
      if (nextReport) {
        setActiveReportId(nextReport.id)
        setPhotoIndex(0)
      }
    }
  }

  const handlePreviousPhoto = () => {
    if (hasNoPhotos) {
      handlePreviousReport()
    } else if (photos.length > 1 && safePhotoIndex > 0) {
      setPhotoIndex(safePhotoIndex - 1)
    } else {
      handlePreviousReport()
    }
  }

  const handleNextPhoto = () => {
    if (hasNoPhotos) {
      handleNextReport()
    } else if (photos.length > 1 && safePhotoIndex < photos.length - 1) {
      setPhotoIndex(safePhotoIndex + 1)
    } else {
      handleNextReport()
    }
  }

  const loading = !hasCachedEvidence(currentReport.id) && cachedEvidence.length === 0 && photos.length === 0

  const keyDown = event => {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      handlePreviousPhoto()
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      handleNextPhoto()
    } else if (event.key === 'PageUp' || event.key === '[' || event.key === 'p') {
      event.preventDefault()
      handlePreviousReport()
    } else if (event.key === 'PageDown' || event.key === ']' || event.key === 'n') {
      event.preventDefault()
      handleNextReport()
    }
  }

  const canGoPrevious = reportIndex > 0 || safePhotoIndex > 0
  const canGoNext = reportIndex < reportList.length - 1 || safePhotoIndex < photos.length - 1

  return (
    <div className={styles.backdrop} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className={styles.viewer} role="dialog" aria-modal="true" aria-label="Report photos" tabIndex={-1} data-explore-dialog onKeyDown={keyDown}>
        <header className={styles.header}>
          <div>
            <span>Public report photos</span>
            <h2 className={styles.title}>{currentReport?.title || 'Environmental concern'}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close photos"><X size={22} /></button>
        </header>
        <div className={styles.body}>
          <div className={styles.photos}>
            <div className={styles.imageStage}>
              {hasNoPhotos ? (
                <div className={styles.noPhotoPlaceholder}>
                  <ImageOff size={48} />
                  <span>No photos available for this report</span>
                </div>
              ) : (
                <SecureImage
                  key={activePhoto?.url}
                  src={activePhoto?.url}
                  alt={`${activePhoto?.label}: ${currentReport?.title || 'Environmental concern'}`}
                  className={styles.image}
                />
              )}
              {reportList.length > 1 && (
                <>
                  <button
                    type="button"
                    className={`${styles.photoArrow} ${styles.previous}`}
                    aria-label="Previous report"
                    disabled={!canGoPrevious}
                    onClick={handlePreviousPhoto}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.photoArrow} ${styles.next}`}
                    aria-label="Next report"
                    disabled={!canGoNext}
                    onClick={handleNextPhoto}
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
              <span className={styles.counter} aria-live="polite">
                {hasNoPhotos ? `${reportIndex + 1} / ${reportList.length}` : (photos.length > 1 ? `${safePhotoIndex + 1} / ${photos.length}` : `${reportIndex + 1} / ${reportList.length}`)}
              </span>
            </div>
            <div className={styles.caption}>
              <span>{hasNoPhotos ? 'No photos available' : activePhoto.label}</span>
              {loading && <span role="status">Loading photos…</span>}
            </div>
            {!hasNoPhotos && photos.length > 1 && (
              <div className={styles.thumbnails} data-native-scroll>
                {photos.map((photo, pIdx) => (
                  <button
                    key={`${photo.url}-${pIdx}`}
                    type="button"
                    aria-label={`View photo ${pIdx + 1}`}
                    aria-pressed={safePhotoIndex === pIdx}
                    onClick={() => setPhotoIndex(pIdx)}
                  >
                    <SecureImage src={photo.url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <aside className={styles.info}>
            <span className={styles.category}>{currentReport?.issue_type?.replaceAll('_', ' ') || 'Environmental concern'}</span>
            <p>{currentReport?.description || 'No description was provided for this public report.'}</p>
            <dl>
              <div>
                <dt>Publisher</dt>
                <dd>{currentReport?.publisher_name || getCachedPublisher(currentReport?.id)?.publisher_name || 'Anonymous'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{(currentReport?.status || 'Under review').replaceAll('_', ' ')}</dd>
              </div>
              {currentReport?.created_at && (
                <div>
                  <dt>Reported</dt>
                  <dd>{new Date(currentReport.created_at).toLocaleDateString()}</dd>
                </div>
              )}
              <div>
                <dt>Photo source</dt>
                <dd>{hasNoPhotos ? 'No photos' : 'Report evidence'}</dd>
              </div>
              {currentReport && (
                <div>
                  <dt>Location</dt>
                  <dd>{formatReportAddress(currentReport)}</dd>
                </div>
              )}
            </dl>

            {onMap && (
              <button type="button" className={styles.mapAction} onClick={() => onMap(currentReport)}>
                <MapPin size={18} /> View on map <ArrowRight size={16} />
              </button>
            )}
          </aside>
        </div>
        {reportList.length > 1 && (
          <footer className={styles.footer}>
            <button type="button" disabled={reportIndex === 0} onClick={handlePreviousReport} aria-label="Previous report">
              <ArrowLeft size={16} /> Previous report
            </button>
            <span>{reportIndex + 1} of {reportList.length} reports</span>
            <button type="button" disabled={reportIndex === reportList.length - 1} onClick={handleNextReport} aria-label="Next report">
              Next report <ArrowRight size={16} />
            </button>
          </footer>
        )}
      </section>
    </div>
  )
}
