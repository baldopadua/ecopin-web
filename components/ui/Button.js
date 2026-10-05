import React from 'react'

export default function Button({ 
  children, 
  variant = 'primary',
  className = '', 
  ...props 
}) {
  const baseClasses = variant === 'primary' ? 'btn-primary' : 
                      variant === 'secondary' ? 'btn-secondary' : 
                      variant === 'danger' ? 'bg-error text-white hover:bg-error/80 border border-border border-error font-medium px-4 py-2 rounded-xl transition-colors' : 
                      variant === 'danger-outline' ? 'bg-error/10 text-error border border-border border-error/30 hover:bg-error/20 font-medium px-4 py-2 rounded-xl transition-colors' : ''

  return (
    <button className={`${baseClasses} ${className}`} {...props}>
      {children}
    </button>
  )
}
