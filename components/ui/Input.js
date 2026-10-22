import React from 'react'
import { useId } from 'react'

export default function Input({ className = '', label, error, containerClassName = '', ...props }) {
  const generatedId = useId()
  const id = props.id || generatedId
  const errorId = `${id}-error`
  return (
    <div className={`w-full ${containerClassName}`}>
      {label && <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-2">{label}</label>}
      <input 
        className={`input ${error ? 'border-error' : ''} ${className}`} 
        {...props} 
        id={id}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={[props['aria-describedby'], error ? errorId : null].filter(Boolean).join(' ') || undefined}
      />
      {error && <p id={errorId} role="alert" className="text-sm text-error mt-2">{error}</p>}
    </div>
  )
}
