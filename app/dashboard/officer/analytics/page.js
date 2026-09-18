'use client'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { fetchPublicReports, fetchSatisfactionAnalytics } from '@/lib/api'
import { SkeletonLine, SkeletonStatCard, SkeletonChartCard } from '@/components/ui/Skeleton'
import { OfficerGuard } from '@/components/auth/RequireRole'
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

const COLORS = ['#6B8F4A', '#D4A843', '#C75050', '#6A9BD8', '#A78BDA', '#D68AB8']
const SATISFACTION_COLORS = ['#C75050', '#D4A843', '#D4C76A', '#8FBF5A', '#6BBF6B']
const SATISFACTION_LABELS = ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied']

export default function AnalyticsPage() {
  const [reports, setReports] = useState([])
  const [satisfactionData, setSatisfactionData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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
    overdue: 0
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const [reportsData, satisfactionDataResult] = await Promise.all([
          fetchPublicReports(),
          fetchSatisfactionAnalytics().catch(() => null)
        ])
        setReports(reportsData)
        setSatisfactionData(satisfactionDataResult)

        const total = reportsData.length
        const unresolved = reportsData.filter(r => r.status === 'unresolved').length
        const inProgress = reportsData.filter(r => r.status === 'in_progress').length
        const resolved = reportsData.filter(r => r.status === 'resolved').length
        const closed = reportsData.filter(r => r.status === 'closed').length
        const waitingForFeedback = reportsData.filter(r => r.status === 'waiting_for_feedback').length
        const overdue = reportsData.filter(r => r.is_overdue).length

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const resolvedToday = reportsData.filter(r => {
          if (r.status !== 'resolved' && r.status !== 'closed') return false
          if (r.updated_at) {
            const updatedDate = new Date(r.updated_at)
            return updatedDate >= today && updatedDate < tomorrow
          }
          return false
        }).length

        const resolvedReports = reportsData.filter(r => (r.status === 'resolved' || r.status === 'closed') && r.created_at && r.updated_at)
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

        const resolutionRate = total > 0 ? Math.round(((resolved + closed) / total) * 100) : 0

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
          overdue
        })
      } catch (error) {
        console.error('Failed to load analytics data:', error)
        setError('Failed to load analytics data. Please try again.')
        setReports([])
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Helper function to get week number
  function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
    return weekNo.toString().padStart(2, '0')
  }

  // Prepare data for weekly report volume bar chart
  const weeklyReportVolume = () => {
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
      .slice(-12) // Last 12 weeks
  }

  // Prepare data for reports by issue type pie chart
  const reportsByIssueType = () => {
    const typeMap = {}

    reports.forEach(report => {
      if (report.issue_type) {
        typeMap[report.issue_type] = (typeMap[report.issue_type] || 0) + 1
      }
    })

    return Object.entries(typeMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8) // Top 8 issue types
  }

  // Prepare data for resolution rate over time line chart
  const resolutionRateOverTime = () => {
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
        if (report.status === 'resolved' || report.status === 'closed') {
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
      .slice(-12) // Last 12 weeks
  }

  // Prepare data for reports by status pie chart
  const reportsByStatus = () => {
    const statusMap = {}

    reports.forEach(report => {
      if (report.status) {
        statusMap[report.status] = (statusMap[report.status] || 0) + 1
      }
    })

    return Object.entries(statusMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }

  const weeklyVolumeData = weeklyReportVolume()
  const issueTypeData = reportsByIssueType()
  const resolutionRateData = resolutionRateOverTime()
  const statusData = reportsByStatus()

  // Prepare Chart.js data formats
  const weeklyVolumeChartData = {
    labels: weeklyVolumeData.map(d => d.week),
    datasets: [
      {
        label: 'Reports',
        data: weeklyVolumeData.map(d => d.count),
        backgroundColor: '#6B8F4A',
        borderRadius: 4,
      }
    ]
  }

  const issueTypeChartData = {
    labels: issueTypeData.map(d => d.name),
    datasets: [
      {
        data: issueTypeData.map(d => d.value),
        backgroundColor: COLORS.slice(0, issueTypeData.length),
      }
    ]
  }

  const resolutionRateChartData = {
    labels: resolutionRateData.map(d => d.week),
    datasets: [
      {
        label: 'Resolution Rate (%)',
        data: resolutionRateData.map(d => d.rate),
        borderColor: '#6A9BD8',
        backgroundColor: '#6A9BD8',
        tension: 0.1,
      }
    ]
  }

  const satisfactionChartData = satisfactionData ? {
    labels: SATISFACTION_LABELS,
    datasets: [
      {
        data: Object.values(satisfactionData.distribution),
        backgroundColor: SATISFACTION_COLORS,
      }
    ]
  } : null

  const statusChartData = {
    labels: statusData.map(d => d.name.replace('_', ' ').toUpperCase()),
    datasets: [
      {
        data: statusData.map(d => d.value),
        backgroundColor: COLORS.slice(0, statusData.length),
      }
    ]
  }

  return (
    <OfficerGuard>
      <div className="p-8">
      <PageHeader
        title="Analytics"
        subtitle="View analytics and insights"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Analytics' }
        ]}
      />

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error/30 text-error rounded-lg">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card border-l-4 border-l-[var(--accent-green)] hover:shadow-lg transition-shadow cursor-pointer">
            <div className="mb-2">
              <span className="text-sm text-text-muted">Total Reports</span>
            </div>
            <p className="text-3xl font-bold text-text-primary">{stats.total}</p>
          </div>

          <div className="card border-l-4 border-l-[var(--error)] hover:shadow-lg transition-shadow cursor-pointer">
            <div className="mb-2">
              <span className="text-sm text-text-muted">Unresolved</span>
            </div>
            <p className="text-3xl font-bold text-text-primary">{stats.unresolved}</p>
          </div>

          <div className="card border-l-4 border-l-[var(--warning)] hover:shadow-lg transition-shadow cursor-pointer">
            <div className="mb-2">
              <span className="text-sm text-text-muted">In Progress</span>
            </div>
            <p className="text-3xl font-bold text-text-primary">{stats.inProgress}</p>
          </div>

          <div className="card border-l-4 border-l-[var(--success)] hover:shadow-lg transition-shadow cursor-pointer">
            <div className="mb-2">
              <span className="text-sm text-text-muted">Resolved Today</span>
            </div>
            <p className="text-3xl font-bold text-text-primary">{stats.resolvedToday}</p>
          </div>

          <div className="card border-l-4 border-l-[var(--accent-green-dark)] hover:shadow-lg transition-shadow cursor-pointer">
            <div className="mb-2">
              <span className="text-sm text-text-muted">Avg. Resolution Time</span>
            </div>
            <p className="text-3xl font-bold text-text-primary">{stats.avgResolutionTime}</p>
          </div>

          <div className="card border-l-4 border-l-[var(--accent-green)] hover:shadow-lg transition-shadow cursor-pointer">
            <div className="mb-2">
              <span className="text-sm text-text-muted">Resolution Rate</span>
            </div>
            <p className="text-3xl font-bold text-text-primary">{`${stats.resolutionRate}%`}</p>
          </div>

          <div className="card border-l-4 border-l-[var(--warning)] hover:shadow-lg transition-shadow cursor-pointer">
            <div className="mb-2">
              <span className="text-sm text-text-muted">Waiting for Feedback</span>
            </div>
            <p className="text-3xl font-bold text-text-primary">{stats.waitingForFeedback}</p>
          </div>

          <div className="card border-l-4 border-l-[var(--error)] hover:shadow-lg transition-shadow cursor-pointer">
            <div className="mb-2">
              <span className="text-sm text-text-muted">Overdue Reports</span>
            </div>
            <p className="text-3xl font-bold text-text-primary">{stats.overdue}</p>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Reports per Week Bar Chart */}
        <div className="chart-card">
          <h2>Reports per Week</h2>
          <div style={{ width: '100%', height: '320px' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
              <SkeletonChartCard className="w-full" />
            </div>
            ) : weeklyVolumeData.length === 0 ? (
              <div className="chart-placeholder">No data available for the selected period</div>
            ) : (
              <Bar data={weeklyVolumeChartData} options={{ maintainAspectRatio: false }} />
            )}
          </div>
        </div>

        {/* Resolution Rate Bar Chart */}
        <div className="chart-card">
          <h2>Resolution Rate (%)</h2>
          <div style={{ width: '100%', height: '320px' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
              <SkeletonChartCard className="w-full" />
            </div>
            ) : resolutionRateData.length === 0 ? (
              <div className="chart-placeholder">No data available for the selected period</div>
            ) : (
              <Bar data={resolutionRateChartData} options={{ maintainAspectRatio: false }} />
            )}
          </div>
        </div>

        {/* Reports by Issue Type Pie Chart */}
        <div className="chart-card">
          <h2>Reports by Issue Type</h2>
          <div style={{ width: '100%', height: '320px' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
              <SkeletonChartCard className="w-full" />
            </div>
            ) : issueTypeData.length === 0 ? (
              <div className="chart-placeholder">No data available</div>
            ) : (
              <Pie data={issueTypeChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            )}
          </div>
        </div>

        {/* Satisfaction Distribution Pie Chart */}
        <div className="chart-card">
          <h2>Satisfaction Distribution</h2>
          <div style={{ width: '100%', height: '320px' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
              <SkeletonChartCard className="w-full" />
            </div>
            ) : !satisfactionChartData || satisfactionData.total === 0 ? (
              <div className="chart-placeholder">No ratings available</div>
            ) : (
              <Pie data={satisfactionChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            )}
          </div>
        </div>

        {/* Reports by Status Pie Chart */}
        <div className="chart-card">
          <h2>Reports by Status</h2>
          <div style={{ width: '100%', height: '320px' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
              <SkeletonChartCard className="w-full" />
            </div>
            ) : statusData.length === 0 ? (
              <div className="chart-placeholder">No data available</div>
            ) : (
              <Pie data={statusChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            )}
          </div>
        </div>
      </div>
    </div>
    </OfficerGuard>
  )
}
