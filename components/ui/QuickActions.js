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
    <div className={`bg-surface-elevated border-2 border-border rounded-none px-6 py-4 mb-6 ${className}`}>
      <h2 className="text-xl font-bold text-text-primary mb-4 border-b-2 border-border pb-3">{title}</h2>
      <div className="flex flex-wrap gap-4">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`${action.variant === 'primary' 
              ? 'bg-accent-green text-black border-2 border-[#1a1a1a] dark:border-[#1a1a1a] hover:bg-accent-green/80' 
              : 'bg-surface-elevated text-text-primary border-2 border-border hover:bg-surface'
            } font-mono font-bold uppercase tracking-widest transition-all px-6 py-3 rounded-none ${
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