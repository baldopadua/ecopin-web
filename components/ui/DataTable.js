'use client'
import { SkeletonLine } from './Skeleton'

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
    
    return (
      <svg className="w-4 h-4 ml-1 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {sortDirection === 'asc' ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        )}
      </svg>
    )
  }

  if (loading) {
    return (
      <div className={`ecopin-table-container ${className}`} aria-busy="true" aria-label={`Loading ${caption.toLowerCase()}`}>
        <table className="ecopin-table">
          <colgroup>
            {columns.map((col, index) => (
              <col key={index} style={{ width: col.width || 'auto' }} />
            ))}
          </colgroup>
          {showHeader && (
            <thead>
              <tr>
                {columns.map((col, index) => (
                  <th key={index}>
                    <SkeletonLine className="h-4 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((_, colIndex) => (
                  <td key={colIndex}>
                    <SkeletonLine className="h-4 w-24" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div role="status" className={`bg-surface border border-border rounded-2xl p-8 ${className}`}>
        <div className="text-center py-6 text-text-secondary">
          <p className="text-lg mb-1">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`ecopin-table-container ${className}`} role="region" aria-label={caption} tabIndex={0}>
      <table className="ecopin-table">
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          {columns.map((col, index) => (
            <col key={index} style={{ width: col.width || 'auto' }} />
          ))}
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
                  {sortable && onSort && col.sortable !== false ? <button type="button" className="flex items-center min-h-11 gap-2 text-left" onClick={() => handleSort(col.key)}>
                    {col.label}
                    {renderSortIcon(col.key)}
                  </button> : col.label}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {data.map((row, rowIndex) => (
            <tr
              key={getRowKey(row) ?? rowIndex}
              className={`${
                onRowClick ? 'cursor-pointer table-row-interactive' : ''
              } ${typeof rowClassName === 'function' ? rowClassName(row, rowIndex) : rowClassName}`}
              onClick={event => {
                if (event.target.closest('button, a, input, select, textarea, [role="button"]')) return
                onRowClick?.(row, rowIndex)
              }}
            >
              {columns.map((col, colIndex) => (
                <td key={colIndex}>
                  {col.render ? col.render(row[col.key], row, rowIndex) : row[col.key]}
                  {onRowClick && colIndex === 0 && <button type="button" className="block text-sm text-secondary min-h-11 underline underline-offset-4"
                    aria-label={rowActionLabel(row)} onClick={() => onRowClick(row, rowIndex)}>Open details</button>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
