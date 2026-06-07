'use client'
import { useEffect, useState } from 'react'
import { fetchPublicReports } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    total: 0,
    unresolved: 0,
    inProgress: 0,
    resolved: 0,
    cleanupTasks: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublicReports().then(data => {
      const total = data.length
      const unresolved = data.filter(r => r.status === 'unresolved').length
      const inProgress = data.filter(r => r.status === 'in_progress').length
      const resolved = data.filter(r => r.status === 'resolved').length
      
      setStats({
        total,
        unresolved,
        inProgress,
        resolved,
        cleanupTasks: 0 // Will be implemented when cleanup tasks API is available
      })
      setLoading(false)
    })
  }, [])

  return (
    <div className="p-8">
      <PageHeader 
        title="Dashboard Overview"
        subtitle="Welcome to EcoPin Dashboard"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' }
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="mb-4">
            <span className="text-sm text-text-muted">Total Reports</span>
          </div>
          <p className="text-3xl font-bold text-text-primary">{loading ? '...' : stats.total}</p>
        </div>

        <div className="card">
          <div className="mb-4">
            <span className="text-sm text-text-muted">Unresolved</span>
          </div>
          <p className="text-3xl font-bold text-text-primary">{loading ? '...' : stats.unresolved}</p>
        </div>

        <div className="card">
          <div className="mb-4">
            <span className="text-sm text-text-muted">In Progress</span>
          </div>
          <p className="text-3xl font-bold text-text-primary">{loading ? '...' : stats.inProgress}</p>
        </div>

        <div className="card">
          <div className="mb-4">
            <span className="text-sm text-text-muted">Resolved</span>
          </div>
          <p className="text-3xl font-bold text-text-primary">{loading ? '...' : stats.resolved}</p>
        </div>
      </div>
    </div>
  )
}