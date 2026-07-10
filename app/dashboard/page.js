'use client'
import { useEffect, useState } from 'react'
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

const COLORS = ['#4CAF50', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899']

export default function DashboardPage() {
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    unresolved: 0,
    inProgress: 0,
    resolved: 0,
    resolvedToday: 0,
    avgResolutionTime: 'N/A',
    resolutionRate: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchPublicReports()
        setReports(data)
        
        const total = data.length
        const unresolved = data.filter(r => r.status === 'unresolved').length
        const inProgress = data.filter(r => r.status === 'in_progress').length
        const resolved = data.filter(r => r.status === 'resolved').length
        
        // Calculate resolved today - check reports that were resolved today
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        
        const resolvedToday = data.filter(r => {
          if (r.status !== 'resolved') return false
          // Check updated_at timestamp when report was marked as resolved
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
        
        setStats({
          total,
          unresolved,
          inProgress,
          resolved,
          resolvedToday,
          avgResolutionTime,
          resolutionRate
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
        backgroundColor: 'rgba(46, 125, 50, 0.8)',
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
        <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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

        <div className="card border-l-4 border-l-[var(--accent-green-dark)] hover:shadow-lg transition-shadow cursor-pointer">
          <div className="mb-2">
            <span className="text-sm text-text-muted">Avg. Resolution Time</span>
          </div>
          <p className="text-3xl font-bold text-text-primary">{loading ? '...' : stats.avgResolutionTime}</p>
        </div>

        <div className="card border-l-4 border-l-[var(--accent-green)] hover:shadow-lg transition-shadow cursor-pointer">
          <div className="mb-2">
            <span className="text-sm text-text-muted">Resolution Rate</span>
          </div>
          <p className="text-3xl font-bold text-text-primary">{loading ? '...' : `${stats.resolutionRate}%`}</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Reports per Week Bar Chart */}
        <div className="chart-card">
          <h2>Reports per Week</h2>
          <div style={{ width: '100%', height: '320px' }}>
            {loading ? (
              <div className="chart-placeholder">Loading chart data...</div>
            ) : chartData.length === 0 ? (
              <div className="chart-placeholder">No data available for the selected period</div>
            ) : (
              <Bar data={barChartData} options={{ maintainAspectRatio: false }} />
            )}
          </div>
        </div>

        {/* Resolution Rate Bar Chart */}
        <div className="chart-card">
          <h2>Resolution Rate (%)</h2>
          <div style={{ width: '100%', height: '320px' }}>
            {loading ? (
              <div className="chart-placeholder">Loading chart data...</div>
            ) : resolutionRateData.length === 0 ? (
              <div className="chart-placeholder">No data available for the selected period</div>
            ) : (
              <Bar data={resolutionRateChartData} options={{ maintainAspectRatio: false }} />
            )}
          </div>
        </div>

        {/* Most Active Issue Type Pie Chart */}
        <div className="chart-card">
          <h2>Most Active Issue Types</h2>
          <div style={{ width: '100%', height: '320px' }}>
            {loading ? (
              <div className="chart-placeholder">Loading chart data...</div>
            ) : pieData.length === 0 ? (
              <div className="chart-placeholder">No data available</div>
            ) : (
              <Pie data={pieChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}