'use client'
import styles from './SpatialScan.module.css'

export default function DynamicFeed({ items, onHover, onClick, selectedItem, loading, error, onRetry }) {
  return <section className={styles.feed} aria-labelledby="spatial-hotspots-title" aria-busy={loading}>
    <div className={styles.feedHeader}>
      <h2 id="spatial-hotspots-title">Forecast hotspots</h2>
      <span className={styles.count}>{loading || error ? '—' : items.length}</span>
      <p>Ordered by risk score. Select an area to view it on the map.</p>
    </div>
    <div className={styles.feedList}>
      {loading ? <p role="status" className={styles.empty}>Loading hotspots…</p>
        : error ? <div className={styles.empty} role="alert"><p>{error}</p><button type="button" className={styles.secondary} onClick={onRetry}>Try again</button></div>
        : items.length === 0 ? <p className={styles.empty}>No hotspots are available for this forecast.</p>
        : items.map((item, index) => {
          const properties = item.properties || {}
          const risk = ['high', 'medium', 'low'].includes(properties.risk_level) ? properties.risk_level : 'unknown'
          return <button type="button" key={item.id || properties.region_id || index} className={styles.hotspot}
            aria-pressed={selectedItem === item} onClick={() => onClick?.(item)}
            onMouseEnter={() => onHover?.(item)} onMouseLeave={() => onHover?.(null)}>
            <span className={styles.hotspotTitle}>{properties.top_issue_type?.replaceAll('_', ' ') || 'Hotspot'}<span className={styles.rank}>#{properties.rank || index + 1}</span></span>
            <span className={styles.coordinates}>{properties.center_lat != null && properties.center_lng != null ? `${Number(properties.center_lat).toFixed(4)}, ${Number(properties.center_lng).toFixed(4)}` : 'Coordinates unavailable'}</span>
            <span className={styles.hotspotMeta}><span>{properties.report_count ?? 0} reports</span><span className={`${styles.risk} ${styles[risk]}`}>{risk} risk</span></span>
            <span className={styles.score}>Risk score: {Number.isFinite(properties.risk_score) ? `${(properties.risk_score * 100).toFixed(0)}%` : 'Unavailable'}</span>
          </button>
        })}
    </div>
  </section>
}
