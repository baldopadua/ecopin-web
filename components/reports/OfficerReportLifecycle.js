import { Check, Clock, AlertTriangle } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import styles from './OfficerReportLifecycle.module.css'
import { REPORT_LIFECYCLE_STAGES as stages, getReportLifecycleStage } from '@/lib/report-lifecycle.mjs'

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
        {!stopped && <span className={styles.status}>Report status <StatusBadge status={report.status} type="report" /></span>}
        <span className={styles.status}>Citizen review <StatusBadge status={report.validation_status} type="validation" /></span>
        {report.on_private_property && <span className={styles.status}>Property consent <StatusBadge status={report.property_owner_consent_status} type="consent" /></span>}
        {!stopped && slaInfo && (
          <span className={styles.deadline} data-state={slaInfo.status}>
            {slaInfo.status === 'breached' ? <AlertTriangle size={16} aria-hidden="true" /> : <Clock size={16} aria-hidden="true" />}
            {slaInfo.label}
          </span>
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
