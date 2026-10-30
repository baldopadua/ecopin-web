'use client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { AdminGuard } from '@/components/auth/RequireRole'
import { getAuditLogs } from '@/lib/api/admin'
import { useDashboardSystemStats } from '@/components/context/DashboardQueryProvider'
import { DASHBOARD_QUERY_KEY } from '@/lib/dashboard-query-client.mjs'
import StatsCard from '@/components/ui/StatsCard'
import ReportLifecycleSummary from '@/components/reports/ReportLifecycleSummary'
import DataTable from '@/components/ui/DataTable'
import { Users, Settings, FileText } from 'lucide-react'

function AdminHomepageContent() {
  const router = useRouter()
  const statsQuery = useDashboardSystemStats()
  const logsQuery = useQuery({queryKey:[...DASHBOARD_QUERY_KEY,'recent-audit-feed'],queryFn:()=>getAuditLogs({limit:5})})
  const stats = statsQuery.data
  const recentLogs = logsQuery.data?.logs || logsQuery.data?.data || []
  const loading = statsQuery.isPending
  const error = statsQuery.isError && !stats ? 'Failed to load system statistics' : null
  const loadStats = () => statsQuery.refetch()

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const tableColumns = [
    {
      key: 'created_at',
      label: 'Date',
      width: '25%',
      render: (value) => (
        <span className="text-sm text-text-muted">{formatDate(value)}</span>
      )
    },
    {
      key: 'user_name',
      label: 'Actor',
      width: '25%',
      render: (value, row) => (
        <span className="font-medium text-text-primary text-sm">{value || row.user_id || 'System'}</span>
      )
    },
    {
      key: 'event_type',
      label: 'Event',
      width: '50%',
      render: (value, row) => (
        <span className="text-sm text-text-secondary">{[value, row.entity_type].filter(Boolean).join(' · ').replace(/_/g, ' ') || 'Audit event'}</span>
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
            { label: 'Admin' }
          ]}
        />
        <div className="card">
          <p className="text-error">{error}</p>
          <button type="button" className="btn-secondary mt-4" onClick={loadStats}>Retry statistics</button>
        </div>
      </div>
    )
  }

  return (
    <div className="workspace-page workspace-page--flow">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Manage users, settings, and view system logs"
        breadcrumbs={[
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
          value={stats?.reports?.total ?? '—'}
          color="accent"
        >
          <ReportLifecycleSummary reports={stats?.reports} error={statsQuery.isError} onRetry={loadStats} />
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
          onClick={() => router.push('/dashboard/admin/audit-logs')}
          className="card hover:border-accent-green transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-accent-green/10 flex items-center justify-center">
              <FileText size={20} className="text-accent-green" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">Audit Logs</h3>
          </div>
          <p className="text-sm text-text-secondary">Review audit trail and system events</p>
        </button>
      </div>

      {/* Recent System Logs */}
      <div className="workspace-fill">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-text-primary uppercase tracking-tight">Recent audit activity</h2>
          <Link href="/dashboard/admin/audit-logs" className="text-sm text-workspace-link">View all</Link>
        </div>
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
