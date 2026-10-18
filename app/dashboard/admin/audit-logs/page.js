'use client'
import { useEffect, useMemo, useState } from 'react'
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
import styles from './AuditLogs.module.css'

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
  const [allLogs, setAllLogs] = useState([])
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

  useEffect(() => {
    queueMicrotask(() => {
      void loadLogs()
      void loadArchiveStatus()
    })
  }, [])

  const logs = useMemo(() => {
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

    return filtered
  }, [filters, allLogs])

  const totalPages = Math.ceil(logs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLogs = logs.slice(startIndex, endIndex)

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleFilterUpdate = (updater) => {
    setFilters(updater)
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    handleFilterUpdate({ search: '', event_type: '', entity_type: '', start_date: '', end_date: '' })
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
        <span className="text-xs text-text-secondary whitespace-nowrap">{formatDate(value)}</span>
      )
    },
    { 
      key: 'user_name', 
      label: 'Actor', 
      width: '18%',
      render: (value, row) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-text-primary text-xs truncate max-w-[140px]" title={value || row.user_id || 'System'}>
            {value || row.user_id || 'System'}
          </span>
          {row.user_id && row.user_id !== 'system' && row.user_id !== 'admin' && (
            <span className="text-xs font-mono text-text-muted">
              {row.user_id.slice(0, 8)}
            </span>
          )}
        </div>
      )
    },
    { 
      key: 'event_type', 
      label: 'Action', 
      width: '18%',
      render: (value) => (
        <span className={styles.actionBadge}>
          {value ? value.replace(/_/g, ' ') : 'Event'}
        </span>
      )
    },
    { 
      key: 'entity_type', 
      label: 'Target', 
      width: '18%',
      render: (value, row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-text-primary capitalize">
            {value ? value.replace(/_/g, ' ') : 'General'}
          </span>
          {row.entity_id && (
            <span className="text-xs font-mono text-text-muted truncate max-w-[120px]" title={row.entity_id}>
              {row.entity_id.length > 12 ? `${row.entity_id.slice(0, 8)}…` : row.entity_id}
            </span>
          )}
        </div>
      )
    },
    { 
      key: 'event_data', 
      label: 'Details', 
      width: '28%',
      render: (value) => (
        <span className="text-xs font-mono text-text-secondary truncate block max-w-[320px]" title={JSON.stringify(value, null, 2)}>
          {formatEventDetails(value)}
        </span>
      )
    }
  ]

  // Extract unique events and entity types for filters
  const uniqueEventTypes = [...new Set((allLogs || []).map(l => l.event_type).filter(Boolean))]
  const uniqueEntityTypes = [...new Set((allLogs || []).map(l => l.entity_type).filter(Boolean))]

  return (
    <div className={styles.page}>
      <PageHeader
        title="Audit logs"
        subtitle="Operational audit trail of actions, entity changes, and system events."
        breadcrumbs={[
          { label: 'Admin', href: '/dashboard/admin' },
          { label: 'Audit logs' }
        ]}
        className={styles.pageHeader}
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
        />
      </PageHeader>

      {error && (
        <div className={styles.errorBanner} role="alert">
          <div>
            <p className="font-semibold text-xs">Failed to load audit logs</p>
            <p className="text-xs opacity-90">{error}</p>
          </div>
          <button
            type="button"
            onClick={loadLogs}
            className={styles.retryBtn}
          >
            Retry
          </button>
        </div>
      )}

      {/* WORM & Immutability Compliance Banner */}
      <div className={styles.wormBanner}>
        <div className={styles.wormLeft}>
          <div className={styles.wormIconBox}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className={styles.wormTitleRow}>
              <span className={styles.wormTitle}>Immutability triggers active</span>
              <span className={styles.wormBadge}>
                <Lock size={10} /> prevent_audit_modification
              </span>
            </div>
            <p className={styles.wormSubtitle}>
              Append-only enforcement on PostgreSQL audit tables rejecting UPDATE and DELETE. Hot retention: 180 days · Cold WORM archival: 7 years.
            </p>
          </div>
        </div>
        <div className={styles.wormRight}>
          {archiveStatus && (
            <div className={styles.wormStats}>
              <span className={styles.wormStatMain}>{archiveStatus.total_records ?? allLogs.length} records in hot store</span>
              <span className={styles.wormStatSub}>{archiveStatus.eligible_for_archival ?? 0} eligible for WORM archival</span>
            </div>
          )}
          {archiveStatus?.eligible_for_archival > 0 && (
            <button
              type="button"
              onClick={handleArchive}
              disabled={archiving}
              className={styles.sealBtn}
            >
              <Archive size={13} />
              <span>{archiving ? 'Sealing…' : 'Seal WORM batch'}</span>
            </button>
          )}
        </div>
      </div>

      {archiveResult && (
        <div className="p-3 bg-accent-green/10 border border-accent-green/30 text-accent-green rounded-xl flex items-center justify-between text-xs flex-shrink-0">
          <div className="flex items-center gap-2 font-mono">
            <CheckCircle2 size={15} />
            <span>
              Archived {archiveResult.record_count} records. WORM Seal SHA256: {archiveResult.payload_sha256?.slice(0, 16)}… (Retain until {archiveResult.worm_retention_until ? new Date(archiveResult.worm_retention_until).toLocaleDateString() : '7 years'})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setArchiveResult(null)}
            className="text-xs font-semibold underline ml-4 cursor-pointer hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <FilterBar
        searchPlaceholder="Search by actor, target, or details…"
        searchValue={filters.search}
        onSearchChange={(val) => handleFilterUpdate(prev => ({ ...prev, search: val }))}
        filters={[
          {
            label: 'All events',
            value: filters.event_type,
            onChange: (val) => handleFilterUpdate(prev => ({ ...prev, event_type: val })),
            options: [
              { value: '', label: 'All events' },
              ...uniqueEventTypes.map(e => ({ value: e, label: e.replace(/_/g, ' ') }))
            ]
          },
          {
            label: 'All targets',
            value: filters.entity_type,
            onChange: (val) => handleFilterUpdate(prev => ({ ...prev, entity_type: val })),
            options: [
              { value: '', label: 'All targets' },
              ...uniqueEntityTypes.map(t => ({ value: t, label: t.replace(/_/g, ' ') }))
            ]
          }
        ]}
        showDateRange={true}
        dateRange={{ start: filters.start_date, end: filters.end_date }}
        onDateRangeChange={(range) => handleFilterUpdate(prev => ({ ...prev, start_date: range.start, end_date: range.end }))}
        onReset={handleResetFilters}
        resultsCount={logs.length}
        loading={loading}
        sticky={false}
        className={styles.filterBar}
      />

      {/* Logs Table Workspace */}
      <div className={styles.tableWorkspace}>
        <div className={styles.tableContainer}>
          <DataTable
            columns={tableColumns}
            data={paginatedLogs}
            loading={loading}
            emptyMessage="No audit logs found"
          />
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              itemsPerPage={itemsPerPage}
              totalItems={logs.length}
            />
          </div>
        )}
      </div>
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
