'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { getAuditLogs } from '@/lib/api'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'

export default function AuditLogs() {
  const router = useRouter()
  const [logs, setLogs] = useState([])
  const [allLogs, setAllLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ action_type: '', start_date: '', end_date: '' })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const data = await getAuditLogs()
      setAllLogs(data.logs || [])
    } catch (err) {
      console.error('Failed to load audit logs:', err)
      setError('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = allLogs
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

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleResetFilters = () => {
    setFilters({ action_type: '', start_date: '', end_date: '' })
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
        title="Audit Logs"
        subtitle="View system activity and actions"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Admin', href: '/dashboard/admin' },
          { label: 'Audit Logs' }
        ]}
      />

      {/* Filters */}
      <FilterBar
        filters={[
          {
            label: 'All Actions',
            value: filters.action_type,
            onChange: (val) => setFilters(prev => ({ ...prev, action_type: val })),
            options: [
              { value: '', label: 'All Actions' },
              { value: 'login', label: 'Login' },
              { value: 'logout', label: 'Logout' },
              { value: 'password_change', label: 'Password Change' },
              { value: 'role_change', label: 'Role Change' },
              { value: 'user_created', label: 'User Created' },
              { value: 'user_deleted', label: 'User Deleted' }
            ]
          }
        ]}
        showDateRange={true}
        dateRange={{ start: filters.start_date, end: filters.end_date }}
        onDateRangeChange={(range) => setFilters(prev => ({ ...prev, start_date: range.start, end_date: range.end }))}
        onReset={handleResetFilters}
        resultsCount={logs.length}
        loading={loading}
        sticky={false}
      />

      {/* Logs Table */}
      <DataTable
        columns={tableColumns}
        data={paginatedLogs}
        loading={loading}
        emptyMessage="No audit logs found"
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          itemsPerPage={itemsPerPage}
          totalItems={logs.length}
          className="mt-6"
        />
      )}
    </div>
  )
}