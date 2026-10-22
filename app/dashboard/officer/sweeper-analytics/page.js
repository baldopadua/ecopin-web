'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import PageHeader from '@/components/layout/PageHeader'
import Notification from '@/components/ui/Notification'
import { OfficerGuard } from '@/components/auth/RequireRole'
import { fetchSweeperMetrics, exportSweeperMetrics } from '@/lib/api/sweeper'
import { SkeletonStatCard } from '@/components/ui/Skeleton'
import Button from '@/components/ui/Button'
import DateRangePicker from '@/components/ui/DateRangePicker'
import { buildSweeperSummary, initialMetricsRange, toMetricsDateRange } from '@/lib/sweeper-analytics.mjs'
import styles from './SweeperAnalytics.module.css'

const EcoPinMap = dynamic(() => import('@/components/map/EcoPinMap'), {
  ssr: false,
  loading: () => <p role="status" className={styles.mapLoading}>Loading the current report map…</p>,
})

function MetricGroup({ title, description, cards }) {
  return <section className={styles.section}>
    <h2>{title}</h2>
    <p className={styles.description}>{description}</p>
    <dl className={styles.metrics}>
      {cards.map(card => <div className={styles.card} key={card.label}>
        <dt>{card.label}</dt>
        <dd className={styles.value}>{card.value}</dd>
        <dd className={styles.caption}>{card.description}</dd>
      </div>)}
    </dl>
  </section>
}

export default function SweeperAnalyticsPage() {
  const [range, setRange] = useState(initialMetricsRange)
  const [draft, setDraft] = useState(initialMetricsRange)
  const [loaded, setLoaded] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [validation, setValidation] = useState('')
  const [reload, setReload] = useState(0)
  const [notification, setNotification] = useState(null)
  const [isExporting, setIsExporting] = useState(false)
  const [mapOpened, setMapOpened] = useState(false)
  const changed = draft.start !== range.start || draft.end !== range.end

  useEffect(() => {
    let current = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const metrics = await fetchSweeperMetrics(toMetricsDateRange(range))
        if (current) setLoaded({ metrics, range })
      } catch (failure) {
        if (current) {
          setError(failure.status === 403 ? 'forbidden' : 'failed')
          if (failure.status === 403) setLoaded(null)
        }
      } finally {
        if (current) setLoading(false)
      }
    }
    load()
    return () => { current = false }
  }, [range, reload])

  function apply(event) {
    event.preventDefault()
    try {
      toMetricsDateRange(draft)
      setValidation('')
      setRange({ ...draft })
    } catch (failure) { setValidation(failure.message) }
  }

  async function download() {
    if (isExporting || !loaded || changed || loading || error) return
    setIsExporting(true)
    try {
      await exportSweeperMetrics(toMetricsDateRange(loaded.range))
      setNotification({ type: 'success', message: 'CSV download started. Check your browser downloads.' })
    } catch (failure) {
      setNotification({ type: 'error', message: failure.status === 403
        ? 'This account does not have permission to export sweeper analytics.'
        : 'The CSV could not download. Please try again.' })
    } finally { setIsExporting(false) }
  }

  const summary = loaded ? buildSweeperSummary(loaded.metrics) : null
  const period = loaded ? toMetricsDateRange(loaded.range) : null
  const displayDate = date => date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

  return <OfficerGuard>
    {notification && <Notification {...notification} onClose={() => setNotification(null)} />}
    <div className={`workspace-page--flow ${styles.page}`}>
      <PageHeader title="Sweeper analytics" subtitle="Review report deadlines and sweeper task outcomes across all areas."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Sweeper analytics' }]}>
        <Button variant="secondary" onClick={download} disabled={!loaded || loading || !!error || changed || isExporting}>
          {isExporting ? 'Preparing CSV…' : 'Download CSV'}
        </Button>
      </PageHeader>

      <form className={styles.filters} onSubmit={apply} noValidate aria-label="Analytics period">
        <div className={styles.filterDates}>
          <h2>Selected period</h2>
          <DateRangePicker startDate={draft.start} endDate={draft.end} onChange={setDraft} />
        </div>
        <Button type="submit" disabled={isExporting}>Apply dates</Button>
        <Button type="button" variant="secondary" onClick={() => setReload(value => value + 1)} disabled={loading || isExporting}>Refresh</Button>
        <p className={styles.filterNote}>All areas · Dates use your local time. Apply changes before downloading.</p>
        {validation && <p className={styles.error} role="alert">{validation}</p>}
      </form>

      {loading && <p role="status">{loaded ? 'Updating analytics. The previous summary remains below.' : 'Loading analytics…'}</p>}
      {error && <div className={styles.notice} role="alert">
        <h2>{error === 'forbidden' ? 'Sweeper analytics are restricted' : 'Analytics could not load'}</h2>
        <p>{error === 'forbidden'
          ? 'The current service requires administrator access for these metrics and exports. This officer account cannot load them.'
          : loaded ? 'The last loaded summary remains below. Try again to get current figures.' : 'Try again to load the summary. No figures are shown until the service responds.'}</p>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => setReload(value => value + 1)} disabled={loading}>Try again</Button>
          <Link href="/dashboard/officer/metrics">View report analytics</Link>
        </div>
      </div>}

      {loading && !loaded && <div className={styles.metrics} aria-hidden="true">{[0, 1, 2, 3].map(index => <SkeletonStatCard key={index} />)}</div>}
      {summary && <div aria-busy={loading}>
        <MetricGroup title="Current report snapshot" description="Not limited by the selected dates. Counts reflect the latest successful refresh." cards={summary.current} />
        <MetricGroup title="Report deadlines and completed responses" description={`${displayDate(period.start)} – ${displayDate(period.end)} · All areas. Reports use their SLA start date; tasks use their creation date.`} cards={summary.period} />
        <MetricGroup title="Sweeper task planning and outcomes" description="Tasks created during the same selected period. A completion count describes their current state." cards={summary.tasks} />
      </div>}

      <section className={`${styles.section} ${styles.notice}`}>
        <h2>Historical trends are unavailable</h2>
        <p>The service supplies period totals and current snapshots, without daily observations. A daily outlier or compliance chart cannot be shown from this data. Use the summary above or download the supported task records.</p>
      </section>

      <details className={styles.mapSection} onToggle={event => { if (event.currentTarget.open) setMapOpened(true) }}>
        <summary>Current report map</summary>
        <p className={styles.description}>Live report density and clusters, including reports beyond SLA. The selected dates do not filter this map; it loads independently of the analytics summary.</p>
        {mapOpened && <div className={styles.map}><EcoPinMap hideFilterPanel hideClusters={false} hidePins selectedTemplate="sweeper" externalShowHeatmap /></div>}
      </details>
    </div>
  </OfficerGuard>
}
