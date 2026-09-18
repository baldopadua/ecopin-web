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
    <div className={`bg-surface border-2 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_#ccff00] p-6 mb-8 ${className}`}>
      <h2 className="text-2xl font-black uppercase tracking-tighter text-text-primary mb-6 border-b-2 border-border pb-4">{title}</h2>
      <div className="flex flex-wrap gap-4">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`${action.variant === 'primary' 
              ? 'bg-accent-green text-black border-2 border-black dark:border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_#ccff00] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]' 
              : 'bg-surface text-text-primary border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_#ccff00] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]'
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