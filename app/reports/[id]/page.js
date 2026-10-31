'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ShieldCheck,
  MapPin,
  Calendar,
  Download,
  ArrowLeft,
  AlertCircle,
  Share2,
  CheckCircle2,
  User
} from 'lucide-react'
import LandingNavigation from '@/components/landing/LandingNavigation'
import PublicFooter from '@/components/landing/PublicFooter'
import usePublicTheme from '@/components/landing/usePublicTheme'
import publicStyles from '@/components/landing/LandingPage.module.css'
import StatusBadge from '@/components/ui/StatusBadge'
import ResponseDeadline from '@/components/ui/ResponseDeadline'
import PublicLoadingState from '@/components/ui/PublicLoadingState'
import SecureImage from '@/components/ui/SecureImage'
import styles from './ReportPermalink.module.css'

export default function PublicReportPage() {
  const { id } = useParams()
  const { isDark, toggleTheme } = usePublicTheme()
  const [report, setReport] = useState(null)
  const [evidence, setEvidence] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)

  const apiBase = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3002'

  useEffect(() => {
    if (!id) return

    async function fetchReport() {
      try {
        setLoading(true)
        const res = await fetch(`${apiBase}/api/reports/${id}`)
        if (!res.ok) {
          throw new Error(res.status === 404 ? 'Report not found' : 'Failed to load report')
        }
        const data = await res.json()
        // Rejected reports are never shown on the public permalink.
        if (data?.validation_status === 'rejected') throw new Error('This report is not publicly available.')
        setReport(data)

        // Fetch evidence photos if available
        try {
          const evRes = await fetch(`${apiBase}/api/reports/${id}/evidence`)
          if (evRes.ok) {
            const evData = await evRes.json()
            setEvidence(Array.isArray(evData) ? evData : evData.data || [])
          }
        } catch (_) {}
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [id, apiBase])

  // Public pages show the barangay when known, otherwise the city; raw GPS coordinates are never rendered.
  const locationLabel = report?.barangay ? `Barangay ${report.barangay}, Pasig City` : 'Pasig City'

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const allPhotos = [
    ...(report?.before_photo_url ? [{ url: report.before_photo_url, label: 'Before photo' }] : []),
    ...(report?.after_photo_url ? [{ url: report.after_photo_url, label: 'After resolution photo' }] : []),
    ...evidence.map((ev, i) => ({ url: ev.url || ev.file_url, label: ev.name || ('Evidence photo ' + (i + 1)) })).filter(p => p.url && p.url !== report?.before_photo_url && p.url !== report?.after_photo_url)
  ]
  const primaryPhoto = report?.before_photo_url || evidence[0]?.url || evidence[0]?.file_url
  const currentPhoto = allPhotos[selectedPhotoIndex]?.url || primaryPhoto

  return (
    <div className={`${publicStyles.page} ${styles.page}`}>
      <LandingNavigation isDark={isDark} toggleTheme={toggleTheme} activePage="Explore" />

      <main className={styles.main}>
        <div className={styles.topBar}>
          <Link href="/explore" className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden="true" /> Back to Explore
          </Link>
          <button type="button" onClick={handleCopyLink} className={styles.shareButton}>
            {copied ? <CheckCircle2 size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
            {copied ? 'Link copied' : 'Share link'}
          </button>
        </div>

        {loading && <PublicLoadingState label="Loading verified report…" />}

        {error && (
          <div className={styles.unavailable} role="alert">
            <AlertCircle size={36} aria-hidden="true" />
            <h2>Report unavailable</h2>
            <p>{error}</p>
          </div>
        )}

        {!loading && report && (
          <article className={styles.card}>
            <div className={styles.banner}>
              <ShieldCheck size={20} aria-hidden="true" />
              <span>Official EcoPin report • Pasig City</span>
            </div>

            {currentPhoto && (
              <div className={styles.photoArea}>
                <SecureImage
                  key={currentPhoto}
                  src={currentPhoto}
                  alt={report.title}
                  loadingLabel="Loading report photo..."
                  className="w-full h-auto max-h-[480px] object-contain block mx-auto"
                  wrapperClassName="w-full min-h-[260px] flex items-center justify-center"
                />
                {allPhotos.length > 1 && (
                  <div className={styles.thumbs}>
                    {allPhotos.map((p, idx) => (
                      <button
                        key={p.url + '-' + idx}
                        type="button"
                        onClick={() => setSelectedPhotoIndex(idx)}
                        className={`${styles.thumb} ${selectedPhotoIndex === idx ? styles.thumbActive : ''}`}
                        aria-label={'View ' + p.label}
                        aria-pressed={selectedPhotoIndex === idx}
                      >
                        <SecureImage src={p.url} alt="" loadingLabel="Loading thumbnail..." className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className={styles.body}>
              <ResponseDeadline report={report} details />
              <div className={styles.tags}>
                <span className={styles.issueTag}>{report.issue_type || 'Environmental Concern'}</span>
                <StatusBadge status={report.status || 'pending'} />
                {report.location_verification_status && (
                  <StatusBadge status={report.location_verification_status} type="location_verification" />
                )}
              </div>

              <h1 className={styles.title}>{report.title}</h1>
              {report.description && <p className={styles.description}>{report.description}</p>}

              <div className={styles.meta}>
                <div className={styles.metaItem}>
                  <Calendar size={18} aria-hidden="true" />
                  <div>
                    <div className={styles.metaLabel}>Reported at</div>
                    <div className={styles.metaValue}>
                      {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <div className={styles.metaItem}>
                  <MapPin size={18} aria-hidden="true" />
                  <div>
                    <div className={styles.metaLabel}>Location</div>
                    <div className={styles.metaValue}>{locationLabel}</div>
                  </div>
                </div>
                <div className={styles.metaItem}>
                  <User size={18} aria-hidden="true" />
                  <div>
                    <div className={styles.metaLabel}>Publisher</div>
                    <div className={styles.metaValue}>{report.publisher_name || 'Anonymous'}</div>
                  </div>
                </div>
              </div>

              <section className={styles.cta} aria-labelledby="permalink-cta">
                <div>
                  <h2 id="permalink-cta">See an environmental hazard near you?</h2>
                  <p>Report it from the EcoPin Android app with a photo and location, then follow what happens next.</p>
                </div>
                <div className={styles.ctaActions}>
                  <Link href="/downloads" className={styles.primaryAction}>
                    <Download size={16} aria-hidden="true" /> Get EcoPin app
                  </Link>
                  <Link href={`/help?ref=${encodeURIComponent(report.id)}`} className={styles.secondaryAction}>
                    Ask about this report
                  </Link>
                </div>
              </section>
            </div>
          </article>
        )}
      </main>
      <PublicFooter isDark={isDark} />
    </div>
  )
}
