'use client'
import styles from './SpatialScan.module.css'

export default function CommandHUD({ viewMode, setViewMode, timeHorizon = '7d', setTimeHorizon }) {
  return <div className={styles.controls}>
    {setTimeHorizon && (
      <div className={styles.horizonControls} role="group" aria-label="Forecast horizon">
        {[['7d', '+7 Days (Short-term)'], ['30d', '+30 Days (Monthly)'], ['90d', '+90 Days (Quarterly)']].map(([value, label]) =>
          <button key={value} type="button" aria-label={label} aria-pressed={timeHorizon === value} disabled={viewMode === 'heatmap'} onClick={() => setTimeHorizon(value)}><strong>Next {parseInt(value, 10)} days</strong><span>{value === '7d' ? 'Short term' : value === '30d' ? 'Monthly outlook' : 'Quarterly outlook'}</span></button>)}
      </div>
    )}
    <div className={`${styles.switcher} ${styles.layerControls}`} role="group" aria-label="Map layer">
      <button type="button" aria-label="Risk areas" aria-pressed={viewMode === 'clusters'} onClick={() => setViewMode('clusters')}>Forecast map</button>
      <button type="button" aria-label="Today (Actual)" aria-pressed={viewMode === 'heatmap'} onClick={() => setViewMode('heatmap')}>Today’s reports</button>
    </div>
  </div>
}
