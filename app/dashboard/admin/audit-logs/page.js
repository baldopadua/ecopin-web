'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { getAuditLogs } from '@/lib/api'

export default function AuditLogs() {
  const router = useRouter()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ action_type: '', start_date: '', end_date: '' })
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })

  useEffect(() => {
    loadLogs()
  }, [filters, pagination.page])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const data = await getAuditLogs({
        page: pagination.page,
        limit: 50,
        ...filters
      })
      setLogs(data.logs || [])
      setPagination(prev => ({
        ...prev,
        totalPages: data.pagination?.totalPages || 1,
        total: data.pagination?.total || 0
      }))
    } catch (err) {
      console.error('Failed to load audit logs:', err)
      setError('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  const getActionTypeColor = (actionType) => {
    switch (actionType) {
      case 'login':
        return 'bg-green-100 text-green-800'
      case 'logout':
        return 'bg-gray-100 text-gray-800'
      case 'password_change':
        return 'bg-yellow-100 text-yellow-800'
      case 'role_change':
        return 'bg-purple-100 text-purple-800'
      case 'user_created':
        return 'bg-blue-100 text-blue-800'
      case 'user_deleted':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Audit Logs"
        subtitle="View system activity and actions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin', href: '/dashboard/admin' },
          { label: 'Audit Logs' }
        ]}
      />

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <select
              value={filters.action_type}
              onChange={(e) => setFilters(prev => ({ ...prev, action_type: e.target.value }))}
              className="w-full p-3 border border-border rounded-lg bg-surface text-text-primary"
            >
              <option value="">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="password_change">Password Change</option>
              <option value="role_change">Role Change</option>
              <option value="user_created">User Created</option>
              <option value="user_deleted">User Deleted</option>
            </select>
          </div>
          <div className="min-w-[150px]">
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
              className="w-full p-3 border border-border rounded-lg bg-surface text-text-primary"
            />
          </div>
          <div className="min-w-[150px]">
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full p-3 border border-border rounded-lg bg-surface text-text-primary"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        {loading ? (
          <p className="text-text-muted">Loading audit logs...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : logs.length === 0 ? (
          <p className="text-text-muted">No audit logs found</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">User</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Action</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Details</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border">
                      <td className="py-3 px-4 text-sm text-text-muted">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-text-primary text-sm">
                            {log.profiles?.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-text-muted">
                            {log.profiles?.email || 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getActionTypeColor(log.action_type)}`}>
                          {log.action_type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-text-secondary max-w-xs">
                        {log.action_details}
                      </td>
                      <td className="py-3 px-4 text-sm text-text-muted">
                        {log.ip_address || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <p className="text-sm text-text-muted">
                  Showing {((pagination.page - 1) * 50) + 1} to {Math.min(pagination.page * 50, pagination.total)} of {pagination.total} logs
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
