import React from 'react'

export default function Checkbox({ className = '', labelClassName = 'text-sm text-text-primary', label, checked, onChange, id, ...props }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <label htmlFor={id} className="flex items-center gap-2 cursor-pointer group">
        <input 
          type="checkbox" 
          id={id}
          checked={checked} 
          onChange={onChange} 
          className="sr-only" 
          {...props} 
        />
        <div className={`w-4 h-4 border-2 flex items-center justify-center transition-colors ${checked ? 'bg-primary border-primary' : 'border-border bg-surface-elevated'}`}>
          {checked && (
            <svg className="w-3 h-3 text-white dark:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        {label && <span className={labelClassName}>{label}</span>}
      </label>
    </div>
  )
}
