'use client'
import { useEffect, useState, useRef } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { fetchPublicReports, fetchSatisfactionAnalytics } from '@/lib/api'
import { SkeletonStatCard } from '@/components/ui/Skeleton'
import { OfficerGuard } from '@/components/auth/RequireRole'
import Notification from '@/components/ui/Notification'
import Button from '@/components/ui/Button'
import PageTabs from '@/components/ui/PageTabs'
import usePublicTheme from '@/components/landing/usePublicTheme'
import styles from './Metrics.module.css'
import { creationWeekKey } from '@/lib/report-analytics.mjs'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
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
import { reportDiagnostic } from '../../../../lib/diagnostics.mjs';

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

const COLORS = ['#0052CC', '#2E7D32', '#B45309', '#D32F2F', '#7C3AED', '#BE185D', '#0E7490', '#64748B']
const SATISFACTION_COLORS = ['#EF4444', '#F59E0B', '#9CA3AF', '#3B82F6', '#10B981']
const SATISFACTION_LABELS = ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied']

export default function AnalyticsPage() {
  const { isDark } = usePublicTheme()
  const [activeTab, setActiveTab] = useState('overview')
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
  const [reload, setReload] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [notification, setNotification] = useState(null)
  const [ratingsError, setRatingsError] = useState(false)
  const [ratingsLoading, setRatingsLoading] = useState(false)
  const ratingsGeneration = useRef(0)
  const [stats, setStats] = useState({
    total: 0,
    unresolved: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    waitingForFeedback: 0,
    resolvedToday: 0,
    avgResolutionTime: 'Unavailable',
    resolutionRate: 0,
    overdue: 0
  })

  useEffect(() => {
    let current = true
    const generation = ++ratingsGeneration.current
    const loadData = async () => {
      setLoading(true)
      setError(null)
      setRatingsLoading(true)
      try {
        const [reportsResult, ratingsResult] = await Promise.allSettled([
          fetchPublicReports({ throwOnError: true }),
          fetchSatisfactionAnalytics()
        ])
        if (!current) return
        if (generation === ratingsGeneration.current) {
          setRatingsError(ratingsResult.status === 'rejected')
          if (ratingsResult.status === 'fulfilled') setSatisfactionData(ratingsResult.value)
        }
        if (reportsResult.status === 'rejected') throw reportsResult.reason
        const reportsData = reportsResult.value
        setReports(reportsData)
        setLoaded(true)

        const total = reportsData.length
        /*
         * Investigation - Issue #7 (Officer Metrics Unresolved Reports Alignment):
         * Previously, `unresolved` was calculated as `r.status !== 'resolved' && r.status !== 'closed'`,
         * which grouped 'in_progress' and 'waiting_for_feedback' together with 'unresolved', causing a
         * discrepancy with the Officer Dashboard Command Center which strictly counts reports with
         * `status === 'unresolved'`. We align this filter to strictly match the dashboard's definition.
         */
        const unresolved = reportsData.filter(r => (r.status || '').toLowerCase() === 'unresolved').length
        const inProgress = reportsData.filter(r => (r.status || '').toLowerCase() === 'in_progress').length
        const resolved = reportsData.filter(r => (r.status || '').toLowerCase() === 'resolved').length
        const closed = reportsData.filter(r => (r.status || '').toLowerCase() === 'closed').length
        const waitingForFeedback = reportsData.filter(r => (r.status || '').toLowerCase() === 'waiting_for_feedback').length
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
        const resolutionHours = resolvedReports.map(r => {
            const created = new Date(r.created_at)
            const updated = new Date(r.lgu_resolved_at || r.citizen_closed_at || r.updated_at)
            return (updated - created) / (1000 * 60 * 60)
          }).filter(hours => Number.isFinite(hours) && hours >= 0)
        let avgResolutionTime = 'Unavailable'
        if (resolutionHours.length > 0) {
          const avgHours = resolutionHours.reduce((sum, hours) => sum + hours, 0) / resolutionHours.length
          if (avgHours < 24) {
            avgResolutionTime = `${Math.round(avgHours)} hours`
          } else {
            avgResolutionTime = `${Math.round(avgHours / 24)} days`
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
        reportDiagnostic('error', 'analytics', 'Failed to load analytics data:', error)
        if (current) setError('Report analytics could not load')
      } finally {
        if (current) {
          setLoading(false)
          if (generation === ratingsGeneration.current) setRatingsLoading(false)
        }
      }
    }
    loadData()
    return () => { current = false }
  }, [reload])

  async function retryRatings() {
    if (ratingsLoading || loading) return
    const generation = ++ratingsGeneration.current
    setRatingsLoading(true)
    try {
      const result = await fetchSatisfactionAnalytics()
      if (generation === ratingsGeneration.current) {
        setSatisfactionData(result)
        setRatingsError(false)
      }
    } catch {
      if (generation === ratingsGeneration.current) setRatingsError(true)
    } finally {
      if (generation === ratingsGeneration.current) setRatingsLoading(false)
    }
  }

  // Prepare data for weekly report volume bar chart
  const weeklyReportVolume = () => {
    const weekMap = {}

    reports.forEach(report => {
      if (report.created_at && Number.isFinite(new Date(report.created_at).getTime())) {
        const date = new Date(report.created_at)
        const key = creationWeekKey(date)

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
      if (report.created_at && Number.isFinite(new Date(report.created_at).getTime())) {
        const date = new Date(report.created_at)
        const key = creationWeekKey(date)

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
    labels: issueTypeData.map(d => displayLabel(d.name)),
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
        data: [1, 2, 3, 4, 5].map(rating => satisfactionData.distribution?.[rating] ?? 0),
        backgroundColor: SATISFACTION_COLORS,
      }
    ]
  } : null

  const statusChartData = {
    labels: statusData.map(d => displayLabel(d.name)),
    datasets: [
      {
        data: statusData.map(d => d.value),
        backgroundColor: statusData.map((_, index) => COLORS[index % COLORS.length]),
      }
    ]
  }

  const chartOptions = {
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: false }, tooltip: { titleFont: { family: 'Outfit', size: 14 }, bodyFont: { family: 'Outfit', size: 14 } } },
    scales: {
      x: { ticks: { color: isDark ? '#b0b0b0' : '#59636e', font: { family: 'Outfit', size: 12 } }, grid: { display: false } },
      y: { beginAtZero: true, ticks: { precision: 0, color: isDark ? '#b0b0b0' : '#59636e', font: { family: 'Outfit', size: 12 } }, grid: { color: isDark ? '#333333' : '#e5e9ee' } },
    },
  }
  const pieOptions = { maintainAspectRatio: false, animation: false, plugins: chartOptions.plugins }
  const summaryRows = [
    ['Public reports loaded', stats.total],
    ['Unresolved reports', stats.unresolved],
    ['In progress', stats.inProgress],
    ['Resolved or closed today', stats.resolvedToday],
    ['Average resolution time', stats.avgResolutionTime],
    ['Resolved or closed', stats.total ? `${stats.resolutionRate}%` : 'No reports'],
    ['Waiting for feedback', stats.waitingForFeedback],
    ['Flagged or older than 48 hours', stats.overdue],
  ]
  const sourceDates = reports.filter(report => report.created_at).map(report => new Date(report.created_at)).filter(date => Number.isFinite(date.getTime()))
  const dateLabel = date => date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  const bounds = sourceDates.reduce((result, date) => ({ start: Math.min(result.start, date.getTime()), end: Math.max(result.end, date.getTime()) }), { start: Infinity, end: -Infinity })
  const coverage = sourceDates.length ? `${dateLabel(new Date(bounds.start))} – ${dateLabel(new Date(bounds.end))}` : 'Creation dates unavailable'
  const chartRows = data => data.labels.map((label, index) => ({ label, value: data.datasets[0].data[index], color: Array.isArray(data.datasets[0].backgroundColor) ? data.datasets[0].backgroundColor[index] : data.datasets[0].borderColor || data.datasets[0].backgroundColor }))
  const charts = [
    { id: 'weekly-reports', title: 'When were reports created?', description: 'Report counts for the last 12 recorded creation weeks. Weeks without records are not added.', data: weeklyVolumeChartData, ref: barChartRef, component: Bar, options: chartOptions, unit: 'reports' },
    { id: 'weekly-outcomes', title: 'How are those weeks progressing?', description: 'Current resolved-or-closed percentage grouped by creation week. This is a present-day cohort comparison, not historical daily performance.', data: resolutionRateChartData, ref: lineChartRef, component: Line, options: { ...chartOptions, scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, max: 100 } } }, unit: '%' },
    { id: 'report-categories', title: 'Which concerns are reported?', description: 'Up to eight most frequent concern types among the loaded public reports.', data: issueTypeChartData, ref: doughnutIssueRef, component: Doughnut, options: pieOptions, unit: 'reports' },
    { id: 'report-statuses', title: 'What is the current response status?', description: 'Written response states among the loaded public reports. Review decisions are separate.', data: statusChartData, ref: doughnutStatusRef, component: Doughnut, options: pieOptions, unit: 'reports' },
  ]
  const ratingRows = satisfactionChartData ? chartRows(satisfactionChartData) : []

  async function exportPDF() {
    if (exporting || loading || !loaded || error) return
    setExporting(true)
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ])
      const doc = new jsPDF()
      doc.setFontSize(22)
      doc.text('EcoPin report analytics', 14, 22)
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 31)
      doc.text(`Public report creation dates: ${coverage}`, 14, 38)
      autoTable(doc, { startY: 46, head: [['Metric', 'Value']], body: summaryRows, headStyles: { fillColor: [0, 82, 204] }, styles: { fontSize: 11 } })
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 8,
        body: [
          ['Scope', 'All loaded public reports permitted by the existing public projection.'],
          ['Response timing', 'Uses recorded resolution/closure dates, with latest update as the existing fallback.'],
          ['Age indicator', 'Flagged overdue by the source or still unresolved after 48 hours; not a configured SLA measure.'],
          ['Ratings', ratingsError ? 'Ratings could not load.' : satisfactionData?.total > 0 ? `${satisfactionData.total} responses; average ${satisfactionData.average} of 5.` : 'No ratings available.'],
        ], styles: { fontSize: 10 }, theme: 'plain',
      })
      const exportedCharts = [...charts]
      if (!ratingsError && satisfactionData?.total > 0) exportedCharts.push({ title: 'How do residents rate the response?', description: 'Ratings from the separate satisfaction service; not filtered to the loaded public report set.', data: satisfactionChartData, ref: doughnutSatRef, unit: 'responses' })
      for (const chart of exportedCharts) {
        if (!chart.data?.labels.length) continue
        doc.addPage()
        doc.setFontSize(16)
        doc.text(chart.title, 14, 22)
        doc.setFontSize(10)
        doc.text(doc.splitTextToSize(chart.description, 180), 14, 32)
        const rows = chartRows(chart.data)
        const totalValue = rows.reduce((sum, r) => sum + (typeof r.value === 'number' ? r.value : 0), 0)

        autoTable(doc, { 
          startY: 53, 
          head: [['Category / week', `Value (${chart.unit})`]], 
          body: rows.map(row => [row.label, row.value]), 
          headStyles: { fillColor: [0, 82, 204] }, 
          columnStyles: {
            0: { cellPadding: { left: 8, top: 2.5, right: 3, bottom: 2.5 } }
          },
          didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 0) {
              const row = rows[data.row.index]
              if (row?.color) {
                const [r, g, b] = hexToRgb(row.color)
                doc.setFillColor(r, g, b)
                doc.setDrawColor(200, 200, 200)
                doc.setLineWidth(0.1)
                doc.roundedRect(data.cell.x + 2.5, data.cell.y + (data.cell.height - 3.2) / 2, 3.2, 3.2, 0.6, 0.6, 'FD')
              }
            }
          },
          styles: { fontSize: 10 } 
        })

        let legendStartY = doc.lastAutoTable.finalY + 12
        if (chart.ref.current) {
          const chartInstance = chart.ref.current
          const canvas = chartInstance.canvas
          const chartWidth = canvas?.width || chartInstance.width || 180
          const chartHeight = canvas?.height || chartInstance.height || 95
          const aspectRatio = (chartWidth && chartHeight) ? (chartWidth / chartHeight) : (180 / 95)

          const maxWidth = 180
          const maxHeight = 85
          let renderWidth = maxWidth
          let renderHeight = renderWidth / aspectRatio

          if (renderHeight > maxHeight) {
            renderHeight = maxHeight
            renderWidth = renderHeight * aspectRatio
          }

          const imageX = 14 + (maxWidth - renderWidth) / 2
          const y = doc.lastAutoTable.finalY + 10
          const pageOverflow = y + renderHeight > 240
          if (pageOverflow) doc.addPage()
          const imageY = pageOverflow ? 20 : y

          // Enforce print-friendly light background
          doc.setFillColor(255, 255, 255)
          doc.rect(imageX, imageY, renderWidth, renderHeight, 'F')
          doc.addImage(chartInstance.toBase64Image(), 'PNG', imageX, imageY, renderWidth, renderHeight)

          legendStartY = imageY + renderHeight + 8
        }

        // Render Chart Legend section in PDF
        if (legendStartY + 25 > 280) {
          doc.addPage()
          legendStartY = 20
        }

        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(23, 33, 46)
        doc.text('Chart Legend', 14, legendStartY)

        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')

        const isDoughnut = chart.component === Doughnut || chart.id?.includes('categories') || chart.id?.includes('statuses') || chart.id === 'resident-ratings'

        if (isDoughnut) {
          const colWidth = 88
          const rowSpacing = 6
          const gridStartY = legendStartY + 5
          rows.forEach((row, idx) => {
            const col = idx % 2
            const rowInGrid = Math.floor(idx / 2)
            const itemX = 14 + (col * colWidth)
            const itemY = gridStartY + (rowInGrid * rowSpacing)

            if (itemY > 282) {
              doc.addPage()
              legendStartY = 20
            }

            const [r, g, b] = hexToRgb(row.color)
            doc.setFillColor(r, g, b)
            doc.setDrawColor(200, 200, 200)
            doc.setLineWidth(0.1)
            doc.roundedRect(itemX, itemY - 3, 3.5, 3.5, 0.6, 0.6, 'FD')

            const pctStr = totalValue > 0 && typeof row.value === 'number'
              ? ` (${Math.round((row.value / totalValue) * 100)}%)`
              : ''
            const legendText = `${row.label}: ${row.value} ${chart.unit}${pctStr}`
            doc.setTextColor(40, 40, 40)
            doc.text(legendText, itemX + 5.5, itemY)
          })
        } else {
          const datasetLabel = chart.data.datasets?.[0]?.label || (chart.unit === '%' ? 'Resolution Rate (%)' : 'Reports')
          const datasetColor = rows[0]?.color || '#10B981'
          const [r, g, b] = hexToRgb(datasetColor)

          doc.setFillColor(r, g, b)
          doc.setDrawColor(200, 200, 200)
          doc.setLineWidth(0.1)
          doc.roundedRect(14, legendStartY + 2, 3.5, 3.5, 0.6, 0.6, 'FD')

          doc.setTextColor(40, 40, 40)
          const descText = chart.unit === '%' 
            ? `${datasetLabel} — Percentage of reports resolved or closed per creation week cohort`
            : `${datasetLabel} — Total volume of public reports created per week`
          doc.text(descText, 19.5, legendStartY + 5)
        }
      }
      await doc.save('EcoPin-Metrics-Report.pdf', { returnPromise: true })
      setNotification({ type: 'success', message: 'PDF download started. Check your browser downloads.' })
    } catch {
      setNotification({ type: 'error', message: 'The PDF could not download. Please try again.' })
    } finally { setExporting(false) }
  }

  return <OfficerGuard>
    {notification && <Notification {...notification} onClose={() => setNotification(null)} />}
    <div className={`workspace-page ${styles.page}`} id="metrics-content">
      <PageHeader title="Report analytics" subtitle="Understand public report volume, current response outcomes, and resident feedback."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Report analytics' }]}>
        <div className={styles.actions}>
          <Button variant="secondary" disabled={loading || exporting || ratingsLoading} onClick={() => setReload(value => value + 1)}>Refresh analytics</Button>
          <Button variant="secondary" onClick={exportPDF} disabled={exporting || loading || !loaded || !!error}>{exporting ? 'Preparing PDF…' : 'Download PDF'}</Button>
        </div>
      </PageHeader>
      {loading && <p role="status">{loaded ? 'Updating analytics. The previous summary remains below.' : 'Loading report analytics…'}</p>}
      {error && <section className={styles.notice} role="alert">
        <h2>Report analytics could not load</h2>
        <p>{loaded ? 'The last loaded reports remain below. Try again to update the summary.' : 'No report figures are shown until the service responds.'}</p>
        <Button variant="secondary" disabled={loading} onClick={() => setReload(value => value + 1)}>Try again</Button>
      </section>}
      <PageTabs label="Report analytics views" value={activeTab} onChange={setActiveTab} tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'breakdown', label: 'Report breakdown' },
        { id: 'trends', label: 'Trends' },
        { id: 'feedback', label: 'Feedback' },
      ]} />
      <section id="overview-panel" role="tabpanel" aria-labelledby="overview-tab" aria-hidden={activeTab !== 'overview'} inert={activeTab !== 'overview'} className={`workspace-scroll ${styles.tabPanel}`} aria-busy={loading}>
        {loading && !loaded && <div className={styles.metrics} aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <SkeletonStatCard key={i} />)}</div>}
        {loaded && <div className={styles.section}>
            <h2>How are reports progressing?</h2>
            <p className={styles.description}>All loaded public reports · Creation dates: {coverage}. Refresh to retrieve current outcomes.</p>
            <dl className={styles.metrics}>{summaryRows.map(([label, value]) => <div className={styles.card} key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
            <details className={styles.methodology}>
            <summary>Response progress & calculation notes</summary>
            <p className={styles.description}>Response timing uses recorded resolution or closure dates, with the latest update as the existing fallback. Today uses your local date. The age indicator includes source-flagged reports and unresolved reports older than 48 hours; it does not measure the configured SLA.</p>
            {stats.total > 0 ? <div className={styles.progress}>
              <label htmlFor="resolution-progress">{stats.resolved + stats.closed} of {stats.total} reports are resolved or closed ({stats.resolutionRate}%).</label>
              <progress id="resolution-progress" max="100" value={stats.resolutionRate} />
            </div> : <div className={styles.notice}><h3>No public reports to summarize</h3><p>New public reports will appear after they become available and you refresh.</p></div>}
            </details>
          </div>}
      </section>
      <section id="breakdown-panel" role="tabpanel" aria-labelledby="breakdown-tab" aria-hidden={activeTab !== 'breakdown'} inert={activeTab !== 'breakdown'} className={`workspace-scroll ${styles.tabPanel}`}>
          {loaded && <div className={styles.charts}>
            <ChartPanel id="report-categories" title="Which concerns are reported?" description="Up to eight most frequent concern types among the loaded public reports." unit="reports" rows={chartRows(issueTypeChartData)}>
              {issueTypeChartData.labels.length > 0 ? <Doughnut ref={doughnutIssueRef} data={issueTypeChartData} options={pieOptions} role="img" aria-label="Which concerns are reported?" /> : <p className={styles.empty}>No reports with usable data for this chart.</p>}
            </ChartPanel>
            <ChartPanel id="report-statuses" title="What is the current response status?" description="Written response states among the loaded public reports. Review decisions are separate." unit="reports" rows={chartRows(statusChartData)}>
              {statusChartData.labels.length > 0 ? <Doughnut ref={doughnutStatusRef} data={statusChartData} options={pieOptions} role="img" aria-label="What is the current response status?" /> : <p className={styles.empty}>No reports with usable data for this chart.</p>}
            </ChartPanel>
          </div>}
      </section>
      <section id="trends-panel" role="tabpanel" aria-labelledby="trends-tab" aria-hidden={activeTab !== 'trends'} inert={activeTab !== 'trends'} className={`workspace-scroll ${styles.tabPanel}`}>
        {loaded ? <div className={styles.charts}>
          <ChartPanel id="weekly-reports" title="When were reports created?" description="Report counts for the last 12 recorded creation weeks. Weeks without records are not added." unit="reports" rows={chartRows(weeklyVolumeChartData)}>
            {weeklyVolumeChartData.labels.length > 0 ? <Bar ref={barChartRef} data={weeklyVolumeChartData} options={chartOptions} role="img" aria-label="When were reports created?" /> : <p className={styles.empty}>No reports with usable data for this chart.</p>}
          </ChartPanel>
          <ChartPanel id="weekly-outcomes" title="How are those weeks progressing?" description="Current resolved-or-closed percentage grouped by creation week. This is a present-day cohort comparison, not historical daily performance." unit="%" rows={chartRows(resolutionRateChartData)}>
            {resolutionRateChartData.labels.length > 0 ? <Line ref={lineChartRef} data={resolutionRateChartData} options={{ ...chartOptions, scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, max: 100 } } }} role="img" aria-label="How are those weeks progressing?" /> : <p className={styles.empty}>No reports with usable data for this chart.</p>}
          </ChartPanel>
        </div> : <p role="status">{loading ? 'Loading report trends…' : 'No report trends are available.'}</p>}
      </section>
      <section id="feedback-panel" role="tabpanel" aria-labelledby="feedback-tab" aria-hidden={activeTab !== 'feedback'} inert={activeTab !== 'feedback'} className={`workspace-scroll ${styles.tabPanel}`}>
        <div className={styles.section}>
          <h2>How do residents rate the response?</h2>
          <p className={styles.description}>Feedback from the separate satisfaction service. Its scope can differ from the loaded public reports.</p>
          {ratingsLoading && <p role="status">Loading ratings…</p>}
          {ratingsError && <div className={styles.notice} role="alert"><p>Ratings could not load.</p>{satisfactionData && <p>The last loaded ratings remain below.</p>}<Button variant="secondary" disabled={ratingsLoading || loading} onClick={retryRatings}>Retry ratings</Button></div>}
          {satisfactionData?.total > 0 ? <ChartPanel id="resident-ratings" title="Resident ratings" description={`Average rating: ${satisfactionData.average} of 5 from ${satisfactionData.total} responses.`} unit="responses" rows={ratingRows}>
            <Doughnut ref={doughnutSatRef} data={satisfactionChartData} options={pieOptions} role="img" aria-label="Resident ratings" />
          </ChartPanel> : !ratingsLoading && !ratingsError && <p className={styles.notice}>No ratings have been received.</p>}
        </div>
      </section>
    </div>
  </OfficerGuard>
}

