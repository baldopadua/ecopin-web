'use client'
import { useState, useEffect } from 'react'

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

function TaskListItem({ title, location, priority, status, estimatedTime, onTap }) {
  const priorityInfo = TaskPriority[priority] || TaskPriority.low
  const statusInfo = TaskStatus[status] || TaskStatus.pending

  return (
    <div 
      className="p-3 rounded-lg border border-border hover:bg-surface-elevated transition-colors cursor-pointer"
      onClick={onTap}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-text-primary text-sm flex-1">{title}</h4>
        <div className={`px-2 py-0.5 rounded text-xs font-bold ${priorityInfo.bgColor} ${priorityInfo.color}`}>
          {priorityInfo.label}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="flex-1">{location}</span>
      </div>
      <div className="flex justify-between items-center">
        <div className={`px-2 py-0.5 rounded text-xs font-bold ${statusInfo.bgColor} ${statusInfo.color}`}>
          {statusInfo.label}
        </div>
        <span className="text-xs text-text-muted">{estimatedTime}</span>
      </div>
    </div>
  )
}

export default function PriorityTasksCard() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const priorityTasks = [
    {
      title: 'Clear Blocked Drainage at Main St.',
      location: 'Zone A - Main Street Sector 3',
      priority: 'high',
      status: 'inProgress',
      time: '1.5 hrs'
    },
    {
      title: 'Prune Overgrown Branches near Power Lines',
      location: 'Zone B - Elm Avenue',
      priority: 'medium',
      status: 'pending',
      time: '2.0 hrs'
    }
  ]

  const feasibleTasks = [
    {
      title: 'Empty Public Waste bins',
      location: 'Zone A - Public Park',
      priority: 'low',
      status: 'pending',
      time: '1.0 hr'
    },
    {
      title: 'Replace Damaged Signboard',
      location: 'Zone C - West Highway',
      priority: 'low',
      status: 'pending',
      time: '45 mins'
    }
  ]

  return (
    <div className="card border-l-4 border-l-[var(--error)]">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="text-sm font-bold text-text-primary">Priority Tasks</span>
        </div>
        <div className="px-2 py-0.5 rounded text-xs font-bold bg-error/15 text-error">
          {priorityTasks.length} Urgent
        </div>
      </div>

      {/* Priority Tasks List */}
      <div className="space-y-2 mb-4">
        {priorityTasks.map((task, index) => (
          <div
            key={index}
            className="transition-all duration-500"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(15px)',
              transitionDelay: `${index * 150}ms`
            }}
          >
            <TaskListItem
              title={task.title}
              location={task.location}
              priority={task.priority}
              status={task.status}
              estimatedTime={task.time}
              onTap={() => {}}
            />
          </div>
        ))}
      </div>

      {/* Feasible Tasks Section */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-bold text-text-primary">Today's Feasible Tasks</span>
          <span className="text-xs text-text-muted">(Realistically doable)</span>
        </div>

        <div className="space-y-2 mb-3">
          {feasibleTasks.map((task, index) => (
            <div
              key={index}
              className="transition-all duration-500"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(15px)',
                transitionDelay: `${300 + index * 150}ms`
              }}
            >
              <TaskListItem
                title={task.title}
                location={task.location}
                priority={task.priority}
                status={task.status}
                estimatedTime={task.time}
                onTap={() => {}}
              />
            </div>
          ))}
        </div>

        {/* View All Tasks Button */}
        <div className="text-center">
          <button className="btn-secondary text-sm">
            View All Tasks
          </button>
        </div>
      </div>
    </div>
  )
}
