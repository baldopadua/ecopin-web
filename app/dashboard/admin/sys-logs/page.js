'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { getSystemLogs } from '@/lib/api/admin'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import { AdminGuard } from '@/components/auth/RequireRole'
import { reportDiagnostic } from '../../../../lib/diagnostics.mjs';

function SystemLogsContent() {
  const router = useRouter()
  const [allLogs, setAllLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ search: '', action_type: '', start_date: '', end_date: '' })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const loadLogs = useCallback(async () => {
    try {
      const data = await getSystemLogs({ limit: 500 })
      setAllLogs(data.logs || [])
      setError(null)
    } catch (err) {
      reportDiagnostic('error', 'admin', 'Failed to load system logs:', err)
      setError(err.message || 'Failed to load system logs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const filteredLogs = useMemo(() => {
    let result = allLogs

    if (filters.search) {
      const term = filters.search.toLowerCase()
      result = result.filter(log =>
        (log.profiles?.full_name || '').toLowerCase().includes(term) ||
        (log.profiles?.email || '').toLowerCase().includes(term) ||
        (log.action_type || '').toLowerCase().includes(term) ||
        (log.action_details || '').toLowerCase().includes(term) ||
        (log.ip_address || '').toLowerCase().includes(term) ||
        (log.user_id || '').toLowerCase().includes(term)
      )
    }

    if (filters.action_type) {
      result = result.filter(log => log.action_type === filters.action_type)
    }
    if (filters.start_date) {
      result = result.filter(log => new Date(log.created_at) >= new Date(filters.start_date))
    }
    if (filters.end_date) {
      const endDate = new Date(filters.end_date)
      endDate.setHours(23, 59, 59, 999)
      result = result.filter(log => new Date(log.created_at) <= endDate)
    }

    return result
  }, [filters, allLogs])

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex)

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const updateFilters = (updater) => {
    setFilters(updater)
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setFilters({ search: '', action_type: '', start_date: '', end_date: '' })
    setCurrentPage(1)
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
      width: '35%',
      render: (value) => (
        <span className="text-sm text-text-secondary max-w-xs">{value}</span>
      )
    },
    { 
      key: 'ip_address', 
      label: 'IP Address', 
      width: '15%',
      render: (value) => (
        <span className="text-sm text-text-muted">{value || 'N/A'}</span>
      )
    }
  ]

  return (
    <div className="p-8">
        <PageHeader
          title="System Logs"
          subtitle="View system activity and actions"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Admin', href: '/dashboard/admin' },
            { label: 'System Logs' }
          ]}
        />

        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error/30 text-error flex justify-between items-center">
            <div>
              <p className="font-bold text-sm">Failed to load system logs</p>
              <p className="text-xs">{error}</p>
            </div>
            <button
              onClick={() => {
                setLoading(true)
                loadLogs()
              }}
              className="btn-secondary py-1 px-3 text-xs font-bold uppercase tracking-wider"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filters */}
        <FilterBar
          searchPlaceholder="Search by user, email, action, details, or IP..."
          searchValue={filters.search}
          onSearchChange={(val) => updateFilters(prev => ({ ...prev, search: val }))}
          filters={[
            {
              label: 'All Actions',
              value: filters.action_type,
              onChange: (val) => updateFilters(prev => ({ ...prev, action_type: val })),
              options: [
                { value: '', label: 'All Actions' },
                { value: 'login', label: 'Login' },
                { value: 'logout', label: 'Logout' },
                { value: 'password_change', label: 'Password Change' },
                { value: 'profile_update', label: 'Profile/Role Update' },
                { value: 'user_created', label: 'User Created' },
                { value: 'account_deletion', label: 'User Deleted' }
              ]
            }
          ]}
          showDateRange={true}
          dateRange={{ start: filters.start_date, end: filters.end_date }}
          onDateRangeChange={(range) => updateFilters(prev => ({ ...prev, start_date: range.start, end_date: range.end }))}
          onReset={handleResetFilters}
          resultsCount={filteredLogs.length}
          loading={loading}
          sticky={false}
        />

        {/* Logs Table */}
        <DataTable
          columns={tableColumns}
          data={paginatedLogs}
          loading={loading}
          emptyMessage="No system logs found"
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            itemsPerPage={itemsPerPage}
            totalItems={filteredLogs.length}
            className="mt-6"
          />
        )}
      </div>
  )
}
export default function SystemLogs() {
  return (
    <AdminGuard>
      <SystemLogsContent />
    </AdminGuard>
  )
}
