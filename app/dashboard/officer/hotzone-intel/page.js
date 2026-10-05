'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchClusters, generateClusters } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import { OfficerGuard } from '@/components/auth/RequireRole'
import { Target, Map as MapIcon, List } from 'lucide-react'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Pagination from '@/components/ui/Pagination'
export default function ClustersPage() {
  const [clusters, setClusters] = useState([])
  const [filteredClusters, setFilteredClusters] = useState([])
  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  
  // List view states
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6
  
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      try {
        const clustersData = await fetchClusters()
        const severityRank = { high: 3, medium: 2, low: 1 }
        const sorted = (clustersData || []).sort((a, b) => {
          const rankA = severityRank[a.severity] || 0
          const rankB = severityRank[b.severity] || 0
          if (rankA !== rankB) return rankB - rankA
          return (b.report_count || 0) - (a.report_count || 0)
        })
        setClusters(sorted)
        setFilteredClusters(sorted)
      } catch (error) {
        console.error('Error fetching clusters:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      await generateClusters()
      const clustersData = await fetchClusters()
      const severityRank = { high: 3, medium: 2, low: 1 }
      const sorted = (clustersData || []).sort((a, b) => {
        const rankA = severityRank[a.severity] || 0
        const rankB = severityRank[b.severity] || 0
        if (rankA !== rankB) return rankB - rankA
        return (b.report_count || 0) - (a.report_count || 0)
      })
      setClusters(sorted)
      setFilteredClusters(sorted)
    } catch (error) {
      console.error('Error generating clusters:', error)
      alert('Failed to generate clusters: ' + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    let result = clusters

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c => {
        const generatedLabel = `cluster ${c.id.slice(0,6)}`.toLowerCase()
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
      // If status is null/undefined in DB, it implies unresolved
      if (statusFilter === 'unresolved') result = result.filter(c => !c.status || c.status === 'unresolved')
      else result = result.filter(c => c.status === statusFilter)
    }

    setFilteredClusters(result)
    setCurrentPage(1)
  }, [searchQuery, typeFilter, severityFilter, statusFilter, clusters])

  // Top 3 Critical Hotzones (always based on unfiltered data)
  const criticalClusters = clusters
    .filter(c => c.severity === 'high')
    .slice(0, 3)

  // Derived filters
  const issueTypes = [...new Set(clusters.map(c => c.issue_type).filter(Boolean))]

  const handleResetFilters = () => {
    setSearchQuery('')
    setTypeFilter('all')
    setSeverityFilter('all')
    setStatusFilter('all')
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredClusters.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedClusters = filteredClusters.slice(startIndex, startIndex + itemsPerPage)

  const listColumns = [
    { 
      key: 'label', 
      label: 'Cluster ID / Label', 
      width: '20%',
      render: (val, row) => (
        <div>
          <div className="font-bold">{val || `Cluster ${row.id.slice(0,6)}`}</div>
          <div className="text-[10px] font-mono text-text-muted">{row.id}</div>
        </div>
      )
    },
    { key: 'issue_type', label: 'Pollution Type', width: '20%' },
    { 
      key: 'severity', 
      label: 'Severity', 
      width: '15%',
      render: (val) => (
        <span className={`font-bold uppercase tracking-widest text-xs ${val === 'high' ? 'text-error' : val === 'medium' ? 'text-warning' : 'text-info'}`}>
          {val || 'UNKNOWN'}
        </span>
      )
    },
    { 
      key: 'report_count', 
      label: 'Total Reports', 
      width: '10%',
      render: (val, row) => row.reports?.length || row.report_ids?.length || val || 0
    },
    { 
      key: 'radius_meters', 
      label: 'Radius', 
      width: '10%',
      render: (val) => `${Math.round(val || 50)}m`
    },
    {
      key: 'status',
      label: 'Status',
      width: '10%',
      render: (val) => {
        let label = val || 'UNRESOLVED'
        let subLabel = '(New)'
        if (label === 'unresolved') subLabel = '(New)'
        else if (label === 'in_progress') { label = 'IN PROGRESS'; subLabel = '(Scheduled/Prioritized)' }
        else if (label === 'resolved') { label = 'RESOLVED'; subLabel = '(Completed)' }
        
        return (
          <div className="flex flex-col">
            <span className="uppercase text-[10px] font-bold font-mono tracking-widest text-text-secondary">{label}</span>
            <span className="text-[9px] text-text-muted">{subLabel}</span>
          </div>
        )
      }
    }
  ]

  return (
    <OfficerGuard>
      <div className="p-8 h-[calc(100vh-64px)] flex flex-col">
        <PageHeader
          title="Hotzone Intel"
          subtitle="Spatial intelligence and cluster mapping"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard/officer' },
            { label: 'Hotzone Intel' }
          ]}
        >
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-accent-green disabled:bg-gray-500 text-white font-mono font-bold uppercase tracking-widest border border-border rounded-xl shadow-sm dark:shadow-[2px_2px_0px_0px_#333333] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all px-6 py-3 flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border border-border border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Hotzones'
            )}
          </button>
        </PageHeader>

        <div className="flex-1 flex flex-col pb-8">
            <FilterBar
              searchPlaceholder="Search clusters by ID or label..."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              filters={[
                {
                  label: 'Pollution Type',
                  value: typeFilter,
                  onChange: setTypeFilter,
                  options: [
                    { value: 'all', label: 'All Types' },
                    ...issueTypes.map(type => ({ value: type, label: type }))
                  ]
                },
                {
                  label: 'Severity',
                  value: severityFilter,
                  onChange: setSeverityFilter,
                  options: [
                    { value: 'all', label: 'All Severities' },
                    { value: 'high', label: 'High (70+)' },
                    { value: 'medium', label: 'Medium (30-69)' },
                    { value: 'low', label: 'Low (<30)' }
                  ]
                },
                {
                  label: 'Status',
                  value: statusFilter,
                  onChange: setStatusFilter,
                  options: [
                    { value: 'all', label: 'All Statuses' },
                    { value: 'unresolved', label: 'Unresolved (New)' },
                    { value: 'in_progress', label: 'In Progress (Scheduled/Prioritized)' },
                    { value: 'resolved', label: 'Resolved (Completed)' }
                  ]
                }
              ]}
              onReset={handleResetFilters}
              resultsCount={filteredClusters.length}
              loading={loading}
            />

            <div className="flex-1 flex flex-col min-h-0">
              <DataTable 
                columns={listColumns}
                data={paginatedClusters}
                loading={loading}
                emptyMessage="No hotzones match your filters."
                onRowClick={(row) => router.push(`/dashboard/officer/hotzone-intel/${row.id}`)}
                className="flex-1 min-h-0"
              />
              
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredClusters.length}
                  className="mt-6"
                />
              )}
            </div>
          </div>
      </div>
    </OfficerGuard>
  )
}