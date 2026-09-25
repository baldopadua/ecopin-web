'use client'
import { useState, useEffect } from 'react'
import { AlertCircle, MapPin, CheckCircle2, ListTodo } from 'lucide-react'

import StatusBadge from '@/components/ui/StatusBadge'

function TaskListItem({ title, location, priority, status, estimatedTime, onTap, taskId, taskType }) {
  return (
    <div 
      className="p-3 rounded-lg border border-border hover:bg-surface-elevated transition-colors cursor-pointer"
      onClick={() => onTap(taskId)}
    >
      <div className="flex justify-between items-start mb-2 gap-2">
        <div className="flex-1">
          <h4 className="font-semibold text-text-primary text-sm line-clamp-2">{title}</h4>
          {taskType && (
            <span className={`inline-block mt-1 text-[9px] uppercase font-bold font-mono tracking-wider px-1.5 py-0.5 border rounded-sm ${
              taskType === 'Scouting' ? 'bg-info/10 text-info border-info/20' :
              taskType === 'Cleanup' ? 'bg-success/10 text-success border-success/20' :
              'bg-purple/10 text-purple border-purple/20'
            }`}>
              {taskType === 'Scouting' ? '🔍 SCOUTING' : taskType === 'Cleanup' ? '🧹 CLEANUP' : '🔄 MIXED'}
            </span>
          )}
        </div>
        <StatusBadge status={priority} type="severity" />
      </div>
      <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
        <MapPin className="w-3 h-3 text-primary" />
        <span className="flex-1 line-clamp-1">{location}</span>
      </div>
      <div className="flex justify-between items-center">
        <StatusBadge status={status} type="task" />
        <span className="text-xs text-text-muted">{estimatedTime}</span>
      </div>
    </div>
  )
}

export default function PriorityTasksCard({ priorityTasks = [], feasibleTasks = [], onTaskClick = () => {} }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="card border-l-2 border-l-[var(--error)]">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-primary" />
          <span className="text-sm font-bold text-text-primary">Priority Tasks</span>
        </div>
        <div className="px-2 py-0.5 rounded text-xs font-bold bg-error/15 text-error">
          {priorityTasks.length} Urgent
        </div>
      </div>

        {/* Priority Tasks List */}
        <div className="space-y-2 mb-4">
          {priorityTasks.length > 0 ? (
            priorityTasks.map((task, index) => (
              <div
                key={task.id || index}
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
                  taskId={task.id}
                  taskType={task.taskType}
                  onTap={onTaskClick}
                />
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-text-muted">
              <CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm font-medium">No urgent tasks</p>
            </div>
          )}
        </div>

      {/* Feasible Tasks Section */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-2 mb-3">
          <ListTodo className="w-4 h-4 text-text-muted" />
          <span className="text-xs font-bold text-text-primary">Today's Feasible Tasks</span>
          <span className="text-xs text-text-muted">(Realistically doable)</span>
        </div>

        <div className="space-y-2 mb-3">
          {feasibleTasks.length > 0 ? (
            feasibleTasks.map((task, index) => (
              <div
                key={task.id || index}
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
                  taskId={task.id}
                  taskType={task.taskType}
                  onTap={onTaskClick}
                />
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-text-muted">
              <CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm font-medium">No feasible tasks</p>
            </div>
          )}
        </div>

        {/* View All Tasks Button */}
        {feasibleTasks.length > 0 && (
          <div className="text-center">
            <button 
              className="btn-secondary text-sm"
              onClick={() => onTaskClick(null)}
            >
              View All Tasks
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
