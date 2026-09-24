'use client'
import Input from './Input'

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
      <Input
        label="From"
        type="date"
        value={startDate}
        onChange={(e) => handleStartDateChange(e.target.value)}
        containerClassName="flex-1 min-w-[150px]"
      />
      <div className="hidden sm:flex items-center pt-8 text-text-muted">—</div>
      <Input
        label="To"
        type="date"
        value={endDate}
        onChange={(e) => handleEndDateChange(e.target.value)}
        containerClassName="flex-1 min-w-[150px]"
      />
    </div>
  )
}