function displayLabel(value) {
  const text = String(value).replaceAll('_', ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function ChartPanel({ id, title, description, rows, unit, children }) {
  return <section className={styles.chart} aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>{title}</h3>
    <p className={styles.description}>{description}</p>
    <div className={styles.stage}>{children}</div>
    {rows.length > 0 && <dl className={styles.legend} aria-label={`${title}: values in ${unit}`}>
      {rows.map(row => <div key={row.label}>
        <dt><span className={styles.swatch} style={{ background: row.color }} aria-hidden="true" />{row.label}</dt>
        <dd>{row.value}{unit === '%' ? '%' : ` ${row.value === 1 ? unit.replace(/s$/, '') : unit}`}</dd>
      </div>)}
    </dl>}
  </section>
}

function hexToRgb(hex) {
  if (!hex) return [0, 82, 204]
  if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
    const parts = hex.match(/\d+/g)
    if (parts && parts.length >= 3) return [parseInt(parts[0], 10), parseInt(parts[1], 10), parseInt(parts[2], 10)]
  }
  const cleanHex = hex.replace('#', '')
  if (cleanHex.length === 3) {
    return [
      parseInt(cleanHex[0] + cleanHex[0], 16),
      parseInt(cleanHex[1] + cleanHex[1], 16),
      parseInt(cleanHex[2] + cleanHex[2], 16)
    ]
  }
  if (cleanHex.length >= 6) {
    return [
      parseInt(cleanHex.substring(0, 2), 16),
      parseInt(cleanHex.substring(2, 4), 16),
      parseInt(cleanHex.substring(4, 6), 16)
    ]
  }
  return [0, 82, 204]
}
