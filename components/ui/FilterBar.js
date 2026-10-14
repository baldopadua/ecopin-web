'use client'
import DateRangePicker from './DateRangePicker'
import Input from './Input'
import PublicSelect from './PublicSelect'
import { useId } from 'react'

/**
 * Universal Filter Bar component for consistent filter/search UI
 */
export default function FilterBar({
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  filters = [], // Array of { label, value, onChange, options }
  showDateRange = false,
  dateRange = { start: '', end: '' },
  onDateRangeChange,
  onReset,
  resultsCount = null,
  loading = false,
  className = '',
  sticky = true
}) {
  const id = useId()
  const hasActiveFilters = searchValue || 
    filters.some(f => f.value !== 'all' && f.value !== '') ||
    (showDateRange && (dateRange.start || dateRange.end))

  return (
    <div className={`bg-surface border border-border rounded-2xl p-4 md:p-6 mb-6 ${sticky ? 'sticky top-0 z-10' : ''} ${className}`}>
      <div className="flex flex-wrap items-end gap-4">
        {/* Search Input */}
        {onSearchChange && (
          <div className="flex-auto w-full sm:w-auto sm:min-w-[240px]">
            <label htmlFor={`${id}-search`} className="block text-sm text-text-secondary mb-2">Search</label>
            <input id={`${id}-search`}
              type="search"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="input"
            />
          </div>
        )}

        {/* Filter Dropdowns */}
        {filters.map((filter, index) => (
          <div key={index} className="w-full sm:w-auto sm:min-w-[180px]">
            <PublicSelect id={`${id}-filter-${index}`} label={filter.label} value={filter.value}
              options={filter.options} onChange={filter.onChange} />
          </div>
        ))}

        {/* Date Range Picker */}
        {showDateRange && onDateRangeChange && (
          <div className="w-full sm:w-auto">
             <p className="text-sm text-text-secondary mb-2">Date range</p>
             <DateRangePicker
               startDate={dateRange.start}
               endDate={dateRange.end}
               onChange={onDateRangeChange}
             />
          </div>
        )}

        {/* Reset Button */}
        {onReset && (
          <button
            onClick={onReset}
            className="btn-secondary disabled:opacity-50"
            disabled={!hasActiveFilters}
          >
            Reset Filters
          </button>
        )}
      </div>
      
      {/* Results Count */}
      {resultsCount !== null && (
        <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
           <span className="text-sm text-text-secondary">Results</span>
           <span role="status" className="text-sm font-medium text-text-primary">
             {loading ? 'Loading results…' : `${resultsCount} ${resultsCount === 1 ? 'item' : 'items'} found`}
           </span>
        </div>
      )}
    </div>
  )
}
