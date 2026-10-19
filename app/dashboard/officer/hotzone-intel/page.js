'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useDashboardClusters } from '@/components/context/DashboardQueryProvider'
import PageHeader from '@/components/layout/PageHeader'
import { OfficerGuard } from '@/components/auth/RequireRole'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
import useTablePageSize from '@/components/ui/useTablePageSize'
import styles from './HotzoneIntel.module.css'

export default function ClustersPage() {
  const clusterQuery = useDashboardClusters()
  const loading = clusterQuery.isPending
  const clusters = useMemo(() => {
    const severityRank = { high: 3, medium: 2, low: 1 }
    return (clusterQuery.data || []).filter(c => c.report_count > 0).sort((a, b) =>
      (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0) || (b.report_count || 0) - (a.report_count || 0)
    )
  }, [clusterQuery.data])
  
  // List view states
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const { containerRef, pageSize: itemsPerPage } = useTablePageSize({ resetKey: `${searchQuery}|${typeFilter}|${severityFilter}|${statusFilter}` })
  
  const router = useRouter()

  const filteredClusters = useMemo(() => {
    let result = clusters

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c => {
        const generatedLabel = `cluster ${c.id.slice(0, 6)}`.toLowerCase()
        return (c.label && c.label.toLowerCase().includes(q)) || 
               c.id.toLowerCase().includes(q) ||
               generatedLabel.includes(q)
      })
    }

    if (typeFilter !== 'all') {
      result = result.filter(c => c.issue_type === typeFilter)
    }

    if (severityFilter !== 'all') {
      result = result.filter(c => c.severity === severityFilter)
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'unresolved') result = result.filter(c => !c.status || c.status === 'unresolved')
      else result = result.filter(c => c.status === statusFilter)
    }

    return result
  }, [searchQuery, typeFilter, severityFilter, statusFilter, clusters])

  // Derived filters
  const issueTypes = useMemo(() => [...new Set(clusters.map(c => c.issue_type).filter(Boolean))], [clusters])

  const handleResetFilters = () => {
    setSearchQuery('')
    setTypeFilter('all')
    setSeverityFilter('all')
    setStatusFilter('all')
    setCurrentPage(1)
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredClusters.length / itemsPerPage) || 1
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * itemsPerPage
  const paginatedClusters = filteredClusters.slice(startIndex, startIndex + itemsPerPage)

  const listColumns = [
    { 
      key: 'label', 
      label: 'Cluster ID / Label', 
      width: '24%',
      render: (val, row) => (
        <div>
          <div className={styles.clusterTitle}>{val || `Cluster ${row.id.slice(0, 6)}`}</div>
          <div className={styles.clusterId}>{row.id}</div>
        </div>
      )
    },
    { 
      key: 'issue_type', 
      label: 'Pollution type', 
      width: '20%',
      render: (val) => <span className="capitalize">{val ? val.replaceAll('_', ' ') : 'General'}</span>
    },
    { 
      key: 'severity', 
      label: 'Severity', 
      width: '14%',
      render: (val) => {
        const tone = val === 'high' ? styles.severityHigh : val === 'medium' ? styles.severityMedium : styles.severityLow
        return (
          <span className={`${styles.severityBadge} ${tone}`}>
            {val ? val.charAt(0).toUpperCase() + val.slice(1).toLowerCase() : 'Unknown'}
          </span>
        )
      }
    },
    { 
      key: 'report_count', 
      label: 'Reports', 
      width: '12%',
      render: (val, row) => row.reports?.length || row.report_ids?.length || val || 0
    },
    { 
      key: 'radius_meters', 
      label: 'Radius', 
      width: '12%',
      render: (val) => `${Math.round(val || 50)}m`
    },
    {
      key: 'status',
      label: 'Status',
      width: '18%',
      render: (val) => {
        let label = 'Unresolved'
        let subLabel = 'New'
        if (val === 'in_progress') { label = 'In progress'; subLabel = 'Scheduled' }
        else if (val === 'resolved') { label = 'Resolved'; subLabel = 'Completed' }
        
        return (
          <div className={styles.statusWrapper}>
            <span className={styles.statusText}>{label}</span>
            <span className={styles.statusSub}>({subLabel})</span>
          </div>
        )
      }
    }
  ]

  return (
    <OfficerGuard>
      <div className={`workspace-page ${styles.page}`}>
        <PageHeader
          title="Hotzone Intel"
          subtitle="Spatial intelligence and cluster mapping"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard/officer' },
            { label: 'Hotzone Intel' }
          ]}
        />

        <FilterBar
          searchPlaceholder="Search clusters by ID or label..."
          searchValue={searchQuery}
          onSearchChange={val => { setSearchQuery(val); setCurrentPage(1) }}
          filters={[
            {
              label: 'Pollution type',
              value: typeFilter,
              onChange: val => { setTypeFilter(val); setCurrentPage(1) },
              options: [
                { value: 'all', label: 'All types' },
                ...issueTypes.map(type => ({ value: type, label: type.replaceAll('_', ' ') }))
              ]
            },
            {
              label: 'Severity',
              value: severityFilter,
              onChange: val => { setSeverityFilter(val); setCurrentPage(1) },
              options: [
                { value: 'all', label: 'All severities' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' }
              ]
            },
            {
              label: 'Status',
              value: statusFilter,
              onChange: val => { setStatusFilter(val); setCurrentPage(1) },
              options: [
                { value: 'all', label: 'All statuses' },
                { value: 'unresolved', label: 'Unresolved' },
                { value: 'in_progress', label: 'In progress' },
                { value: 'resolved', label: 'Resolved' }
              ]
            }
          ]}
          onReset={handleResetFilters}
          resultsCount={filteredClusters.length}
          loading={loading}
          sticky={false}
        />

        <div className={`workspace-fill ${styles.tableWorkspace}`}>
          {clusterQuery.isError && <div role="alert">
            Hotzones could not refresh. Previously loaded hotzones remain below if available.
            <button type="button" onClick={() => { void clusterQuery.refetch() }}>Try again</button>
          </div>}
          {(!clusterQuery.isError || clusterQuery.data) && <>
          <div ref={containerRef} className={styles.tableViewport}>
          <DataTable 
            columns={listColumns}
            data={paginatedClusters}
            loading={loading}
            emptyMessage="No hotzones match your filters."
            onRowClick={(row) => router.push(`/dashboard/officer/hotzone-intel/${row.id}`)}
            rowActionLabel={(row) => `Open ${row.label || `cluster ${row.id.slice(0, 6)}`} details`}
            className={styles.tableContainer}
            caption="Hotzone clusters"
          />
          </div>
          
          {totalPages > 1 && (
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredClusters.length}
              className={styles.pagination}
            />
          )}
          </>}
        </div>
      </div>
    </OfficerGuard>
  )
}
