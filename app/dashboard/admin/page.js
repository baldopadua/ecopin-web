'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { AdminGuard } from '@/components/auth/RequireRole'
import { getSystemStats, getSystemLogs } from '@/lib/api'
import StatsCard from '@/components/ui/StatsCard'
import DataTable from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import { Users, Settings, FileText } from 'lucide-react'
import { reportDiagnostic } from '../../../lib/diagnostics.mjs';

function AdminHomepageContent() {
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
      reportDiagnostic('error', 'admin', 'Failed to load stats:', err)
      setError('Failed to load system statistics')
    } finally {
      setLoading(false)
    }
  }

  const loadRecentLogs = async () => {
    try {
      const data = await getSystemLogs({ limit: 4 })
      setRecentLogs(data.logs || [])
    } catch (err) {
      reportDiagnostic('error', 'admin', 'Failed to load recent logs:', err)
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
      <div className="workspace-page">
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
      <div className="workspace-page">
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
    <div className="workspace-page">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Manage users, settings, and view system logs"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin' }
        ]}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          title="System Logs"
          value={stats?.systemLogs?.total ?? stats?.auditLogs?.total ?? 0}
          color="accent"
          subtitle="Total system actions logged"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => router.push('/dashboard/admin/users')}
          className="card hover:border-accent-green transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-accent-green/10 flex items-center justify-center">
              <Users size={20} className="text-accent-green" aria-hidden="true" />
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
              <Settings size={20} className="text-accent-green" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">System Settings</h3>
          </div>
          <p className="text-sm text-text-secondary">Configure password requirements and security</p>
        </button>

        <button
          onClick={() => router.push('/dashboard/admin/sys-logs')}
          className="card hover:border-accent-green transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-accent-green/10 flex items-center justify-center">
              <FileText size={20} className="text-accent-green" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">System Logs</h3>
          </div>
          <p className="text-sm text-text-secondary">View system activity and actions</p>
        </button>
      </div>

      {/* Recent System Logs */}
      <div className="workspace-fill">
        <h2 className="text-xl font-bold text-text-primary uppercase tracking-tight">Recent System Logs</h2>
        <div className="workspace-scroll">
          <DataTable columns={tableColumns} data={recentLogs} emptyMessage="No recent activity" />
        </div>
      </div>
    </div>
  )
}
export default function AdminHomepage() {
  return (
    <AdminGuard>
      <AdminHomepageContent />
    </AdminGuard>
  )
}
