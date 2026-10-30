'use client'
import {REPORT_LIFECYCLE_BUCKETS, reconciledReportSummary} from '@/lib/report-lifecycle-summary.mjs'
import styles from './ReportLifecycleSummary.module.css'

export default function ReportLifecycleSummary({reports, compact=false, loading=false, error=false, onRetry}) {
  const snapshot=reconciledReportSummary(reports)
  if (!snapshot) return <div className={compact?styles.compact:styles.content}>
    <p role={loading?'status':'alert'}>{loading?'Loading report lifecycle counts…':'Report lifecycle counts are unavailable. No partial breakdown is shown.'}</p>
    {!loading&&onRetry&&<button type="button" className={styles.retry} onClick={onRetry}>Retry report counts</button>}
  </div>
  const content=<div className={styles.content} role="region" aria-label="Report lifecycle statistics" tabIndex={0}>
    {error&&<p role="alert">Report counts could not refresh. Showing the previous snapshot.</p>}
    {error&&onRetry&&<button type="button" className={styles.retry} onClick={onRetry}>Retry report counts</button>}
    <dl className={styles.counts} aria-label="Report lifecycle counts">{REPORT_LIFECYCLE_BUCKETS.map(([key,label])=><div key={key}>
      <dt>{label}</dt><dd>{snapshot.byLifecycle[key].toLocaleString('en-US')}</dd>
    </div>)}</dl>
    <p className={styles.note}>All {snapshot.total.toLocaleString('en-US')} stored reports accounted for. Each report appears once.</p>
    <details className={styles.method}>
      <summary>Count definitions and original statuses</summary>
      <p>Most specific recorded state wins: resolved/closed/completed/awaiting feedback, then rejected, in progress, assigned, verified, and submitted. Rejected includes a rejected response status or validation decision. A task link or assigned stage counts as Assigned. Approved or acknowledged reports count as Verified until work advances. A before-photo “responded” stage alone does not mean cleanup is resolved.</p>
      <p>All stored reports are included, including reports outside public-map visibility. Rejected reports remain a separate row. Missing or unsupported response statuses remain Uncategorized; no records are relabeled to make the numbers fit.</p>
      <dl className={styles.raw}>{Object.entries(snapshot.byStatus).map(([status,count])=><div key={status}><dt>{status==='(missing)'?'Missing status':status.replaceAll('_',' ')}</dt><dd>{count.toLocaleString('en-US')}</dd></div>)}</dl>
      {snapshot.byLifecycle.uncategorized>0&&<p role="status">Needs review: {Object.entries(snapshot.uncategorizedByStatus).map(([key,value])=>`${key}: ${value}`).join('; ')}.</p>}
      <p>Snapshot: {new Date(snapshot.snapshotAt).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'})} (Manila). Rules: {snapshot.classificationVersion}.</p>
    </details>
  </div>
  return compact?<details className={styles.compact} aria-label="All report lifecycle summary"><summary>Report lifecycle · {snapshot.total.toLocaleString('en-US')} total reports</summary>{content}</details>:content
}
