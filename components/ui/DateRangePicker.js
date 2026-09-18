'use client'

/**
 * Universal Date Range Picker component
 */
export default function DateRangePicker({
  startDate = '',
  endDate = '',
  onChange,
  className = ''
}) {
  const handleStartDateChange = (value) => {
    onChange({ start: value, end: endDate })
  }

  const handleEndDateChange = (value) => {
    onChange({ start: startDate, end: value })
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 min-w-[150px]">
        <label className="block text-xs font-semibold text-text-muted mb-1">From</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => handleStartDateChange(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary"
        />
      </div>
      <div className="flex items-end pb-2 text-text-muted">—</div>
      <div className="flex-1 min-w-[150px]">
        <label className="block text-xs font-semibold text-text-muted mb-1">To</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => handleEndDateChange(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary"
        />
      </div>
    </div>
  )
}