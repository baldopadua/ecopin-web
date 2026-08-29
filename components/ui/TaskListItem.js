'use client'

const TaskPriority = {
  high: { label: 'High', color: 'text-error', bgColor: 'bg-error/15' },
  medium: { label: 'Medium', color: 'text-warning', bgColor: 'bg-warning/15' },
  low: { label: 'Low', color: 'text-info', bgColor: 'bg-info/15' }
}

const TaskStatus = {
  inProgress: { label: 'In Progress', color: 'text-warning', bgColor: 'bg-warning/15' },
  pending: { label: 'Pending', color: 'text-info', bgColor: 'bg-info/15' },
  completed: { label: 'Completed', color: 'text-success', bgColor: 'bg-success/15' }
}

export default function TaskListItem({ task, onTap }) {
  const priority = task.priority || 'low'
  const status = task.status || 'pending'
  const priorityInfo = TaskPriority[priority] || TaskPriority.low
  const statusInfo = TaskStatus[status] || TaskStatus.pending

  return (
    <div 
      className="p-3 rounded-lg border border-border hover:bg-surface-elevated transition-colors cursor-pointer"
      onClick={onTap}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-text-primary text-sm flex-1">{task.title}</h4>
        <div className={`px-2 py-0.5 rounded text-xs font-bold ${priorityInfo.bgColor} ${priorityInfo.color}`}>
          {priorityInfo.label}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="flex-1">{task.location || 'Location not specified'}</span>
      </div>
      <div className="flex justify-between items-center">
        <div className={`px-2 py-0.5 rounded text-xs font-bold ${statusInfo.bgColor} ${statusInfo.color}`}>
          {statusInfo.label}
        </div>
        <span className="text-xs text-text-muted">{task.estimated_time || 'Time not specified'}</span>
      </div>
    </div>
  )
}
