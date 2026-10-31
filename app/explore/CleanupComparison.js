'use client'

import { useEffect, useState } from 'react'
import { ChevronsLeftRight } from 'lucide-react'
import { backendFetch } from '@/lib/backend-fetch.mjs'
import SecureImage from '@/components/ui/SecureImage'

const CLOSED = new Set(['resolved', 'closed'])
const formatDate = value => value ? new Date(value).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : null

// Officer-approved, privacy-redacted before/after photos. Raw crew uploads are never shown here;
// only the publication endpoint serves these pixels.
export default function CleanupComparison({ report }) {
  const reportId = report?.id
  const closed = CLOSED.has(report?.status)
  const [result, setResult] = useState(null)
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const [position, setPosition] = useState(50)

  useEffect(() => {
    if (!reportId || !closed) return undefined
    const controller = new AbortController()
    setPosition(50)
    backendFetch(`/api/backend/api/reports/${encodeURIComponent(reportId)}/cleanup-proof/public`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(); return response.json() })
      .then(data => { if (!controller.signal.aborted) { setResult({ reportId, proof: data.proof }); setFailed(false) } })
      .catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  }, [reportId, closed, retry])

  if (!closed) return null
  const proof = result?.reportId === reportId ? result.proof : null
  const heading = <h4 className="text-sm font-medium text-[var(--landing-text)] mb-2">Cleanup result</h4>

  if (failed) return <div role="alert">
    {heading}
    <p className="text-sm text-[var(--landing-muted)]">The cleanup photos couldn’t load. <button type="button" onClick={() => setRetry(value => value + 1)} className="text-[var(--landing-blue)] hover:underline underline-offset-4 cursor-pointer">Try again</button></p>
  </div>
  if (!result || result.reportId !== reportId) return <div>{heading}<p role="status" className="text-sm text-[var(--landing-muted)]">Loading cleanup photos…</p></div>
  if (!proof) return <div>{heading}<p className="text-sm text-[var(--landing-muted)]">Before and after photos appear here once an officer has reviewed them.</p></div>

  const completed = formatDate(proof.completed_at)
  return <section aria-label="Cleanup result, before and after">
    {heading}
    <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--landing-soft)] border border-[var(--landing-border)] select-none">
      <SecureImage src={`/api/backend${proof.before_url}`} alt="Site before the cleanup, privacy reviewed" loadingLabel="Loading photo..." className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${position}%)` }}>
        <SecureImage src={`/api/backend${proof.after_url}`} alt="Site after the cleanup, privacy reviewed" loadingLabel="Loading photo..." className="absolute inset-0 w-full h-full object-cover" />
      </div>
      <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">Before</span>
      <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">After</span>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" style={{ left: `${position}%` }} />
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#17212e] shadow-[0_2px_12px_rgba(0,0,0,0.35)] ring-2 ring-transparent group-focus-within:ring-[#0052cc]" style={{ left: `${position}%` }}>
        <ChevronsLeftRight className="h-5 w-5" />
      </span>
      <input
        type="range" min="0" max="100" step="1" value={position}
        onChange={event => setPosition(Number(event.target.value))}
        aria-label="Compare the site before and after the cleanup"
        aria-valuetext={`${Math.round(100 - position)}% of the after photo shown`}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
    {proof.public_notes && <p className="mt-3 text-base leading-relaxed text-[var(--landing-text)] whitespace-pre-wrap">{proof.public_notes}</p>}
    <p className="mt-2 text-sm text-[var(--landing-muted)]">{completed ? `Cleaned up ${completed}. ` : ''}Photos are reviewed by an officer and sensitive details are covered before they are shown here.</p>
  </section>
}
