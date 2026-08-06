'use client'
import PageHeader from './PageHeader'
import StatsCard from '../ui/StatsCard'
import QuickActions from '../ui/QuickActions'

/**
 * Universal Dashboard Layout component for role-specific dashboards
 */
export default function DashboardLayout({
  title,
  subtitle,
  breadcrumbs = [],
  stats = [], // Array of StatsCard props
  quickActions = [], // Array of QuickActions props
  children,
  loading = false,
  className = ''
}) {
  return (
    <div className={`p-8 ${className}`}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
      />

      {/* Stats Row */}
      {stats.length > 0 && (
        loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: stats.length }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-3 w-20 rounded bg-border/50 mb-3" />
                <div className="h-8 w-12 rounded bg-border/50" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <StatsCard key={index} {...stat} />
            ))}
          </div>
        )
      )}

      {/* Quick Actions */}
      {quickActions.length > 0 && !loading && (
        <QuickActions
          actions={quickActions}
          className="mb-8"
        />
      )}

      {/* Content Area */}
      {children}
    </div>
  )
}