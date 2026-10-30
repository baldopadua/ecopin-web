'use client'
import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import styles from './CommandCenter.module.css'

export default function CommandCenterPanel({ title, items, loading, empty, href, toolbar, children }) {
  const titleId = useId()
  const listRef = useRef(null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(1)
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, pages - 1)
  const start = currentPage * pageSize

  useEffect(() => {
    const list = listRef.current
    const measure = () => {
      if (!list.clientHeight) return
      const minimum = parseFloat(getComputedStyle(list).getPropertyValue('--command-row-height'))
      const height = Math.max(minimum, ...Array.from(list.children, row => row.getBoundingClientRect().height))
      setPageSize(Math.max(1, Math.floor(list.clientHeight / height)))
    }
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    for (const row of list.children) observer.observe(row)
    return () => observer.disconnect()
  }, [items, currentPage, pageSize])

  return <section className={styles.panel} aria-labelledby={titleId} aria-busy={loading} data-command-panel>
    <header className={styles.panelHeader}>
      <h2 id={titleId}>{title}</h2><span className={styles.count}>{loading ? '—' : items.length}</span>
    </header>
    {toolbar}
    <ul className={styles.list} ref={listRef} aria-label={`${title} preview`}>
      {loading ? <li className={styles.empty} role="status">Loading…</li>
        : !items.length ? <li className={styles.empty}>{empty}</li>
        : items.slice(start, start + pageSize).map((item, index) => <li key={item.id}>{children(item, start + index)}</li>)}
    </ul>
    <footer className={styles.panelFooter}>
      <Link href={href} aria-label={`View all ${title}`}>View all <ChevronRight size={14} aria-hidden="true" /></Link>
      <nav aria-label={`${title} pages`}>
        <button type="button" aria-label={`Previous ${title}`} disabled={loading || currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} aria-hidden="true" /></button>
        <span role="status">{loading || !items.length ? '—' : `${start + 1}–${Math.min(start + pageSize, items.length)} / ${items.length}`}</span>
        <button type="button" aria-label={`Next ${title}`} disabled={loading || currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} aria-hidden="true" /></button>
      </nav>
    </footer>
  </section>
}
