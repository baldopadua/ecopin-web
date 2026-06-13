'use client'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { fetchValidatedReports } from '@/lib/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function AnalyticsPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchValidatedReports()
        setReports(data)
      } catch (error) {
        console.error('Failed to load analytics data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Calculate total reports
  const totalReports = reports.length

  // Calculate resolution rate
  const resolvedReports = reports.filter(r => r.status === 'resolved').length
  const resolutionRate = totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0

  // Calculate average response time (simplified: time from created to resolved)
  const averageResponseTime = () => {
    const resolved = reports.filter(r => r.status === 'resolved' && r.created_at)
    if (resolved.length === 0) return 'N/A'
    
    // Note: This is a simplified calculation assuming we have a resolved_at field
    // For now, we'll return a placeholder
    return 'Calculating...'
  }

  // Prepare data for bar chart (reports per week)
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
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-8) // Last 8 weeks
  }

  // Helper function to get week number
  function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
    return weekNo.toString().padStart(2, '0')
  }

  const chartData = reportsPerWeek()

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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <h3 className="text-sm font-medium text-text-muted mb-2">Total Reports</h3>
          <p className="text-3xl font-bold text-text-primary">
            {loading ? '...' : totalReports}
          </p>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-medium text-text-muted mb-2">Resolution Rate</h3>
          <p className="text-3xl font-bold text-text-primary">
            {loading ? '...' : `${resolutionRate}%`}
          </p>
        </div>

        <div className="card p-6">
          <h3 className="text-sm font-medium text-text-muted mb-2">Avg. Response Time</h3>
          <p className="text-3xl font-bold text-text-primary">
            {loading ? '...' : averageResponseTime()}
          </p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="card">
        <h2 className="text-xl font-bold text-text-primary mb-4">Reports per Week</h2>
        <div className="h-80">
          {loading ? (
            <p className="text-text-muted">Loading chart data...</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#4CAF50" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
