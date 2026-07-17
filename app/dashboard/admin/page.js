'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { getSystemStats, getAuditLogs } from '@/lib/api'
import { SkeletonLine, SkeletonStatCard, SkeletonTable } from '@/components/ui/Skeleton'

export default function AdminDashboard() {
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

  const getActionTypeColor = (actionType) => {
    switch (actionType) {
      case 'login':
        return 'bg-success/10 text-success'
      case 'logout':
        return 'bg-surface text-text-muted'
      case 'password_change':
        return 'bg-warning/10 text-warning'
      case 'role_change':
        return 'bg-purple/10 text-purple'
      case 'user_created':
        return 'bg-info/10 text-info'
      case 'user_deleted':
        return 'bg-error/10 text-error'
      default:
        return 'bg-surface text-text-muted'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

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
            <SkeletonStatCard key={i} />
          ))}
        </div>
        <div className="card no-hover">
          <SkeletonTable rows={4} cols={4} />
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
        <div className="card">
          <h3 className="text-lg font-semibold text-text-primary mb-2">Total Users</h3>
          <p className="text-3xl font-bold text-accent-green">{stats?.users?.total || 0}</p>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Citizens</span>
              <span className="text-text-primary font-medium">{stats?.users?.byRole?.citizen || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">LGU</span>
              <span className="text-text-primary font-medium">{stats?.users?.byRole?.lgu || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Admins</span>
              <span className="text-text-primary font-medium">{stats?.users?.byRole?.admin || 0}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-text-primary mb-2">Total Reports</h3>
          <p className="text-3xl font-bold text-accent-green">{stats?.reports?.total || 0}</p>
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
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-text-primary mb-2">Audit Logs</h3>
          <p className="text-3xl font-bold text-accent-green">{stats?.auditLogs?.total || 0}</p>
          <p className="text-sm text-text-muted mt-4">Total system actions logged</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      <div className="card no-hover mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Recent Audit Logs</h3>
          <button
            onClick={() => router.push('/dashboard/admin/audit-logs')}
            className="text-sm text-accent-green hover:text-accent-green-dark font-medium cursor-pointer"
          >
            View All
          </button>
        </div>
        {recentLogs.length === 0 ? (
          <p className="text-text-muted">No recent audit logs</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-text-primary">Date</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-text-primary">User</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-text-primary">Action</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-text-primary">Details</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border">
                    <td className="py-2 px-3 text-xs text-text-muted">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="py-2 px-3">
                      <p className="font-medium text-text-primary text-xs">
                        {log.profiles?.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-text-muted">
                        {log.profiles?.email || 'N/A'}
                      </p>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getActionTypeColor(log.action_type)}`}>
                        {log.action_type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs text-text-secondary max-w-xs truncate">
                      {log.action_details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
