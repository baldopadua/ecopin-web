'use client'
import DateRangePicker from './DateRangePicker'
import Input from './Input'
import Button from './Button'

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
    <div className={`bg-surface-elevated border border-border p-6 mb-8 ${sticky ? 'sticky top-[120px] z-10' : ''} ${className}`}>
      <div className="flex flex-col md:flex-row md:items-end gap-5">
        {/* Search Input */}
        {onSearchChange && (
          <div className="flex-1 min-w-[250px]">
            <label className="block text-[10px] font-mono text-text-muted uppercase tracking-widest mb-2">Search</label>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-surface border border-border text-sm font-bold p-3 outline-none focus:border-accent-green text-text-primary placeholder:text-text-muted/50"
            />
          </div>
        )}

        {/* Filter Dropdowns */}
        {filters.map((filter, index) => (
          <div key={index} className="min-w-[180px]">
            <label className="block text-[10px] font-mono text-text-muted uppercase tracking-widest mb-2">{filter.label}</label>
            <div className="relative">
               <select
                 value={filter.value}
                 onChange={(e) => filter.onChange(e.target.value)}
                 className="w-full bg-surface border border-border text-sm font-bold uppercase tracking-wider p-3 outline-none focus:border-accent-green text-text-primary cursor-pointer appearance-none pr-10"
               >
                 {filter.options.map((option) => (
                   <option key={option.value} value={option.value}>{option.label}</option>
                 ))}
               </select>
               <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
               </div>
            </div>
          </div>
        ))}

        {/* Date Range Picker */}
        {showDateRange && onDateRangeChange && (
          <div className="min-w-[250px]">
             <label className="block text-[10px] font-mono text-text-muted uppercase tracking-widest mb-2">Date Range</label>
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
            className={`px-4 py-3 bg-surface border border-border text-text-secondary text-sm font-bold uppercase tracking-widest hover:text-text-primary hover:border-text-primary transition-all duration-300 whitespace-nowrap ${hasActiveFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            disabled={!hasActiveFilters}
            tabIndex={hasActiveFilters ? 0 : -1}
          >
            Reset Filters
          </button>
        )}
      </div>
      
      {/* Results Count */}
      {resultsCount !== null && (
        <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
           <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">Results</span>
           <span className="text-sm font-bold text-text-primary">
             {loading ? 'LOADING...' : `${resultsCount} ${resultsCount === 1 ? 'ITEM' : 'ITEMS'} FOUND`}
           </span>
        </div>
      )}
    </div>
  )
}