'use client'

/**
 * Universal Quick Actions component for dashboard action buttons
 */
export default function QuickActions({
  actions = [], // Array of { label, onClick, variant: 'primary' | 'secondary', icon }
  className = '',
  title = 'Quick Actions'
}) {
  if (actions.length === 0) return null

  return (
    <div className={`card no-hover ${className}`}>
      <h2 className="text-xl font-bold text-text-primary mb-4">{title}</h2>
      <div className="flex flex-wrap gap-3">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`${action.variant === 'primary' ? 'btn-primary' : 'btn-secondary'} ${
              action.icon ? 'flex items-center gap-2' : ''
            }`}
          >
            {action.icon && <span>{action.icon}</span>}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}