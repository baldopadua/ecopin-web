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
    <div className={`flex flex-wrap items-center gap-3 ${className}`} role="group" aria-label="Date range">
      <label className="flex-1 min-w-0 text-sm text-text-secondary">
        <span className="block mb-1">From</span>
        <input
          type="date"
          value={startDate}
          aria-label="From date"
          max={endDate || undefined}
          onChange={(e) => handleStartDateChange(e.target.value)}
          className="input"
        />
      </label>
      <label className="flex-1 min-w-0 text-sm text-text-secondary">
        <span className="block mb-1">To</span>
        <input
          type="date"
          value={endDate}
          aria-label="To date"
          min={startDate || undefined}
          onChange={(e) => handleEndDateChange(e.target.value)}
          className="input"
        />
      </label>
    </div>
  )
}
