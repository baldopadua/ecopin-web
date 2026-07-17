'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { getResponseLogs } from '@/lib/api'
import FilterDropdown from '@/components/ui/FilterDropdown'

export default function ResponseLogs() {
  const router = useRouter()
  const [allLogs, setAllLogs] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ search: '', action_type: '', start_date: '', end_date: '' })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const data = await getResponseLogs()
      setAllLogs(data.logs || [])
    } catch (err) {
      console.error('Failed to load response logs:', err)
      setError('Failed to load response logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = allLogs
    if (filters.search) {
      const term = filters.search.toLowerCase()
      filtered = filtered.filter(log =>
        (log.profiles?.full_name || '').toLowerCase().includes(term) ||
        (log.profiles?.email || '').toLowerCase().includes(term) ||
        (log.action_details || '').toLowerCase().includes(term) ||
        (log.reports?.title || '').toLowerCase().includes(term)
      )
    }
    if (filters.action_type) {
      filtered = filtered.filter(log => log.action_type === filters.action_type)
    }
    if (filters.start_date) {
      filtered = filtered.filter(log => new Date(log.created_at) >= new Date(filters.start_date))
    }
    if (filters.end_date) {
      const endDate = new Date(filters.end_date)
      endDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(log => new Date(log.created_at) <= endDate)
    }
    setLogs(filtered)
    setCurrentPage(1)
  }, [filters, allLogs])

  const totalPages = Math.ceil(logs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLogs = logs.slice(startIndex, endIndex)

  const getActionTypeColor = (actionType) => {
    switch (actionType) {
      case 'status_update':
        return 'bg-info/10 text-info'
      case 'lifecycle_stage_update':
        return 'bg-purple/10 text-purple'
      case 'acknowledge_complaint':
      case 'lgu_resolve':
        return 'bg-success/10 text-success'
      case 'manual_note':
        return 'bg-warning/10 text-warning'
      case 'citizen_close':
        return 'bg-surface text-text-muted'
      case 'login':
        return 'bg-success/10 text-success'
      case 'password_change':
        return 'bg-warning/10 text-warning'
      default:
        return 'bg-surface text-text-muted'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Response Logs"
        subtitle="View report response actions and history"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Response Logs' }
        ]}
      />

      {/* Filters */}
      <div className="card mb-6 sticky top-[120px] z-10 bg-white/60 dark:bg-black/60  ">
        <div className="flex gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by user, details, or report..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <FilterDropdown
              label="All Actions"
              value={filters.action_type}
              onChange={(val) => setFilters(prev => ({ ...prev, action_type: val }))}
              options={[
                { value: '', label: 'All Actions' },
                { value: 'status_update', label: 'Status Update' },
                { value: 'lifecycle_stage_update', label: 'Lifecycle Stage Update' },
                { value: 'acknowledge_complaint', label: 'Acknowledge Complaint' },
                { value: 'manual_note', label: 'Manual Note' },
                { value: 'lgu_resolve', label: 'LGU Resolve' },
                { value: 'citizen_close', label: 'Citizen Close' },
                { value: 'login', label: 'Login' },
                { value: 'password_change', label: 'Password Change' },
                { value: 'user_created', label: 'User Created' }
              ]}
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-semibold text-text-muted mb-1">From</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary"
            />
          </div>
          <div className="flex items-end pb-2 text-text-muted">—</div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-semibold text-text-muted mb-1">To</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary"
            />
          </div>
          {(filters.search || filters.action_type || filters.start_date || filters.end_date) && (
            <button
              onClick={() => setFilters({ search: '', action_type: '', start_date: '', end_date: '' })}
              className="btn-secondary whitespace-nowrap cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="card no-hover">
        {loading ? (
          <p className="text-text-muted">Loading response logs...</p>
        ) : error ? (
          <p className="text-error">{error}</p>
        ) : logs.length === 0 ? (
          <p className="text-text-muted">No response logs found</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <colgroup>
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '20%' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">User</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Action</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Details</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Report</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map((log) => (
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
                        {log.reports?.title || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <p className="text-sm text-text-muted">
                  Showing {startIndex + 1} to {Math.min(endIndex, logs.length)} of {logs.length} logs
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 rounded ${currentPage === pageNum ? 'btn-primary' : 'btn-secondary'}`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
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
