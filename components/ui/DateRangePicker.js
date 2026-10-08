'use client'
import React from 'react'

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
        <input
          type="date"
          value={startDate}
          onChange={(e) => handleStartDateChange(e.target.value)}
          className="w-full bg-surface border border-border text-sm font-bold uppercase tracking-wider p-3 outline-none focus:border-accent-green text-text-primary"
        />
      </div>
      <div className="hidden sm:flex items-center text-text-muted">—</div>
      <div className="flex-1 min-w-[150px]">
        <input
          type="date"
          value={endDate}
          onChange={(e) => handleEndDateChange(e.target.value)}
          className="w-full bg-surface border border-border text-sm font-bold uppercase tracking-wider p-3 outline-none focus:border-accent-green text-text-primary"
        />
      </div>
    </div>
  )
}