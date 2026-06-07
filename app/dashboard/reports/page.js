'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchFilteredReports, fetchIssueTypes } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'

export default function ReportsPage() {
  const [reports, setReports] = useState([])
  const [filteredReports, setFilteredReports] = useState([])
  const [issueTypes, setIssueTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [validationFilter, setValidationFilter] = useState('all')

  useEffect(() => {
    Promise.all([
      fetchFilteredReports(),
      fetchIssueTypes()
    ]).then(([reportsData, typesData]) => {
      setReports(reportsData)
      setFilteredReports(reportsData)
      setIssueTypes(typesData)
      setLoading(false)
    })
  }, [])

  // Apply filters
  useEffect(() => {
    let filtered = reports

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r => 
        (r.title && r.title.toLowerCase().includes(query)) ||
        (r.description && r.description.toLowerCase().includes(query))
      )
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(r => r.issue_type === typeFilter)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter)
    }

    if (validationFilter !== 'all') {
      filtered = filtered.filter(r => r.validation_status === validationFilter)
    }

    setFilteredReports(filtered)
  }, [searchQuery, typeFilter, statusFilter, validationFilter, reports])

  const handleRowClick = (reportId) => {
    router.push(`/dashboard/reports/${reportId}`)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-red-100 text-red-800'
    }
  }

  const getValidationColor = (status) => {
    switch (status) {
      case 'validated':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-gray-100 text-gray-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-8">
      <PageHeader 
        title="Reports"
        subtitle="View and manage environmental reports"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports' }
        ]}
      />

      {/* Search and Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-secondary mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
            />
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Types</option>
              {issueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Status</option>
              <option value="unresolved">Unresolved</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          {/* Validation Filter */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Validation</label>
            <select
              value={validationFilter}
              onChange={(e) => setValidationFilter(e.target.value)}
              className="input"
            >
              <option value="all">All Validation</option>
              <option value="validated">Validated</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-text-secondary">
            {loading ? 'Loading...' : `${filteredReports.length} of ${reports.length} reports displayed`}
          </p>
        </div>
      </div>

      {/* Reports List */}
      <div className="card">
        <h2 className="text-xl font-bold text-text-primary mb-4">Reports List</h2>
        {loading ? (
          <p className="text-text-muted">Loading reports...</p>
        ) : filteredReports.length === 0 ? (
          <p className="text-text-muted">No reports match your filters</p>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div 
                key={report.id} 
                className="p-4 border border-border rounded-lg hover:bg-surface cursor-pointer transition-colors"
                onClick={() => handleRowClick(report.id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text-primary">{report.title}</h3>
                    <p className="text-text-secondary mt-1 line-clamp-2">{report.description}</p>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm">
                      <span className="text-text-muted">Type: {report.issue_type || 'N/A'}</span>
                      <span className="text-text-muted">
                        Date: {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                      {report.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getValidationColor(report.validation_status)}`}>
                      {report.validation_status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
