'use client'
import { useEffect, useState, useRef } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { fetchPublicReports, fetchSatisfactionAnalytics, getAccuracyMetrics } from '@/lib/api'
import { SkeletonLine, SkeletonStatCard, SkeletonChartCard } from '@/components/ui/Skeleton'
import { OfficerGuard } from '@/components/auth/RequireRole'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
const SATISFACTION_COLORS = ['#EF4444', '#F59E0B', '#9CA3AF', '#3B82F6', '#10B981']
const SATISFACTION_LABELS = ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied']

export default function AnalyticsPage() {
  const barChartRef = useRef(null)
  const lineChartRef = useRef(null)
  const doughnutIssueRef = useRef(null)
  const doughnutSatRef = useRef(null)
  const doughnutStatusRef = useRef(null)

  const [reports, setReports] = useState([])
  const [satisfactionData, setSatisfactionData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState(false)
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
        const unresolved = reportsData.filter(r => r.status !== 'resolved' && r.status !== 'closed').length
        const inProgress = reportsData.filter(r => r.status === 'in_progress').length
        const resolved = reportsData.filter(r => r.status === 'resolved').length
        const closed = reportsData.filter(r => r.status === 'closed').length
        const waitingForFeedback = reportsData.filter(r => r.status === 'waiting_for_feedback').length
        const overdue = reportsData.filter(r => {
          if (r.status === 'resolved' || r.status === 'closed') return false;
          if (r.is_overdue) return true;
          const created = new Date(r.created_at);
          const diffHours = (new Date() - created) / (1000 * 60 * 60);
          return diffHours > 48;
        }).length

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const resolvedToday = reportsData.filter(r => {
          if (r.status !== 'resolved' && r.status !== 'closed') return false
          const resolvedDateString = r.lgu_resolved_at || r.citizen_closed_at || r.updated_at
          if (resolvedDateString) {
            const updatedDate = new Date(resolvedDateString)
            return updatedDate >= today && updatedDate < tomorrow
          }
          return false
        }).length

        const resolvedReports = reportsData.filter(r => (r.status === 'resolved' || r.status === 'closed') && r.created_at && r.updated_at)
        let avgResolutionTime = 'N/A'
        if (resolvedReports.length > 0) {
          const totalHours = resolvedReports.reduce((sum, r) => {
            const created = new Date(r.created_at)
            const updated = new Date(r.lgu_resolved_at || r.citizen_closed_at || r.updated_at)
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
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, count]) => {
        const [year, week] = key.split('-W')
        return { week: `W${week} '${year.slice(2)}`, count }
      })
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
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, data]) => {
        const [year, week] = key.split('-W')
        return {
          week: `W${week} '${year.slice(2)}`,
          rate: data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0
        }
      })
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
        backgroundColor: '#10B981',
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
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
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

  const exportPDF = () => {
    setExporting(true)
    
    setTimeout(() => {
      try {
        const doc = new jsPDF()
        
        // Brand color: #0052CC (EcoPin Primary)
        const primaryColor = [0, 82, 204]
        
        // Add Header
        doc.setFillColor(...primaryColor)
        doc.rect(0, 0, 210, 40, 'F')
        
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(24)
        doc.setFont('helvetica', 'bold')
        doc.text('EcoPin Metrics Report', 14, 25)
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        const todayDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        doc.text(`Generated on: ${todayDate} | Officer Dashboard`, 14, 32)
        
        doc.setTextColor(0, 0, 0)
        
        // Key Statistics Table
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Key Statistics', 14, 55)
        
        autoTable(doc, {
          startY: 60,
          head: [['Metric', 'Value', 'Metric', 'Value']],
          body: [
            ['Total Reports', stats.total.toString(), 'Resolution Rate', `${stats.resolutionRate}%`],
            ['Unresolved', stats.unresolved.toString(), 'Resolved Today', stats.resolvedToday.toString()],
            ['In Progress', stats.inProgress.toString(), 'Waiting for Feedback', stats.waitingForFeedback.toString()],
            ['Resolved/Closed', (stats.resolved + stats.closed).toString(), 'Overdue Reports', stats.overdue.toString()],
            ['Avg. Resolution Time', stats.avgResolutionTime, '', '']
          ],
          headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 247, 250] },
          theme: 'grid',
          styles: { fontSize: 10, cellPadding: 5 }
        })
        
        let currentY = doc.lastAutoTable.finalY + 20
        
        // Helper to add chart images
        const addChart = (ref, title, y, x = 14, width = 180, height = 90) => {
          if (ref.current) {
            if (y + height + 20 > 297) {
              doc.addPage()
              y = 20
            }
            
            doc.setFontSize(14)
            doc.setFont('helvetica', 'bold')
            doc.text(title, x, y)
            
            const imgData = ref.current.toBase64Image()
            // In light mode, the chart background is transparent, so it will show up fine on white PDF
            doc.addImage(imgData, 'PNG', x, y + 5, width, height)
            
            return y + height + 20
          }
          return y
        }
        
        // Add Bar & Line Charts
        currentY = addChart(barChartRef, 'Reports per Week', currentY)
        currentY = addChart(lineChartRef, 'Resolution Rate Over Time', currentY)
        
        // Page break for pie charts
        doc.addPage()
        currentY = 20
        
        currentY = addChart(doughnutIssueRef, 'Reports by Issue Type', currentY, 14, 90, 90)
        
        // Render Satisfaction Distribution side-by-side if available
        if (satisfactionData && satisfactionData.total > 0) {
          addChart(doughnutSatRef, 'Satisfaction Distribution', currentY - 110, 105, 90, 90)
        }
        
        currentY = addChart(doughnutStatusRef, 'Reports by Status', currentY, 14, 90, 90)
        
        doc.save('EcoPin-Metrics-Report.pdf')
      } catch (err) {
        console.error('PDF export failed:', err)
      } finally {
        setExporting(false)
      }
    }, 500) // Small delay to let UI render if needed
  }

  return (
    <OfficerGuard>
      <div className="p-8" id="metrics-content">
      <PageHeader
        title="Metrics"
        subtitle="View metrics and insights"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Metrics' }
        ]}
      >
        <button
          onClick={exportPDF}
          disabled={exporting || loading}
          className="btn-secondary whitespace-nowrap flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          {exporting ? 'EXPORTING...' : 'EXPORT PDF'}
        </button>
      </PageHeader>

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
          <div className="bg-surface-elevated border border-border rounded-xl p-6">
            <div className="mb-2">
              <span className="text-xs font-mono tracking-widest uppercase text-text-muted">Total Reports</span>
            </div>
            <p className="text-4xl font-bold text-text-primary uppercase">{stats.total}</p>
          </div>

          <div className="bg-surface-elevated border border-border rounded-xl p-6">
            <div className="mb-2">
              <span className="text-xs font-mono tracking-widest uppercase text-text-muted">Unresolved</span>
            </div>
            <p className="text-4xl font-bold text-text-primary uppercase">{stats.unresolved}</p>
          </div>

          <div className="bg-surface-elevated border border-border rounded-xl p-6">
            <div className="mb-2">
              <span className="text-xs font-mono tracking-widest uppercase text-text-muted">In Progress</span>
            </div>
            <p className="text-4xl font-bold text-text-primary uppercase">{stats.inProgress}</p>
          </div>

          <div className="bg-surface-elevated border border-border rounded-xl p-6">
            <div className="mb-2">
              <span className="text-xs font-mono tracking-widest uppercase text-text-muted">Resolved Today</span>
            </div>
            <p className="text-4xl font-bold text-text-primary uppercase">{stats.resolvedToday}</p>
          </div>

          <div className="bg-surface-elevated border border-border rounded-xl p-6">
            <div className="mb-2">
              <span className="text-xs font-mono tracking-widest uppercase text-text-muted">Avg. Resolution Time</span>
            </div>
            <p className="text-4xl font-bold text-text-primary uppercase">{stats.avgResolutionTime}</p>
          </div>

          <div className="bg-surface-elevated border border-border rounded-xl p-6">
            <div className="mb-2">
              <span className="text-xs font-mono tracking-widest uppercase text-text-muted">Resolution Rate</span>
            </div>
            <p className="text-4xl font-bold text-text-primary uppercase">{`${stats.resolutionRate}%`}</p>
          </div>

          <div className="bg-surface-elevated border border-border rounded-xl p-6">
            <div className="mb-2">
              <span className="text-xs font-mono tracking-widest uppercase text-text-muted">Waiting for Feedback</span>
            </div>
            <p className="text-4xl font-bold text-text-primary uppercase">{stats.waitingForFeedback}</p>
          </div>

          <div className="bg-surface-elevated border border-border rounded-xl p-6">
            <div className="mb-2">
              <span className="text-xs font-mono tracking-widest uppercase text-text-muted">Overdue Reports</span>
            </div>
            <p className="text-4xl font-bold text-text-primary uppercase">{stats.overdue}</p>
          </div>
        </div>
      )}

      {/* Resolution Rate Progress */}
      {!loading && (
         <div className="mb-8 bg-surface-elevated border border-border rounded-xl p-6">
            <h2 className="text-sm font-bold uppercase tracking-tight text-text-muted mb-4">Resolution Progress</h2>
            <div className="flex justify-between items-end mb-2">
               <span className="text-2xl font-bold uppercase tracking-tight">{stats.resolutionRate}% of all reports resolved</span>
            </div>
            <div className="w-full bg-surface-elevated h-4 relative border border-[#333333]">
               <div 
                 className={`h-full ${stats.resolutionRate >= 70 ? 'bg-accent-green' : stats.resolutionRate >= 40 ? 'bg-warning' : 'bg-error'} transition-all duration-1000`} 
                 style={{ width: `${stats.resolutionRate}%` }}
               />
            </div>
         </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Reports per Week Bar Chart */}
        <div className="bg-surface-elevated border border-border rounded-xl p-6">
          <h2 className="text-2xl font-bold uppercase tracking-tight text-text-primary mb-6 border-b border-border pb-4">Reports per Week</h2>
          <div style={{ width: '100%', height: '320px' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
              <SkeletonChartCard className="w-full" />
            </div>
            ) : weeklyVolumeData.length === 0 ? (
              <div className="chart-placeholder">No data available for the selected period</div>
            ) : (
              <Bar ref={barChartRef} data={weeklyVolumeChartData} options={{ maintainAspectRatio: false }} />
            )}
          </div>
        </div>

        {/* Resolution Rate Bar Chart */}
        <div className="bg-surface-elevated border border-border rounded-xl p-6">
          <h2 className="text-2xl font-bold uppercase tracking-tight text-text-primary mb-6 border-b border-border pb-4">Resolution Rate (%)</h2>
          <div style={{ width: '100%', height: '320px' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
              <SkeletonChartCard className="w-full" />
            </div>
            ) : resolutionRateData.length === 0 ? (
              <div className="chart-placeholder">No data available for the selected period</div>
            ) : (
              <Line ref={lineChartRef} data={resolutionRateChartData} options={{ maintainAspectRatio: false }} />
            )}
          </div>
        </div>

        {/* Reports by Issue Type Pie Chart */}
        <div className="bg-surface-elevated border border-border rounded-xl p-6">
          <h2 className="text-2xl font-bold uppercase tracking-tight text-text-primary mb-6 border-b border-border pb-4">Reports by Issue Type</h2>
          <div style={{ width: '100%', height: '320px' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
              <SkeletonChartCard className="w-full" />
            </div>
            ) : issueTypeData.length === 0 ? (
              <div className="chart-placeholder">No data available</div>
            ) : (
              <Doughnut ref={doughnutIssueRef} data={issueTypeChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            )}
          </div>
        </div>

        {/* Satisfaction Distribution Pie Chart */}
        <div className="bg-surface-elevated border border-border rounded-xl p-6">
          <h2 className="text-2xl font-bold uppercase tracking-tight text-text-primary mb-6 border-b border-border pb-4">Satisfaction Distribution</h2>
          <div style={{ width: '100%', height: '320px' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
              <SkeletonChartCard className="w-full" />
            </div>
            ) : !satisfactionChartData || satisfactionData.total === 0 ? (
              <div className="chart-placeholder">No ratings available</div>
            ) : (
              <Doughnut ref={doughnutSatRef} data={satisfactionChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            )}
          </div>
        </div>

        {/* Reports by Status Pie Chart */}
        <div className="bg-surface-elevated border border-border rounded-xl p-6">
          <h2 className="text-2xl font-bold uppercase tracking-tight text-text-primary mb-6 border-b border-border pb-4">Reports by Status</h2>
          <div style={{ width: '100%', height: '320px' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
              <SkeletonChartCard className="w-full" />
            </div>
            ) : statusData.length === 0 ? (
              <div className="chart-placeholder">No data available</div>
            ) : (
              <Doughnut ref={doughnutStatusRef} data={statusChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
            )}
          </div>
        </div>
      </div>
    </div>
    </OfficerGuard>
  )
}
