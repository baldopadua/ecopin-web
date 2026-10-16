import React from 'react'
import { Check } from 'lucide-react'

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
        <div className={`w-4 h-4 border border-border flex items-center justify-center transition-colors ${checked ? 'bg-primary border-primary' : 'border-border bg-surface-elevated'}`}>
          {checked && (
            <Check size={12} strokeWidth={3} className="text-white dark:text-text-primary" aria-hidden="true" />
          )}
        </div>
        {label && <span className={labelClassName}>{label}</span>}
      </label>
    </div>
  )
}
