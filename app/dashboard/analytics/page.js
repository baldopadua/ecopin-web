'use client'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { fetchValidatedReports } from '@/lib/api'
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

export default function AnalyticsPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Loading analytics data...')
        const data = await fetchValidatedReports()
        console.log('Analytics data loaded:', data)
        setReports(data)
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

  // Calculate total reports
  const totalReports = reports.length

  // Calculate unresolved reports
  const unresolvedReports = reports.filter(r => r.status === 'unresolved').length

  // Calculate in progress reports
  const inProgressReports = reports.filter(r => r.status === 'in_progress').length

  // Calculate resolution rate
  const resolvedReports = reports.filter(r => r.status === 'resolved').length
  const resolutionRate = totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0

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
      .slice(-12) // Last 12 weeks
  }

  // Prepare data for most active issue type pie chart
  const mostActiveIssueType = () => {
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

  const weeklyVolumeData = weeklyReportVolume()
  const issueTypeData = reportsByIssueType()
  const resolutionRateData = resolutionRateOverTime()
  const mostActiveData = mostActiveIssueType()

  console.log('Analytics chart data:', { weeklyVolumeData, issueTypeData, resolutionRateData, mostActiveData })

  // Prepare Chart.js data formats
  const weeklyVolumeChartData = {
    labels: weeklyVolumeData.map(d => d.week),
    datasets: [
      {
        label: 'Reports',
        data: weeklyVolumeData.map(d => d.count),
        backgroundColor: '#4CAF50',
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
        borderColor: '#3B82F6',
        backgroundColor: '#3B82F6',
        tension: 0.1,
      }
    ]
  }

  const mostActiveChartData = {
    labels: mostActiveData.map(d => d.name),
    datasets: [
      {
        data: mostActiveData.map(d => d.value),
        backgroundColor: COLORS.slice(0, mostActiveData.length),
      }
    ]
  }

  return (
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
        <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <h3 className="text-sm font-medium text-text-muted mb-2">Total Reports</h3>
          <p className="text-3xl font-bold text-text-primary">
            {loading ? '...' : totalReports}
          </p>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-medium text-text-muted mb-2">Unresolved</h3>
          <p className="text-3xl font-bold text-text-primary">
            {loading ? '...' : unresolvedReports}
          </p>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-medium text-text-muted mb-2">In Progress</h3>
          <p className="text-3xl font-bold text-text-primary">
            {loading ? '...' : inProgressReports}
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Weekly Report Volume Bar Chart */}
        <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>Weekly Report Volume</h2>
          <div style={{ width: '100%', height: '320px' }}>
            {loading ? (
              <div style={{ color: '#6b7280', textAlign: 'center', paddingTop: '140px' }}>Loading chart data...</div>
            ) : weeklyVolumeData.length === 0 ? (
              <div style={{ color: '#6b7280', textAlign: 'center', paddingTop: '140px' }}>No data available for the selected period</div>
            ) : (
              <Bar data={weeklyVolumeChartData} options={{ maintainAspectRatio: false }} />
            )}
          </div>
        </div>

        {/* Reports by Issue Type Pie Chart */}
        <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>Reports by Issue Type</h2>
          <div style={{ width: '100%', height: '320px' }}>
            {loading ? (
              <div style={{ color: '#6b7280', textAlign: 'center', paddingTop: '140px' }}>Loading chart data...</div>
            ) : issueTypeData.length === 0 ? (
              <div style={{ color: '#6b7280', textAlign: 'center', paddingTop: '140px' }}>No data available</div>
            ) : (
              <Pie data={issueTypeChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            )}
          </div>
        </div>

        {/* Resolution Rate Over Time Line Chart */}
        <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>Resolution Rate Over Time</h2>
          <div style={{ width: '100%', height: '320px' }}>
            {loading ? (
              <div style={{ color: '#6b7280', textAlign: 'center', paddingTop: '140px' }}>Loading chart data...</div>
            ) : resolutionRateData.length === 0 ? (
              <div style={{ color: '#6b7280', textAlign: 'center', paddingTop: '140px' }}>No data available for the selected period</div>
            ) : (
              <Line data={resolutionRateChartData} options={{ maintainAspectRatio: false }} />
            )}
          </div>
        </div>

        {/* Most Active Issue Type Pie Chart */}
        <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>Most Active Issue Types</h2>
          <div style={{ width: '100%', height: '320px' }}>
            {loading ? (
              <div style={{ color: '#6b7280', textAlign: 'center', paddingTop: '140px' }}>Loading chart data...</div>
            ) : mostActiveData.length === 0 ? (
              <div style={{ color: '#6b7280', textAlign: 'center', paddingTop: '140px' }}>No data available</div>
            ) : (
              <Pie data={mostActiveChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
