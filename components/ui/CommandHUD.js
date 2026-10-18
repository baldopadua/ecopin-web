'use client'
import styles from './SpatialScan.module.css'

export default function CommandHUD({ accuracy, lastUpdated, viewMode, setViewMode }) {
  const value = accuracy?.averageAccuracy
  const hasEvaluations = (accuracy?.totalEvaluations ?? 0) > 0
  const displayAccuracy = hasEvaluations && Number.isFinite(value)
    ? `${(value * 100).toFixed(1)}%`
    : 'Unavailable'

  return <div className={styles.summary}>
    <div className={styles.metric}><span>Model accuracy</span><strong>{displayAccuracy}</strong></div>
    <div className={styles.metric}><span>Metrics loaded at</span><strong>{lastUpdated || 'Unavailable'}</strong></div>
    <div className={styles.switcher} role="group" aria-label="Map layer">
      <button type="button" aria-pressed={viewMode === 'clusters'} onClick={() => setViewMode('clusters')}>Risk areas</button>
      <button type="button" aria-pressed={viewMode === 'heatmap'} onClick={() => setViewMode('heatmap')}>Heatmap</button>
    </div>
  </div>
}
