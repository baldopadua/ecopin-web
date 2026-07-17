'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchPublicReports } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import { Bar, Pie, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
)

const COLORS = ['#457113', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899']
const SATISFACTION_COLORS = ['#EF4444', '#F59E0B', '#EAB308', '#84CC16', '#22C55E']
const SATISFACTION_LABELS = ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied']

export default function DashboardPage() {
  const router = useRouter()
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    unresolved: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    waitingForFeedback: 0,
    resolvedToday: 0,
    avgResolutionTime: 'N/A',
    resolutionRate: 0,
    overdue: 0,
    avgSatisfaction: 'N/A',
    satisfactionTotal: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5)
  const [satisfactionData, setSatisfactionData] = useState(null)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchPublicReports()
        setReports(data)

        const total = data.length
        const unresolved = data.filter(r => r.status === 'unresolved').length
        const inProgress = data.filter(r => r.status === 'in_progress').length
        const resolved = data.filter(r => r.status === 'resolved').length
        const closed = data.filter(r => r.status === 'closed').length
        const waitingForFeedback = data.filter(r => r.status === 'waiting_for_feedback').length
        const overdue = data.filter(r => r.is_overdue).length

        // Calculate resolved today - check reports that were resolved today
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const resolvedToday = data.filter(r => {
          if (r.status !== 'resolved' && r.status !== 'closed') return false
          if (r.updated_at) {
            const updatedDate = new Date(r.updated_at)
            return updatedDate >= today && updatedDate < tomorrow
          }
          return false
        }).length

        // Calculate average resolution time (in hours or days)
        const resolvedReports = data.filter(r => r.status === 'resolved' && r.created_at && r.updated_at)
        let avgResolutionTime = 'N/A'
        if (resolvedReports.length > 0) {
          const totalHours = resolvedReports.reduce((sum, r) => {
            const created = new Date(r.created_at)
            const updated = new Date(r.updated_at)
            const hours = (updated - created) / (1000 * 60 * 60)
            return sum + hours
          }, 0)
          const avgHours = totalHours / resolvedReports.length
          if (avgHours < 24) {
            avgResolutionTime = `${Math.round(avgHours)}h`
          } else {
            avgResolutionTime = `${Math.round(avgHours / 24)}d`
          }
        }

        // Calculate resolution rate
        const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0

        // Fetch satisfaction data
        const { fetchSatisfactionAnalytics } = await import('@/lib/api')
        const satisfactionDataResult = await fetchSatisfactionAnalytics().catch(() => null)
        setSatisfactionData(satisfactionDataResult)

        setStats({
          total,
          unresolved,
          inProgress,
          resolved,
          closed,
          waitingForFeedback,
          resolvedToday,
          avgResolutionTime,
          resolutionRate,
          overdue,
          avgSatisfaction: satisfactionDataResult ? `${satisfactionDataResult.average.toFixed(1)}/5` : 'N/A',
          satisfactionTotal: satisfactionDataResult ? satisfactionDataResult.total : 0
        })
      } catch (error) {
        console.error('Failed to load dashboard stats:', error)
        setError('Failed to load dashboard data. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [])

  // Helper function to get week number
  function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
    return weekNo.toString().padStart(2, '0')
  }

  // Prepare data for reports per week bar chart
  const reportsPerWeek = () => {
    const weekMap = {}

    reports.forEach(report => {
      if (report.created_at) {
        const date = new Date(report.created_at)
        const weekNumber = getWeekNumber(date)
        const year = date.getFullYear()
        const key = `${year}-W${weekNumber}`

        weekMap[key] = (weekMap[key] || 0) + 1
      }
    })

    return Object.entries(weekMap)
      .map(([week, count]) => ({ week: `Week ${week.split('-W')[1]}`, count }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-8) // Last 8 weeks
  }

  // Prepare data for resolution rate bar chart (by week)
  const resolutionRateByWeek = () => {
    const weekMap = {}

    reports.forEach(report => {
      if (report.created_at) {
        const date = new Date(report.created_at)
        const weekNumber = getWeekNumber(date)
        const year = date.getFullYear()
        const key = `${year}-W${weekNumber}`

        if (!weekMap[key]) {
          weekMap[key] = { total: 0, resolved: 0 }
        }
        weekMap[key].total += 1
        if (report.status === 'resolved') {
          weekMap[key].resolved += 1
        }
      }
    })

    return Object.entries(weekMap)
      .map(([week, data]) => ({
        week: `Week ${week.split('-W')[1]}`,
        rate: data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0
      }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-8) // Last 8 weeks
  }

  // Prepare data for most active issue type pie chart
  const issueTypeData = () => {
    const typeMap = {}

    reports.forEach(report => {
      if (report.issue_type) {
        typeMap[report.issue_type] = (typeMap[report.issue_type] || 0) + 1
      }
    })

    return Object.entries(typeMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6) // Top 6 issue types
  }

  const chartData = reportsPerWeek()
  const resolutionRateData = resolutionRateByWeek()
  const pieData = issueTypeData()
  const satisfactionChartData = satisfactionData ? {
    labels: SATISFACTION_LABELS,
    datasets: [
      {
        data: Object.values(satisfactionData.distribution),
        backgroundColor: SATISFACTION_COLORS,
      }
    ]
  } : null

  console.log('Dashboard chart data:', { chartData, resolutionRateData, pieData })
  console.log('Loading state:', loading)
  console.log('Chart data length:', chartData.length)
  console.log('Reports length:', reports.length)
  console.log('Chart data values:', JSON.stringify(chartData))

  // Prepare Chart.js data formats
  const barChartData = {
    labels: chartData.map(d => d.week),
    datasets: [
      {
        label: 'Reports',
        data: chartData.map(d => d.count),
        backgroundColor: 'rgba(69, 113, 19, 0.8)',
        borderRadius: 4,
      }
    ]
  }

  const resolutionRateChartData = {
    labels: resolutionRateData.map(d => d.week),
    datasets: [
      {
        label: 'Resolution Rate (%)',
        data: resolutionRateData.map(d => d.rate),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 4,
      }
    ]
  }

  const pieChartData = {
    labels: pieData.map(d => d.name),
    datasets: [
      {
        data: pieData.map(d => d.value),
        backgroundColor: COLORS.slice(0, pieData.length),
      }
    ]
  }

  // Pagination
  const totalPages = Math.ceil(reports.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentReports = reports.slice(startIndex, endIndex)

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved': return 'bg-success/10 text-success border-success/30'
      case 'in_progress': return 'bg-warning/10 text-warning border-warning/30'
      case 'waiting_for_feedback': return 'bg-info/10 text-info border-info/30'
      case 'closed': return 'bg-surface text-text-muted border-border'
      case 'pending_owner_consent': return 'bg-warning/10 text-warning border-warning/30'
      default: return 'bg-error/10 text-error border-error/30'
    }
  }

  const getValidationColor = (validationStatus) => {
    switch (validationStatus) {
      case 'validated':
      case 'automatically_valid': return 'bg-success/10 text-success border-success/30'
      case 'pending':
      case 'pending_ai_validation': return 'bg-warning/10 text-warning border-warning/30'
      case 'manual_review':
      case 'Manual_Review': return 'bg-info/10 text-info border-info/30'
      case 'rejected': return 'bg-error/10 text-error border-error/30'
      default: return 'bg-surface text-text-muted border-border'
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Dashboard Overview"
        subtitle="Welcome to EcoPin Dashboard"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' }
        ]}
      />

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/30 text-error rounded-lg">
          {error}
        </div>
      )}

      {/* Statistics Cards - Quick Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card border-l-4 border-l-[var(--accent-green)] hover:shadow-lg transition-shadow cursor-pointer">
          <div className="mb-2">
            <span className="text-sm text-text-muted">Total Reports</span>
          </div>
          <p className="text-3xl font-bold text-text-primary">{loading ? '...' : stats.total}</p>
        </div>

        <div className="card border-l-4 border-l-[var(--error)] hover:shadow-lg transition-shadow cursor-pointer">
          <div className="mb-2">
            <span className="text-sm text-text-muted">Unresolved</span>
          </div>
          <p className="text-3xl font-bold text-text-primary">{loading ? '...' : stats.unresolved}</p>
        </div>

        <div className="card border-l-4 border-l-[var(--warning)] hover:shadow-lg transition-shadow cursor-pointer">
          <div className="mb-2">
            <span className="text-sm text-text-muted">In Progress</span>
          </div>
          <p className="text-3xl font-bold text-text-primary">{loading ? '...' : stats.inProgress}</p>
        </div>

        <div className="card border-l-4 border-l-[var(--success)] hover:shadow-lg transition-shadow cursor-pointer">
          <div className="mb-2">
            <span className="text-sm text-text-muted">Resolved Today</span>
          </div>
          <p className="text-3xl font-bold text-text-primary">{loading ? '...' : stats.resolvedToday}</p>
        </div>
      </div>

      <div className="flex justify-end mb-6">
        <button
          onClick={() => router.push('/dashboard/analytics')}
          className="btn-primary"
        >
          View Analytics
        </button>
      </div>

      {/* Reports Table */}
      <div className="card no-hover">
        <h2 className="text-xl font-bold text-text-primary mb-6">All Reports</h2>
        {loading ? (
          <div className="text-center py-8 text-text-muted">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="text-center py-8 text-text-muted">No reports available</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Title</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Issue Type</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Validation</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Created</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-text-primary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentReports.map((report) => (
                    <tr key={report.id} className="border-b border-border hover:bg-surface transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-text-primary">{report.title}</div>
                        <div className="text-sm text-text-muted line-clamp-1">{report.description}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-text-secondary">{report.issue_type || 'General'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(report.status)}`}>
                          {report.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold border ${getValidationColor(report.validation_status)}`}>
                          {report.validation_status === 'validated' ? 'AI VALIDATED' : report.validation_status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-text-muted">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => router.push(`/dashboard/reports/${report.id}`)}
                          className="text-sm text-accent-green hover:text-accent-green-dark font-medium"
                        >
                          View Details
                        </button>
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
                  Showing {startIndex + 1} to {Math.min(endIndex, reports.length)} of {reports.length} reports
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
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
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 rounded ${currentPage === pageNum ? 'btn-primary' : 'btn-secondary'}`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
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