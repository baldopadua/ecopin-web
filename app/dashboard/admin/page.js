'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { getSystemStats, getAuditLogs } from '@/lib/api'
import StatsCard from '@/components/ui/StatsCard'
import DataTable from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'

export default function AdminHomepage() {
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [recentLogs, setRecentLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadStats()
    loadRecentLogs()
  }, [])

  const loadStats = async () => {
    try {
      const data = await getSystemStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to load stats:', err)
      setError('Failed to load system statistics')
    } finally {
      setLoading(false)
    }
  }

  const loadRecentLogs = async () => {
    try {
      const data = await getAuditLogs({ limit: 4 })
      setRecentLogs(data.logs || [])
    } catch (err) {
      console.error('Failed to load recent logs:', err)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const tableColumns = [
    {
      key: 'created_at',
      label: 'Date',
      width: '15%',
      render: (value) => (
        <span className="text-sm text-text-muted">{formatDate(value)}</span>
      )
    },
    {
      key: 'profiles',
      label: 'User',
      width: '20%',
      render: (value) => (
        <div>
          <p className="font-medium text-text-primary text-sm">
            {value?.full_name || 'Unknown'}
          </p>
          <p className="text-xs text-text-muted">
            {value?.email || 'N/A'}
          </p>
        </div>
      )
    },
    {
      key: 'action_type',
      label: 'Action',
      width: '15%',
      render: (value) => (
        <StatusBadge status={value} type="auditAction" />
      )
    },
    {
      key: 'action_details',
      label: 'Details',
      width: '50%',
      render: (value) => (
        <span className="text-sm text-text-secondary">{value}</span>
      )
    }
  ]

  if (loading) {
    return (
      <div className="p-8">
        <PageHeader
          title="Admin Dashboard"
          subtitle="Loading..."
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Admin' }
          ]}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-3 w-20 rounded bg-border/50 mb-3" />
              <div className="h-8 w-12 rounded bg-border/50" />
            </div>
          ))}
        </div>
        <div className="card no-hover">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-3 w-24 rounded bg-border/50" />
                <div className="h-3 flex-1 rounded bg-border/50" />
                <div className="h-3 w-20 rounded bg-border/50" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <PageHeader
          title="Admin Dashboard"
          subtitle="Error"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Admin' }
          ]}
        />
        <div className="card">
          <p className="text-error">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Manage users, settings, and view audit logs"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin' }
        ]}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Total Users"
          value={stats?.users?.total || 0}
          color="accent"
        >
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Citizens</span>
              <span className="text-text-primary font-medium">{stats?.users?.byRole?.citizen || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Officers</span>
              <span className="text-text-primary font-medium">{stats?.users?.byRole?.officer || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Field Crew</span>
              <span className="text-text-primary font-medium">{stats?.users?.byRole?.field_crew || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Admins</span>
              <span className="text-text-primary font-medium">{stats?.users?.byRole?.admin || 0}</span>
            </div>
          </div>
        </StatsCard>

        <StatsCard
          title="Total Reports"
          value={stats?.reports?.total || 0}
          color="accent"
        >
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Unresolved</span>
              <span className="text-text-primary font-medium">{stats?.reports?.byStatus?.unresolved || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Resolved</span>
              <span className="text-text-primary font-medium">{stats?.reports?.byStatus?.resolved || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Pending</span>
              <span className="text-text-primary font-medium">{stats?.reports?.byStatus?.pending || 0}</span>
            </div>
          </div>
        </StatsCard>

        <StatsCard
          title="Audit Logs"
          value={stats?.auditLogs?.total || 0}
          color="accent"
          subtitle="Total system actions logged"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <button
          onClick={() => router.push('/dashboard/admin/users')}
          className="card hover:border-accent-green transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-accent-green/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary">User Management</h3>
          </div>
          <p className="text-sm text-text-secondary">Manage user accounts and roles</p>
        </button>

        <button
          onClick={() => router.push('/dashboard/admin/settings')}
          className="card hover:border-accent-green transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-accent-green/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary">System Settings</h3>
          </div>
          <p className="text-sm text-text-secondary">Configure password requirements and security</p>
        </button>

        <button
          onClick={() => router.push('/dashboard/admin/audit-logs')}
          className="card hover:border-accent-green transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-accent-green/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text-primary">Audit Logs</h3>
          </div>
          <p className="text-sm text-text-secondary">View system activity and actions</p>
        </button>
      </div>

      {/* Recent Audit Logs */}
      <div className="card no-hover">
        <h2 className="text-xl font-bold text-text-primary mb-4">Recent Audit Logs</h2>
        <DataTable
          columns={tableColumns}
          data={recentLogs}
          emptyMessage="No recent activity"
        />
      </div>
    </div>
  )
}