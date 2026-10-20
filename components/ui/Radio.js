import React from 'react'

export default function Radio({ className = '', labelClassName = 'text-sm text-text-primary', label, checked, onChange, id, ...props }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <label htmlFor={id} className="flex items-center gap-2 cursor-pointer group">
        <input
          type="radio"
          id={id}
          checked={checked}
          onChange={onChange}
          className="sr-only"
          {...props}
        />
        <div className={`w-4 h-4 border-2 flex items-center justify-center transition-colors ${checked ? 'border-primary' : 'border-border bg-surface-elevated'}`}>
          {checked && (
            <div className="w-2 h-2 bg-primary rounded-full" aria-hidden="true" />
          )}
        </div>
        {label && <span className={labelClassName}>{label}</span>}
      </label>
    </div>
  )
}
