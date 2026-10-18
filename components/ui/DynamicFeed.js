'use client'
import { useEffect, useRef, useState } from 'react'
import styles from './SpatialScan.module.css'
import { Search, ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react'

export default function DynamicFeed({ items, onHover, onClick, selectedItem, loading, error, onRetry, observed, filter = 'all', query = '', onFilterChange, onQueryChange, onClearFilters, totalAreas }) {
  const listRef = useRef(null)
  const [navigation, setNavigation] = useState({ key: '', page: 0 })
  const navigationKey = `${filter}-${query}`
  const page = navigation.key === navigationKey ? navigation.page : 0
  const setPage = value => setNavigation({ key: navigationKey, page: value })
  const [pageSize, setPageSize] = useState(1)
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, pages - 1)
  const start = currentPage * pageSize
  useEffect(() => {
    const list = listRef.current
    const observer = new ResizeObserver(() => {
      if (!list.clientHeight) return
      const height = Math.max(84, ...Array.from(list.querySelectorAll('[data-area-row]'), row => row.offsetHeight))
      setPageSize(Math.max(1, Math.floor(list.clientHeight / height)))
    })
    observer.observe(list)
    for (const row of list.querySelectorAll('button')) observer.observe(row)
    return () => observer.disconnect()
  }, [items, currentPage, pageSize])
  return <section className={styles.feed} aria-labelledby="spatial-hotspots-title" aria-busy={loading}>
    <div className={styles.feedHeader}>
      <h2 id="spatial-hotspots-title">{observed ? 'Reported today' : 'Areas to review'}</h2>
      <span className={styles.count}>{loading || error ? '—' : items.length}</span>
      <p>{observed ? 'Select a report to locate it.' : `${totalAreas ?? items.length} areas · highest risk first`}</p>
    </div>
    {!observed && <div className={styles.feedTools}>
      <label className={styles.searchField}><Search size={15} aria-hidden="true" /><input type="search" aria-label="Search forecast areas" placeholder="Find an area" value={query} onChange={event => { setPage(0); onQueryChange?.(event.target.value) }} /></label>
      <select aria-label="Filter forecast areas" value={filter} onChange={event => { setPage(0); onFilterChange?.(event.target.value) }}>
        <option value="all">All risk levels</option><option value="high">High risk</option><option value="medium">Medium risk</option><option value="low">Low risk</option><option value="rising">Rising activity</option>
      </select>
    </div>}
    <div className={styles.feedList} ref={listRef} aria-label="Hotspot results">
      {loading ? <p role="status" className={styles.empty}>Loading hotspots…</p>
        : error ? <div className={styles.empty} role="alert"><p>{error}</p><button type="button" className={styles.secondary} onClick={onRetry}>Try again</button></div>
        : items.length === 0 ? <div className={styles.empty}><p>{observed ? 'No reports have been recorded today.' : filter !== 'all' || query ? 'No areas match your filters.' : 'No areas are available for this forecast.'}</p>{!observed && (filter !== 'all' || query) && <button type="button" className={styles.clearFilter} onClick={onClearFilters}>Clear filters</button>}</div>
        : items.slice(start, start + pageSize).map((item, index) => {
          const properties = item.properties || {}
          const risk = ['high', 'medium', 'low'].includes(properties.risk_level) ? properties.risk_level : 'unknown'
          const velocity = properties.growth_velocity_percent
          const selected = observed ? selectedItem?.id === item.id : selectedItem?.properties?.zone_id === properties.zone_id
          return <button type="button" data-area-row key={item.id || properties.zone_id || properties.region_id || index} className={styles.hotspot}
            aria-pressed={!!selected} onClick={() => onClick?.(item)}
            onMouseEnter={() => onHover?.(item)} onMouseLeave={() => onHover?.(null)}>
            <span className={styles.hotspotTitle}><span>{observed ? properties.title || `Report ${start + index + 1}` : properties.display_name || properties.zone_name || 'Forecast area'}</span>{observed ? <ChevronRight size={16} aria-hidden="true" /> : <span className={`${styles.risk} ${styles[risk]}`}>{risk} risk</span>}</span>
            {observed ? <><span className={styles.rowCount}>{new Date(properties.created_at).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })}</span><span className={styles.coordinates}>{Number(properties.center_lat).toFixed(4)}, {Number(properties.center_lng).toFixed(4)}</span></>
              : <><span className={styles.rowCount}><strong>{Number.isFinite(properties.predicted_count) ? properties.predicted_count.toFixed(1) : '—'}</strong> expected reports <ChevronRight size={15} aria-hidden="true" /></span>
              <span className={styles.growth}>{Number.isFinite(velocity) ? <>{velocity > 0 ? <ArrowUpRight size={14} aria-hidden="true" /> : velocity < 0 ? <ArrowDownRight size={14} aria-hidden="true" /> : null}{velocity > 0 ? '+' : ''}{velocity.toFixed(1)}% vs. prior period</> : 'Trend unavailable'}</span></>}
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
