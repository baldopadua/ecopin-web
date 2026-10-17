'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import { getAuditLogs, getAuditArchiveStatus, executeAuditArchive } from '@/lib/api/admin'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import StatusBadge from '@/components/ui/StatusBadge'
import { AdminGuard } from '@/components/auth/RequireRole'
import ExportButton from '@/components/ui/ExportButton'
import { reportDiagnostic } from '../../../../lib/diagnostics.mjs';
import { ShieldCheck, Lock, Archive, CheckCircle2 } from 'lucide-react';

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

function AuditLogsContent() {
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
  const [archiveStatus, setArchiveStatus] = useState(null)
  const [archiving, setArchiving] = useState(false)
  const [archiveResult, setArchiveResult] = useState(null)
  const itemsPerPage = 8

  useEffect(() => {
    loadLogs()
    loadArchiveStatus()
  }, [])

  const loadArchiveStatus = async () => {
    try {
      const status = await getAuditArchiveStatus()
      setArchiveStatus(status)
    } catch {
      setArchiveStatus({
        total_records: null,
        eligible_for_archival: 0,
        immutability_policy: 'active',
        hot_retention_days: 180,
        worm_retention_years: 7
      })
    }
  }

  const handleArchive = async () => {
    try {
      setArchiving(true)
      const res = await executeAuditArchive({ limit: 1000 })
      setArchiveResult(res.manifest)
      await loadArchiveStatus()
      await loadLogs()
    } catch (err) {
      reportDiagnostic('error', 'admin', 'Failed to archive audit logs:', err)
      setError(err.message || 'Failed to execute audit archival')
    } finally {
      setArchiving(false)
    }
  }

  const loadLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAuditLogs({ limit: 500 })
      setAllLogs(data.logs || data.data || [])
    } catch (err) {
      reportDiagnostic('error', 'admin', 'Failed to load audit logs:', err)
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

        {/* WORM & Immutability Compliance Banner */}
        <div className="mb-6 p-4 bg-surface-elevated border border-border-subtle rounded-lg flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-green/10 border border-accent-green/30 rounded text-accent-green">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text-primary">Immutability Triggers Active</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold bg-accent-green/20 text-accent-green rounded-full">
                  <Lock size={10} /> prevent_audit_modification
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Append-only enforcement on PostgreSQL audit tables rejecting UPDATE and DELETE. Hot retention: 180 days · Cold WORM archival: 7 years.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-text-muted">
            {archiveStatus && (
              <div className="text-right">
                <p className="text-text-primary font-semibold">{archiveStatus.total_records ?? allLogs.length} Records in Hot Store</p>
                <p className="text-[11px] text-text-muted">{archiveStatus.eligible_for_archival ?? 0} eligible for WORM archival</p>
              </div>
            )}
            {archiveStatus?.eligible_for_archival > 0 && (
              <button
                onClick={handleArchive}
                disabled={archiving}
                className="btn-secondary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Archive size={14} />
                {archiving ? 'Sealing...' : 'Seal WORM Batch'}
              </button>
            )}
          </div>
        </div>

        {archiveResult && (
          <div className="mb-6 p-4 bg-accent-green/10 border border-accent-green/30 text-accent-green rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono">
              <CheckCircle2 size={16} />
              <span>
                Archived {archiveResult.record_count} records. WORM Seal SHA256: {archiveResult.payload_sha256?.slice(0, 16)}... (Retain until {archiveResult.worm_retention_until ? new Date(archiveResult.worm_retention_until).toLocaleDateString() : '7 years'})
              </span>
            </div>
            <button
              onClick={() => setArchiveResult(null)}
              className="text-xs font-bold underline ml-4 cursor-pointer"
            >
              Dismiss
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
  )
}
export default function AuditLogs() {
  return (
    <AdminGuard>
      <AuditLogsContent />
    </AdminGuard>
  )
}
