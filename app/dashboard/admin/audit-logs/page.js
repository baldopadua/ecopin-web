'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { getAuditLogs } from '@/lib/api/admin'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import { AdminGuard } from '@/components/auth/RequireRole'
import ExportButton from '@/components/ui/ExportButton'

function formatEventDetails(data) {
  if (!data || typeof data !== 'object') return '—'
  const keys = Object.keys(data)
  if (keys.length === 0) return '—'
  
  return keys
    .slice(0, 3)
    .map(k => {
      const val = data[k]
      const displayVal = typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val)
      return `${k.replace(/_/g, ' ')}: ${displayVal}`
    })
    .join(' | ')
}

export default function AuditLogs() {
  const router = useRouter()
  const [allLogs, setAllLogs] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ 
    search: '', 
    event_type: '', 
    entity_type: '', 
    start_date: '', 
    end_date: '' 
  })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAuditLogs({ limit: 500 })
      setAllLogs(data.logs || data.data || [])
    } catch (err) {
      console.error('Failed to load audit logs:', err)
      setError(err.message || 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = allLogs

    if (filters.search) {
      const term = filters.search.toLowerCase()
      filtered = filtered.filter(log =>
        (log.user_name || '').toLowerCase().includes(term) ||
        (log.user_id || '').toLowerCase().includes(term) ||
        (log.event_type || '').toLowerCase().includes(term) ||
        (log.entity_type || '').toLowerCase().includes(term) ||
        (log.entity_id || '').toLowerCase().includes(term) ||
        JSON.stringify(log.event_data || {}).toLowerCase().includes(term)
      )
    }

    if (filters.event_type) {
      filtered = filtered.filter(log => log.event_type === filters.event_type)
    }

    if (filters.entity_type) {
      filtered = filtered.filter(log => log.entity_type === filters.entity_type)
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
    setFilters({ search: '', event_type: '', entity_type: '', start_date: '', end_date: '' })
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
  }

  const tableColumns = [
    { 
      key: 'created_at', 
      label: 'Timestamp', 
      width: '18%',
      render: (value) => (
        <span className="text-xs font-mono text-text-muted">{formatDate(value)}</span>
      )
    },
    { 
      key: 'user_name', 
      label: 'Who', 
      width: '18%',
      render: (value, row) => (
        <div>
          <p className="font-semibold text-text-primary text-sm">
            {value || row.user_id || 'System'}
          </p>
          {row.user_id && row.user_id !== 'system' && row.user_id !== 'admin' && (
            <p className="text-[10px] font-mono text-text-muted">
              {row.user_id.slice(0, 8)}
            </p>
          )}
        </div>
      )
    },
    { 
      key: 'event_type', 
      label: 'What (Action)', 
      width: '20%',
      render: (value) => (
        <span className="inline-block px-2 py-0.5 text-xs font-mono font-bold tracking-tight bg-accent-blue/10 text-accent-blue border border-accent-blue/30 rounded">
          {value ? value.replace(/_/g, ' ') : 'EVENT'}
        </span>
      )
    },
    { 
      key: 'entity_type', 
      label: 'Target', 
      width: '18%',
      render: (value, row) => (
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
            {value || 'GENERAL'}
          </span>
          {row.entity_id && (
            <p className="text-[10px] font-mono text-text-muted truncate max-w-[120px]" title={row.entity_id}>
              {row.entity_id.length > 12 ? `${row.entity_id.slice(0, 8)}...` : row.entity_id}
            </p>
          )}
        </div>
      )
    },
    { 
      key: 'event_data', 
      label: 'Details', 
      width: '26%',
      render: (value) => (
        <span className="text-xs font-mono text-text-secondary line-clamp-2" title={JSON.stringify(value, null, 2)}>
          {formatEventDetails(value)}
        </span>
      )
    }
  ]

  // Extract unique events and entity types for filters
  const uniqueEventTypes = [...new Set((allLogs || []).map(l => l.event_type).filter(Boolean))]
  const uniqueEntityTypes = [...new Set((allLogs || []).map(l => l.entity_type).filter(Boolean))]

  return (
    <AdminGuard>
      <div className="p-8">
        <PageHeader
          title="Audit Logs"
          subtitle="Operational audit trail of actions, entity changes, and system events"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Admin', href: '/dashboard/admin' },
            { label: 'Audit Logs' }
          ]}
        >
          <ExportButton 
            data={logs.map(l => ({
              Timestamp: l.created_at,
              Actor: l.user_name || l.user_id,
              Event: l.event_type,
              TargetType: l.entity_type,
              TargetId: l.entity_id,
              Details: JSON.stringify(l.event_data || {})
            }))} 
            filename="audit_logs.csv" 
            className="text-xs tracking-widest bg-surface-elevated" 
          />
        </PageHeader>

        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error/30 text-error flex justify-between items-center rounded">
            <div>
              <p className="font-bold text-sm">Failed to load audit logs</p>
              <p className="text-xs">{error}</p>
            </div>
            <button
              onClick={loadLogs}
              className="btn-secondary py-1 px-3 text-xs font-bold uppercase tracking-wider"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filters */}
        <FilterBar
          searchPlaceholder="Search by actor, target, or details..."
          searchValue={filters.search}
          onSearchChange={(val) => setFilters(prev => ({ ...prev, search: val }))}
          filters={[
            {
              label: 'All Events',
              value: filters.event_type,
              onChange: (val) => setFilters(prev => ({ ...prev, event_type: val })),
              options: [
                { value: '', label: 'All Events' },
                ...uniqueEventTypes.map(e => ({ value: e, label: e.replace(/_/g, ' ') }))
              ]
            },
            {
              label: 'All Targets',
              value: filters.entity_type,
              onChange: (val) => setFilters(prev => ({ ...prev, entity_type: val })),
              options: [
                { value: '', label: 'All Targets' },
                ...uniqueEntityTypes.map(t => ({ value: t, label: t }))
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
    </AdminGuard>
  )
}