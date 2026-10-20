'use client'
import { useEffect, useId, useRef, useState } from 'react'
import Radio from '@/components/ui/Radio'
import styles from './OperationCreate.module.css'

export function OperationChoices({ items, label, children, empty, className = '' }) {
  const listRef = useRef(null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(1)
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, pages - 1)
  const start = currentPage * pageSize
  useEffect(() => {
    const list = listRef.current
    const observer = new ResizeObserver(() => {
      if (!list.clientHeight) return
      const minimum = parseFloat(getComputedStyle(list).getPropertyValue('--choice-height'))
      const height = Math.max(minimum, ...Array.from(list.children, row => row.getBoundingClientRect().height))
      setPageSize(Math.max(1, Math.floor(list.clientHeight / height)))
    })
    observer.observe(list)
    for (const row of list.children) observer.observe(row)
    return () => observer.disconnect()
  }, [items, currentPage, pageSize])
  return <div className={`${styles.choices} ${className}`}>
    <ul ref={listRef} className={styles.choiceViewport} aria-label={label}>
      {!items.length ? <li className={styles.empty}>{empty}</li>
        : items.slice(start, start + pageSize).map((item, index) => <li key={item.id}>{children(item, start + index)}</li>)}
    </ul>
    <nav className={styles.pager} aria-label={`${label} pages`}>
      <button type="button" aria-label={`Previous ${label}`} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button>
      <span role="status">{items.length ? `${start + 1}–${Math.min(start + pageSize, items.length)} of ${items.length}` : '0 results'}</span>
      <button type="button" aria-label={`Next ${label}`} disabled={currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)}>Next</button>
    </nav>
  </div>
}

export function CrewChoices({ crews, selected, onChange }) {
  const prefix = useId()
  return <OperationChoices items={crews} label="Field crew" className={styles.crewChoices} empty="No field crew members available">
    {crew => {
      const activeCount = crew.active_task_count ?? crew.assigned_tasks_count ?? 0
      const maxTasks = crew.max_tasks_per_shift || 10
      const isAtCapacity = crew.is_at_capacity || activeCount >= maxTasks
      const name = crew.crew_name || crew.name || crew.full_name || 'Crew Member'

      return (
        <div className={styles.crewRow}>
          <Radio id={`${prefix}-${crew.id}`} labelClassName={styles.crewLabel}
            label={
              <div className="flex items-center justify-between w-full pr-2">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{name}</span>
                </span>
                <span className={isAtCapacity ? styles.crewCapacityBadge : activeCount > 0 ? styles.crewActiveBadge : styles.crewAvailableBadge}>
                  {isAtCapacity
                    ? `At Capacity (${activeCount}/${maxTasks})`
                    : activeCount > 0
                    ? `${activeCount} task${activeCount > 1 ? 's' : ''} (${activeCount}/${maxTasks})`
                    : 'Available (0 tasks)'}
                </span>
              </div>
            }
            checked={selected.includes(crew.id)}
            onChange={event => onChange(event.target.checked ? [crew.id] : [])} />
        </div>
      )
    }}
  </OperationChoices>
}
