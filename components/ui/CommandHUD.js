'use client'
import styles from './SpatialScan.module.css'

export default function CommandHUD({ accuracy, lastUpdated, viewMode, setViewMode, timeHorizon = '7d', setTimeHorizon }) {
  const value = accuracy?.averageAccuracy
  const hasEvaluations = (accuracy?.totalEvaluations ?? 0) > 0
  const displayAccuracy = hasEvaluations && Number.isFinite(value)
    ? `${(value * 100).toFixed(1)}%`
    : 'Unavailable'

  return <div className={styles.controls || styles.summary}>
    {accuracy && (
      <>
        <div className={styles.metric}><span>Model accuracy</span><strong>{displayAccuracy}</strong></div>
        <div className={styles.metric}><span>Metrics loaded at</span><strong>{lastUpdated || 'Unavailable'}</strong></div>
      </>
    )}
    {setTimeHorizon && (
      <div className={styles.horizonControls} role="group" aria-label="Forecast horizon">
        {[['7d', '+7 Days (Short-term)'], ['30d', '+30 Days (Monthly)'], ['90d', '+90 Days (Quarterly)']].map(([value, label]) =>
          <button key={value} type="button" aria-label={label} aria-pressed={timeHorizon === value} disabled={viewMode === 'heatmap'} onClick={() => setTimeHorizon(value)}><strong>Next {parseInt(value, 10)} days</strong><span>{value === '7d' ? 'Short term' : value === '30d' ? 'Monthly outlook' : 'Quarterly outlook'}</span></button>)}
      </div>
    )}
    <div className={`${styles.switcher || ''} ${styles.layerControls || ''}`} role="group" aria-label="Map layer">
      <button type="button" aria-label="Risk areas" aria-pressed={viewMode === 'clusters'} onClick={() => setViewMode('clusters')}>Forecast map</button>
      <button type="button" aria-label="Today (Actual)" aria-pressed={viewMode === 'heatmap'} onClick={() => setViewMode('heatmap')}>Today’s reports</button>
    </div>
  </div>
}
