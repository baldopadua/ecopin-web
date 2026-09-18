'use client'

/**
 * Universal Stats Card component for displaying statistics
 */
export default function StatsCard({
  title,
  value,
  subtitle,
  icon = null,
  color = 'accent', // accent, success, warning, error, info, purple
  trend = null, // { value: number, label: string, positive: boolean }
  onClick = null,
  className = '',
  borderLeft = true
}) {
  const colorMap = {
    accent: 'var(--accent-green)',
    success: 'var(--success)',
    warning: 'var(--warning)',
    error: 'var(--error)',
    info: 'var(--info)',
    purple: 'var(--purple)'
  }

  const borderColor = colorMap[color] || colorMap.accent

  return (
    <div
      className={`bg-surface border-2 border-border rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_#ccff00] p-6 ${borderLeft ? 'border-l-8' : ''} ${onClick ? 'hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all cursor-pointer' : ''} ${className}`}
      style={borderLeft ? { borderLeftColor: borderColor } : {}}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {title && (
            <span className="text-xs font-mono tracking-widest uppercase text-text-muted block mb-2">{title}</span>
          )}
          <p className="text-4xl font-black text-text-primary uppercase">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm font-mono text-text-secondary mt-2">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-2 mt-3 font-mono">
              <span className={`text-sm font-bold bg-black px-2 py-1 ${
                trend.positive ? 'text-success dark:text-accent-green' : 'text-error dark:text-error'
              }`}>
                {trend.positive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs uppercase tracking-widest text-text-muted">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className="w-12 h-12 rounded-none border-2 flex items-center justify-center bg-black dark:bg-black"
            style={{ borderColor: borderColor, color: borderColor }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}