'use client'

const TaskPriority = {
  high: { label: 'High', color: 'text-error', bgColor: 'bg-error/15' },
  medium: { label: 'Medium', color: 'text-warning', bgColor: 'bg-warning/15' },
  low: { label: 'Low', color: 'text-info', bgColor: 'bg-info/15' }
}

export default function TaskClusterCard({ cluster, onTap }) {
  const taskCount = cluster.task_count || cluster.reports?.length || 0
  const priority = cluster.severity === 'high' ? 'high' : cluster.severity === 'medium' ? 'medium' : 'low'
  const priorityInfo = TaskPriority[priority] || TaskPriority.low

  return (
    <div 
      className="card border-l-4 border-l-[var(--accent)] hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onTap}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-text-primary text-lg">Cluster #{cluster.id}</h3>
            <p className="text-sm text-text-muted">{cluster.issue_type || 'Mixed Issues'}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${priorityInfo.bgColor} ${priorityInfo.color}`}>
            {priorityInfo.label} Priority
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center p-2 bg-surface-elevated rounded-lg">
            <p className="text-2xl font-bold text-text-primary">{taskCount}</p>
            <p className="text-xs text-text-muted">Reports</p>
          </div>
          <div className="text-center p-2 bg-surface-elevated rounded-lg">
            <p className="text-2xl font-bold text-text-primary">{cluster.report_count || taskCount}</p>
            <p className="text-xs text-text-muted">Tasks</p>
          </div>
          <div className="text-center p-2 bg-surface-elevated rounded-lg">
            <p className="text-2xl font-bold text-text-primary">{cluster.severity?.toUpperCase() || 'N/A'}</p>
            <p className="text-xs text-text-muted">Severity</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-text-muted mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs">
            {cluster.center_lat?.toFixed(4) || 'N/A'}, {cluster.center_lng?.toFixed(4) || 'N/A'}
          </span>
        </div>

        <button className="btn-secondary w-full text-sm">
          View Cluster Details
        </button>
      </div>
    </div>
  )
}
