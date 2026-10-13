'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, MapPin, X } from 'lucide-react'
import SecureImage from '@/components/ui/SecureImage'
import { fetchReportEvidence } from '@/lib/api'
import useDialogFocus from './useDialogFocus'
import styles from './PhotoViewer.module.css'

export default function PhotoViewer({ report, evidence, fallback, initialIndex = 0, reports, onReport, onMap, onClose }) {
  const [resource, setResource] = useState(null)
  const [selection, setSelection] = useState({ id: report.id, index: initialIndex })
  useDialogFocus(true, onClose)
  useEffect(() => {
    if (evidence !== undefined || report.location_precision !== 'exact') return
    const controller = new AbortController()
    fetchReportEvidence(report.id, controller.signal).then(photos => {
      if (!controller.signal.aborted) setResource({ id: report.id, photos })
    }).catch(() => { if (!controller.signal.aborted) setResource({ id: report.id, photos: [], error: true }) })
    return () => controller.abort()
  }, [report.id, report.location_precision, evidence])
  const items = evidence ?? (resource?.id === report.id ? resource.photos : [])
  const photos = []
  if (report.before_photo_url) photos.push({ url: report.before_photo_url, label: 'Before photo' })
  if (report.after_photo_url) photos.push({ url: report.after_photo_url, label: 'After photo' })
  for (const item of items || []) if (item.url && (!item.resource_type || item.resource_type === 'image')) photos.push({ url: item.url, label: item.name || 'Report photo' })
  const illustration = photos.length === 0
  if (illustration) photos.push({ url: fallback, label: 'Category illustration' })
  const index = Math.min(selection.id === report.id ? selection.index : initialIndex, photos.length - 1)
  const activePhoto = photos[index]
  const reportIndex = reports.findIndex(item => item.id === report.id)
  const setIndex = next => setSelection({ id: report.id, index: (next + photos.length) % photos.length })
  const loading = report.location_precision === 'exact' && evidence === undefined && resource?.id !== report.id
  const keyDown = event => {
    if (event.target.tagName === 'INPUT') return
    if (event.key === 'ArrowLeft') { event.preventDefault(); setIndex(index - 1) }
    if (event.key === 'ArrowRight') { event.preventDefault(); setIndex(index + 1) }
  }
  return <div className={styles.backdrop} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <section className={styles.viewer} role="dialog" aria-modal="true" aria-label="Report photos" tabIndex={-1} data-explore-dialog onKeyDown={keyDown}>
      <header className={styles.header}><div><span>Public report photos</span><h2 className={styles.title}>{report.title || 'Environmental concern'}</h2></div><button type="button" onClick={onClose} aria-label="Close photos"><X size={22} /></button></header>
      <div className={styles.body}>
        <div className={styles.photos}>
          <div className={styles.imageStage}><SecureImage src={activePhoto.url} alt={illustration ? `Category illustration for ${report.issue_type?.replaceAll('_', ' ') || 'an environmental concern'}` : `${activePhoto.label}: ${report.title || 'Environmental concern'}`} className={styles.image} />
            {photos.length > 1 && <><button type="button" className={`${styles.photoArrow} ${styles.previous}`} aria-label="Previous photo" onClick={() => setIndex(index - 1)}><ChevronLeft size={24} /></button><button type="button" className={`${styles.photoArrow} ${styles.next}`} aria-label="Next photo" onClick={() => setIndex(index + 1)}><ChevronRight size={24} /></button></>}
            <span className={styles.counter} aria-live="polite">{index + 1} / {photos.length}</span>
          </div>
          <div className={styles.caption}><span>{activePhoto.label}</span>{loading && <span role="status">Loading photos…</span>}{resource?.id === report.id && resource.error && <span role="status">Report photos couldn’t load.</span>}</div>
          {photos.length > 1 && <div className={styles.thumbnails} data-native-scroll>{photos.map((photo, photoIndex) => <button key={`${photo.url}-${photoIndex}`} type="button" aria-label={`View photo ${photoIndex + 1}`} aria-pressed={index === photoIndex} onClick={() => setIndex(photoIndex)}><SecureImage src={photo.url} alt="" /></button>)}</div>}
        </div>
        <aside className={styles.info}><span className={styles.category}>{report.issue_type?.replaceAll('_', ' ') || 'Environmental concern'}</span><p>{report.description || 'No description was provided for this public report.'}</p><dl><div><dt>Status</dt><dd>{(report.status || 'Under review').replaceAll('_', ' ')}</dd></div>{report.created_at && <div><dt>Reported</dt><dd>{new Date(report.created_at).toLocaleDateString()}</dd></div>}<div><dt>Photo source</dt><dd>{illustration ? 'Category illustration' : 'Report evidence'}</dd></div></dl>{illustration && <p className={styles.disclosure}>This picture illustrates the concern category. It is not evidence of this report.</p>}<button type="button" className={styles.mapAction} onClick={() => onMap(report)}><MapPin size={18} /> View on map <ArrowRight size={16} /></button></aside>
      </div>
      {reports.length > 1 && reportIndex >= 0 && <footer className={styles.footer}><button type="button" disabled={reportIndex === 0} onClick={() => onReport(reports[reportIndex - 1])}><ArrowLeft size={16} /> Previous report</button><span>{reportIndex + 1} of {reports.length} reports</span><button type="button" disabled={reportIndex === reports.length - 1} onClick={() => onReport(reports[reportIndex + 1])}>Next report <ArrowRight size={16} /></button></footer>}
    </section>
  </div>
}
