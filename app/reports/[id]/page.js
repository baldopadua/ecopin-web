'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  Download, 
  ArrowLeft, 
  AlertCircle,
  Share2,
  CheckCircle2,
  Clock,
  User
} from 'lucide-react'
import LandingNavigation from '@/components/landing/LandingNavigation'
import usePublicTheme from '@/components/landing/usePublicTheme'
import publicStyles from '@/components/landing/LandingPage.module.css'
import StatusBadge from '@/components/ui/StatusBadge'
import PublicLoadingState from '@/components/ui/PublicLoadingState'

export default function PublicReportPage() {
  const { id } = useParams()
  const { isDark, toggleTheme } = usePublicTheme()
  const [report, setReport] = useState(null)
  const [evidence, setEvidence] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const primaryPhoto = report?.before_photo_url || evidence[0]?.url || evidence[0]?.file_url

  return (
    <div className={publicStyles.page} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <LandingNavigation isDark={isDark} toggleTheme={toggleTheme} activePage="Explore" />

      <main style={{ flex: 1, maxWidth: '900px', width: '100%', margin: '0 auto', padding: '32px 20px 80px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <Link 
            href="/explore" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              color: 'var(--landing-blue, #0052cc)', 
              textDecoration: 'none', 
              fontWeight: 600,
              fontSize: '14px' 
            }}
          >
            <ArrowLeft size={16} /> Explore Pasig Reports
          </Link>

          <button
            onClick={handleCopyLink}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid var(--border-subtle, #e2e8f0)',
              background: 'var(--surface-raised, #ffffff)',
              color: 'var(--text-primary, #0f172a)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {copied ? <CheckCircle2 size={15} color="#27754d" /> : <Share2 size={15} />}
            {copied ? 'Link Copied!' : 'Share Link'}
          </button>
        </div>

        {loading && <PublicLoadingState label="Loading verified report…" />}

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.08)', 
            border: '1px solid rgba(239, 68, 68, 0.25)', 
            borderRadius: '16px', 
            padding: '24px', 
            textAlign: 'center',
            margin: '40px 0'
          }}>
            <AlertCircle size={36} color="#ef4444" style={{ margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>Report Unavailable</h2>
            <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '14px', margin: '0 0 20px' }}>{error}</p>
            <Link 
              href="/explore" 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#0052cc',
                color: '#ffffff',
                padding: '10px 20px',
                borderRadius: '12px',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              Browse Public Reports
            </Link>
          </div>
        )}

        {!loading && report && (
          <div style={{ 
            background: 'var(--surface-raised, #ffffff)', 
            border: '1px solid var(--border-subtle, #e2e8f0)', 
            borderRadius: '20px', 
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
          }}>
            {/* Header / Verified Badge Strip */}
            <div style={{ 
              background: 'linear-gradient(90deg, #0052cc 0%, #27754d 100%)', 
              color: '#ffffff', 
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={22} color="#83cba0" />
                <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Official EcoPin Report • Pasig City
                </span>
              </div>
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.2)', 
                backdropFilter: 'blur(8px)',
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontSize: '12px', 
                fontWeight: 600 
              }}>
                {report.location_verification_status === 'verified_on_site' ? '🟢 Verified On-Site' : '📍 Civic Report'}
              </div>
            </div>

            {/* Photo Section */}
            {primaryPhoto && (
              <div style={{ position: 'relative', width: '100%', maxHeight: '480px', overflow: 'hidden', background: '#0a0f14' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={primaryPhoto} 
                  alt={report.title} 
                  style={{ width: '100%', height: 'auto', maxHeight: '480px', objectFit: 'contain', display: 'block', margin: '0 auto' }} 
                />
              </div>
            )}

            {/* Content Body */}
            <div style={{ padding: '28px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <span style={{ 
                  display: 'inline-block',
                  padding: '3px 10px', 
                  borderRadius: '6px', 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  textTransform: 'uppercase', 
                  background: 'rgba(0, 82, 204, 0.1)', 
                  color: '#0052cc' 
                }}>
                  {report.issue_type || 'Environmental Concern'}
                </span>
                <StatusBadge status={report.status || 'pending'} />
                {report.location_verification_status && (
                  <StatusBadge 
                    status={report.location_verification_status} 
                    type="location_verification" 
                  />
                )}
              </div>

              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 12px', color: 'var(--text-primary, #0f172a)' }}>
                {report.title}
              </h1>

              {report.description && (
                <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary, #475569)', margin: '0 0 20px' }}>
                  {report.description}
                </p>
              )}

              {/* Meta details grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '16px',
                padding: '16px',
                background: 'var(--surface-sunken, #f8fafc)',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                margin: '20px 0 28px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Calendar size={18} color="#64748b" />
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Reported At</div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                      {new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <MapPin size={18} color="#64748b" />
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Location</div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                      {report.latitude && report.longitude 
                        ? `${Number(report.latitude).toFixed(4)} N, ${Number(report.longitude).toFixed(4)} E` 
                        : 'Pasig City, Metro Manila'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <User size={18} color="#64748b" />
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Publisher</div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                      {report.publisher_name || 'Anonymous'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Citizen Call-to-Action Card */}
              <div style={{ 
                background: 'linear-gradient(135deg, rgba(0, 82, 204, 0.06) 0%, rgba(39, 117, 77, 0.08) 100%)',
                border: '1px solid rgba(0, 82, 204, 0.2)',
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '20px'
              }}>
                <div style={{ maxWidth: '480px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px', color: '#0052cc' }}>
                    See an environmental hazard near you?
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary, #475569)', margin: 0, lineHeight: 1.5 }}>
                    Join Pasig City residents keeping our community clean. Snap verified photos, track resolution in real time, and earn civic rewards.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <Link
                    href="/downloads"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#0052cc',
                      color: '#ffffff',
                      padding: '10px 18px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      boxShadow: '0 2px 8px rgba(0, 82, 204, 0.25)'
                    }}
                  >
                    <Download size={16} /> Get EcoPin App
                  </Link>
                  <Link
                    href="/explore"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'var(--surface-raised, #ffffff)',
                      border: '1px solid var(--border-subtle, #cbd5e1)',
                      color: 'var(--text-primary, #0f172a)',
                      padding: '10px 16px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      textDecoration: 'none'
                    }}
                  >
                    <ExternalLink size={15} /> Pasig Map
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
