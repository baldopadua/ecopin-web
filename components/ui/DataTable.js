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
  showHeader = true
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
      <div className={`card no-hover ${className}`}>
        <div className="space-y-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <colgroup>
                {columns.map((col, index) => (
                  <col key={index} style={{ width: col.width || 'auto' }} />
                ))}
              </colgroup>
              {showHeader && (
                <thead>
                  <tr className="border-b border-border">
                    {columns.map((col, index) => (
                      <th key={index} className="text-left py-3 px-4 text-sm font-semibold text-text-primary">
                        <SkeletonLine className="h-4 w-16" />
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-border">
                    {columns.map((_, colIndex) => (
                      <td key={colIndex} className="py-3 px-4">
                        <SkeletonLine className="h-4 w-24" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className={`card no-hover ${className}`}>
        <div className="text-center py-10 text-text-muted">
          <p className="text-lg mb-1">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`card no-hover ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <colgroup>
            {columns.map((col, index) => (
              <col key={index} style={{ width: col.width || 'auto' }} />
            ))}
          </colgroup>
          {showHeader && (
            <thead>
              <tr className="border-b border-border">
                {columns.map((col, index) => (
                  <th
                    key={index}
                    className={`text-left py-3 px-4 text-sm font-semibold text-text-primary ${
                      sortable && onSort ? 'cursor-pointer hover:text-primary' : ''
                    }`}
                    onClick={() => sortable && handleSort(col.key)}
                  >
                    <div className="flex items-center">
                      {col.label}
                      {renderSortIcon(col.key)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={`border-b border-border ${
                  onRowClick ? 'cursor-pointer hover:bg-surface/50 transition-colors' : ''
                }`}
                onClick={() => onRowClick && onRowClick(row, rowIndex)}
              >
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className="py-3 px-4">
                    {col.render ? col.render(row[col.key], row, rowIndex) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}