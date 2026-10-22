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
  borderLeft = true,
  children
}) {
  const colorMap = {
    accent: 'var(--workspace-link, var(--primary))',
    success: 'var(--success)',
    warning: 'var(--warning)',
    error: 'var(--error)',
    info: 'var(--info)',
    purple: 'var(--purple)'
  }

  const borderColor = colorMap[color] || colorMap.accent

  return (
    <div
      className={`workspace-stat bg-surface border border-border rounded-2xl p-5 ${onClick ? 'hover:bg-surface-elevated transition-all cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {title && (
            <span className="text-sm font-medium text-text-secondary block mb-2">{title}</span>
          )}
          <p className="text-3xl font-semibold text-text-primary tracking-tight">
            {value}
          </p>
          {subtitle && (
            <div className="text-sm text-text-secondary mt-1.5 leading-normal">{subtitle}</div>
          )}
          {trend && (
            <div className="flex items-center gap-2 mt-3">
              <span className={`text-sm font-medium border border-border px-2 py-0.5 rounded-sm ${
                trend.positive ? 'text-success dark:text-accent-green' : 'text-error dark:text-error'
              }`}>
                {trend.positive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-text-muted">{trend.label}</span>
            </div>
          )}
          {children}
        </div>
        {icon && (
          <div
            className="w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ml-4"
            style={{ 
              borderColor: `color-mix(in srgb, ${borderColor} 25%, transparent)`,
              color: borderColor,
              backgroundColor: `color-mix(in srgb, ${borderColor} 10%, transparent)` 
            }}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
