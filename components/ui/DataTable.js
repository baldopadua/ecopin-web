'use client'
import { SkeletonLine } from './Skeleton'
import { ChevronUp, ChevronDown, ChevronRight } from 'lucide-react'

/**
 * Universal Data Table component
 */
export default function DataTable({
  columns = [], // Array of { key, label, width, render, sortable }
  data = [],
  loading = false,
  emptyMessage = 'No data available',
  onRowClick = null,
  sortable = false,
  sortKey = null,
  sortDirection = 'asc',
  onSort = null,
  className = '',
  showHeader = true,
  rowClassName = '',
  getRowKey = row => row.id,
  rowActionLabel = row => `Open ${row.title || row.full_name || row.name || 'details'}`,
  caption = 'Results'
}) {
  const handleSort = (key) => {
    if (!sortable || !onSort) return
    
    if (sortKey === key) {
      onSort(key, sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      onSort(key, 'asc')
    }
  }

  const renderSortIcon = (key) => {
    if (!sortable || sortKey !== key) return null
    
    return sortDirection === 'asc' ? (
      <ChevronUp size={16} className="ml-1 inline" aria-hidden="true" />
    ) : (
      <ChevronDown size={16} className="ml-1 inline" aria-hidden="true" />
    )
  }

  return (
    <div className={`ecopin-table-container ${className}`} role={loading ? 'status' : 'region'}
      aria-busy={loading || undefined} aria-label={loading ? `Loading ${caption.toLowerCase()}` : caption} tabIndex={loading ? undefined : 0}>
      {loading && <span className="sr-only">Loading {caption.toLowerCase()}…</span>}
      <table className="ecopin-table">
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          {columns.map((col, index) => (
            <col key={index} style={{ width: col.width || 'auto' }} />
          ))}
          {onRowClick && <col style={{ width: 56 }} />}
        </colgroup>
        {showHeader && (
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th
                  key={index}
                  scope="col"
                  aria-sort={sortable && onSort && col.sortable !== false ? (sortKey === col.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                >
                  {sortable && onSort && col.sortable !== false ? <button type="button" disabled={loading} className="table-sort flex items-center min-h-11 gap-2 text-left" onClick={() => handleSort(col.key)}>
                    {col.label}
                    {renderSortIcon(col.key)}
                  </button> : col.label}
                </th>
              ))}
              {onRowClick && <th scope="col" className="table-row-action"><span className="sr-only">Details</span></th>}
            </tr>
          </thead>
        )}
        <tbody>
          {loading ? Array.from({ length: 5 }, (_, rowIndex) => <tr key={rowIndex}>
            {columns.map((_, colIndex) => <td key={colIndex}><SkeletonLine className="h-4 w-full max-w-24" /></td>)}
            {onRowClick && <td className="table-row-action"><SkeletonLine className="h-4 w-4" /></td>}
          </tr>) : data.length === 0 ? <tr className="table-empty"><td colSpan={Math.max(1, columns.length + (onRowClick ? 1 : 0))}>
            <p role="status">{emptyMessage}</p>
          </td></tr> : data.map((row, rowIndex) => (
            <tr
              key={getRowKey(row) ?? rowIndex}
              className={`${
                onRowClick ? 'cursor-pointer table-row-interactive' : ''
              } ${typeof rowClassName === 'function' ? rowClassName(row, rowIndex) : rowClassName}`}
              onClick={onRowClick ? event => {
                if (event.target.closest('button, a, input, select, textarea, label, summary, [role="button"], [contenteditable="true"]')) return
                onRowClick(row, rowIndex)
              } : undefined}
            >
              {columns.map((col, colIndex) => (
                <td key={colIndex}>
                  {col.render ? col.render(row[col.key], row, rowIndex) : row[col.key]}
                </td>
              ))}
              {onRowClick && <td className="table-row-action"><button type="button" className="table-row-open"
                aria-label={rowActionLabel(row)} onClick={event => { event.stopPropagation(); onRowClick(row, rowIndex) }}>
                <ChevronRight size={18} aria-hidden="true" />
              </button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
