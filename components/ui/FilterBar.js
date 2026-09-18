'use client'
import FilterDropdown from './FilterDropdown'
import DateRangePicker from './DateRangePicker'

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
  const hasActiveFilters = searchValue || 
    filters.some(f => f.value !== 'all' && f.value !== '') ||
    (showDateRange && (dateRange.start || dateRange.end))

  return (
    <div className={`bg-surface-elevated border-2 border-border rounded-none shadow-[2px_2px_0px_0px_#1a1a1a] dark:shadow-[2px_2px_0px_0px_#333333] p-4 mb-6 ${sticky ? 'sticky top-[120px] z-10 border-l-8 border-l-[var(--accent-green)]' : ''} ${className}`}>
      <div className="flex flex-wrap items-center gap-4">
        {/* Search Input */}
        {onSearchChange && (
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="input"
            />
          </div>
        )}

        {/* Filter Dropdowns */}
        {filters.map((filter, index) => (
          <FilterDropdown
            key={index}
            label={filter.label}
            value={filter.value}
            onChange={filter.onChange}
            options={filter.options}
          />
        ))}

        {/* Date Range Picker */}
        {showDateRange && onDateRangeChange && (
          <DateRangePicker
            startDate={dateRange.start}
            endDate={dateRange.end}
            onChange={onDateRangeChange}
          />
        )}

        {/* Reset Button */}
        {onReset && hasActiveFilters && (
          <button
            onClick={onReset}
            className="btn-secondary whitespace-nowrap cursor-pointer"
          >
            Reset Filters
          </button>
        )}

        {/* Results Count */}
        {resultsCount !== null && (
          <span className="text-sm text-text-secondary ml-auto">
            {loading ? 'Loading...' : `${resultsCount} ${resultsCount === 1 ? 'item' : 'items'}`}
          </span>
        )}
      </div>
    </div>
  )
}