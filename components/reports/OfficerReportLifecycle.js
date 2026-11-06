import ReportPriorityBadge from '@/components/reports/ReportPriorityBadge'
import { Check } from 'lucide-react'
import { getReportStatusHex } from '@/lib/helpers/statusHelpers'
import styles from './OfficerReportLifecycle.module.css'
import { REPORT_LIFECYCLE_STAGES as stages, getReportLifecycleStage } from '@/lib/report-lifecycle.mjs'

const words = value => String(value || 'not recorded').replaceAll('_', ' ')
const VALIDATION_TONE = { approved: 'var(--success)', rejected: 'var(--error)' }
const CONSENT_TONE = { obtained: 'var(--success)', denied: 'var(--error)' }
function Status({ title, value, tone }) {
  return <span className={styles.status}><span>{title}</span><strong><i aria-hidden="true" style={{ backgroundColor: tone }} />{words(value)}</strong></span>
}

export default function OfficerReportLifecycle({ report, slaInfo }) {
  const currentStage = getReportLifecycleStage(report)
  const currentIndex = stages.findIndex(([stage]) => stage === currentStage)
  const stopped = report.validation_status === 'rejected' ||
    (report.on_private_property && report.property_owner_consent_status === 'denied')

  return (
    <section className={`card ${styles.panel}`} aria-labelledby="report-lifecycle-title">
      <h2 id="report-lifecycle-title">Operational lifecycle</h2>
      <p className={styles.intro}>Progress from citizen submission to field resolution.</p>
      <div className={styles.statuses}>
        <ReportPriorityBadge priority={report.citizen_priority} />
        {!stopped && <Status title="Report status" value={report.status} tone={getReportStatusHex(report.status)} />}
        <Status title="Citizen review" value={report.validation_status} tone={VALIDATION_TONE[report.validation_status] || 'var(--info)'} />
        {report.on_private_property && <Status title="Property consent" value={report.property_owner_consent_status} tone={CONSENT_TONE[report.property_owner_consent_status] || 'var(--warning)'} />}
        {!stopped && slaInfo && (
          <span className={styles.deadline} data-state={slaInfo.status}>{slaInfo.label}</span>
        )}
      </div>
      {stopped ? (
        <p className={styles.notice}>Operational progression is paused for this report.</p>
      ) : (
        <>
          {currentIndex === -1
            ? <p className={styles.notice}>Operational stage not recorded.</p>
            : <p className={styles.currentStage}>Current stage: <strong>{stages[currentIndex][1]}</strong></p>}
          <ol className={styles.steps} aria-label="Report progress">
            {stages.map(([stage, label], index) => {
              const state = index < currentIndex ? 'completed' : index === currentIndex ? 'current' : 'pending'
              return (
                <li key={stage} className={styles.step} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
                  <span className={styles.marker} aria-hidden="true">
                    {state === 'completed' ? <Check size={16} /> : index + 1}
                  </span>
                  <span>{label}<span className="sr-only">: {state}</span></span>
                </li>
              )
            })}
          </ol>
        </>
      )}
    </section>
  )
}
