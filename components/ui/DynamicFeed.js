'use client'
import { useEffect, useRef, useState } from 'react'
import styles from './SpatialScan.module.css'

export default function DynamicFeed({ items, onHover, onClick, selectedItem, loading, error, onRetry }) {
  const listRef = useRef(null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(1)
  const [rowHeight, setRowHeight] = useState(112)
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, pages - 1)
  const start = currentPage * pageSize
  useEffect(() => {
    const list = listRef.current
    const observer = new ResizeObserver(() => {
      if (!list.clientHeight) return
      const height = Math.max(rowHeight, ...Array.from(list.querySelectorAll('button'), row => row.offsetHeight))
      setRowHeight(height)
      setPageSize(Math.max(1, Math.floor(list.clientHeight / height)))
    })
    observer.observe(list)
    for (const row of list.querySelectorAll('button')) observer.observe(row)
    return () => observer.disconnect()
  }, [items, currentPage, rowHeight, pageSize])
  return <section className={styles.feed} aria-labelledby="spatial-hotspots-title" aria-busy={loading}>
    <div className={styles.feedHeader}>
      <h2 id="spatial-hotspots-title">Forecast hotspots</h2>
      <span className={styles.count}>{loading || error ? '—' : items.length}</span>
      <p>Highest risk first. Select an area to locate it.</p>
    </div>
    <div className={styles.feedList} ref={listRef} aria-label="Hotspot results">
      {loading ? <p role="status" className={styles.empty}>Loading hotspots…</p>
        : error ? <div className={styles.empty} role="alert"><p>{error}</p><button type="button" className={styles.secondary} onClick={onRetry}>Try again</button></div>
        : items.length === 0 ? <p className={styles.empty}>No hotspots are available for this forecast.</p>
        : items.slice(start, start + pageSize).map((item, index) => {
          const properties = item.properties || {}
          const risk = ['high', 'medium', 'low'].includes(properties.risk_level) ? properties.risk_level : 'unknown'
          return <button type="button" key={item.id || properties.region_id || index} className={styles.hotspot}
            aria-pressed={selectedItem === item} onClick={() => onClick?.(item)}
            onMouseEnter={() => onHover?.(item)} onMouseLeave={() => onHover?.(null)}>
            <span className={styles.hotspotTitle}>{properties.top_issue_type?.replaceAll('_', ' ') || 'Hotspot'}<span className={styles.rank}>#{properties.rank || start + index + 1}</span></span>
            <span className={styles.coordinates}>{properties.center_lat != null && properties.center_lng != null ? `${Number(properties.center_lat).toFixed(4)}, ${Number(properties.center_lng).toFixed(4)}` : 'Coordinates unavailable'}</span>
            <span className={styles.hotspotMeta}><span>{properties.report_count ?? 0} reports · {Number.isFinite(properties.risk_score) ? `${(properties.risk_score * 100).toFixed(0)}%` : 'Unavailable'} score</span><span className={`${styles.risk} ${styles[risk]}`}>{risk} risk</span></span>
          </button>
        })}
    </div>
    <nav className={styles.pagination} aria-label="Hotspot pages">
      <button type="button" aria-label="Previous hotspots" disabled={loading || !!error || currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button>
      <span role="status">{items.length && !loading && !error ? `${start + 1}–${Math.min(start + pageSize, items.length)} of ${items.length}` : '—'}</span>
      <button type="button" aria-label="Next hotspots" disabled={loading || !!error || currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)}>Next</button>
    </nav>
  </section>
}
