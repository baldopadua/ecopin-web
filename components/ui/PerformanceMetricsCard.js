'use client'
import { useState, useEffect } from 'react'

const WorkQuality = {
  poor: { label: 'Poor', color: 'text-error' },
  fair: { label: 'Fair', color: 'text-warning' },
  good: { label: 'Good', color: 'text-info' },
  great: { label: 'Great', color: 'text-success' },
  excellent: { label: 'Excellent', color: 'text-primary' }
}

export default function PerformanceMetricsCard({ completedTasks = 18, totalTasks = 24, quality = 'great', dailyCounts = [3,5,4,7,6,8,5] }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const targetProgress = (completedTasks / totalTasks) * 100
    const duration = 1000
    const steps = 60
    const increment = targetProgress / steps
    
    let current = 0
    const interval = setInterval(() => {
      current += increment
      if (current >= targetProgress) {
        setProgress(targetProgress)
        clearInterval(interval)
      } else {
        setProgress(current)
      }
    }, duration / steps)

    return () => clearInterval(interval)
  }, [completedTasks, totalTasks])

  const qualityInfo = WorkQuality[quality] || WorkQuality.good
  const maxCount = Math.max(...dailyCounts, 1)

  return (
    <div className="card border-l-4 border-l-[var(--accent-green)]">
      {/* Card Header */}
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span className="text-sm font-bold text-text-primary">Weekly Performance</span>
      </div>

      {/* Main Content */}
      <div className="flex items-center gap-6">
        {/* Progress Ring */}
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-surface dark:text-surface-elevated"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - progress / 100)}`}
              strokeLinecap="round"
              className="text-accent-green transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-text-primary">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1">
          <div className="mb-3">
            <p className="text-sm text-text-muted">Tasks Completed</p>
            <p className="text-2xl font-bold text-text-primary">{completedTasks} / {totalTasks}</p>
          </div>
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${qualityInfo.color.replace('text', 'bg').replace('error', 'error/15').replace('warning', 'warning/15').replace('info', 'info/15').replace('success', 'success/15').replace('primary', 'primary/15')} ${qualityInfo.color}`}>
            {qualityInfo.label} Quality
          </div>
        </div>
      </div>

      {/* 7-Day Activity Chart */}
      <div className="mt-6">
        <p className="text-xs font-semibold text-text-muted mb-3">7-Day Activity</p>
        <div className="flex items-end justify-between gap-2 h-16">
          {dailyCounts.map((count, index) => {
            const height = (count / maxCount) * 100
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-surface dark:bg-surface-elevated rounded-t-sm relative" style={{ height: '100%' }}>
                  <div
                    className="absolute bottom-0 w-full bg-accent-green rounded-t-sm transition-all duration-500"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-xs text-text-muted mt-1">{days[index]}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
