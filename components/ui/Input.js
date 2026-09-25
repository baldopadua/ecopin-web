import React from 'react'

export default function Input({ className = '', label, error, containerClassName = '', ...props }) {
  return (
    <div className={`w-full ${containerClassName}`}>
      {label && <label className="block text-sm font-medium text-text-secondary mb-2">{label}</label>}
      <input 
        className={`input ${error ? 'border-error' : ''} ${className}`} 
        {...props} 
      />
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  )
}
