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
      className={`card ${borderLeft ? 'border-l-4' : ''} ${onClick ? 'hover:shadow-lg transition-shadow cursor-pointer' : ''} ${className}`}
      style={borderLeft ? { borderLeftColor: borderColor } : {}}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {title && (
            <span className="text-sm text-text-muted block mb-1">{title}</span>
          )}
          <p className="text-3xl font-bold text-text-primary">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-sm font-medium ${
                trend.positive ? 'text-success' : 'text-error'
              }`}>
                {trend.positive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-sm text-text-muted">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${borderColor}20` }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}