import React from 'react'

export default function Button({ 
  children, 
  variant = 'primary',
  className = '', 
  ...props 
}) {
  const baseClasses = variant === 'primary' ? 'btn-primary' : 
                      variant === 'secondary' ? 'btn-secondary' : 
                      variant === 'danger' ? 'bg-error text-white hover:bg-error/80 border-2 border-error font-medium px-4 py-2 rounded-none transition-colors' : 
                      variant === 'danger-outline' ? 'bg-error/10 text-error border-2 border-error/30 hover:bg-error/20 font-medium px-4 py-2 rounded-none transition-colors' : ''

  return (
    <button className={`${baseClasses} ${className}`} {...props}>
      {children}
    </button>
  )
}
