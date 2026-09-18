'use client'
import React, { useState, useRef, useEffect } from 'react'

export default function FilterDropdown({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedLabel = options.find(o => o.value === value)?.label || label

  return (
    <div className="relative min-w-[150px]" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-secondary w-full flex items-center justify-between gap-2"
      >
        <span className="truncate">{selectedLabel}</span>
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => { onChange(option.value); setOpen(false) }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                value === option.value
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-text-primary hover:bg-surface-elevated'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
