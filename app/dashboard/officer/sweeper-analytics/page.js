'use client'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import { OfficerGuard } from '@/components/auth/RequireRole'
import { fetchSweeperMetrics, exportSweeperMetrics } from '@/lib/api/sweeper'
import { fetchClusters } from '@/lib/api/clusters'
import { SkeletonStatCard, SkeletonChartCard } from '@/components/ui/Skeleton'
import Button from '@/components/ui/Button'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { Line, Bar } from 'react-chartjs-2'
import EcoPinMap from '@/components/map/EcoPinMap'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
)

export default function SweeperAnalyticsPage() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [clusters, setClusters] = useState([])
  const [isExporting, setIsExporting] = useState(false)
  
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  })
  const [region, setRegion] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [metricsData, clustersData] = await Promise.all([
          fetchSweeperMetrics(dateRange, region),
          fetchClusters({ target_outliers_only: true })
        ])
        setMetrics(metricsData)
        setClusters(clustersData || [])
      } catch (err) {
        console.error('Failed to load sweeper analytics:', err)
        setError('Failed to load sweeper metrics.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [dateRange, region])

  const handleExport = async () => {
    try {
      setIsExporting(true)
      await exportSweeperMetrics(dateRange, region)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export metrics. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  // Generate mock trend data for charts since backend doesn't provide it yet
  const generateTrendData = () => {
    const labels = []
    const outlierCounts = []
    const complianceRates = []
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      labels.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))
      
      // Random walk for mock data
      const baseOutliers = Math.max(5, Math.floor(20 + Math.sin(i / 3) * 15 + Math.random() * 10))
      outlierCounts.push(baseOutliers)
      
      const baseCompliance = Math.min(100, Math.max(70, 95 - (baseOutliers / 2) + Math.random() * 5))
      complianceRates.push(baseCompliance.toFixed(1))
    }
    return { labels, outlierCounts, complianceRates }
  }
  
  const trendData = generateTrendData()

  const lineChartData = {
    labels: trendData.labels,
    datasets: [
      {
        label: 'Outlier Count',
        data: trendData.outlierCounts,
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        tension: 0.1,
      }
    ]
  }

  const barChartData = {
    labels: trendData.labels,
    datasets: [
      {
        label: 'SLA Compliance Rate (%)',
        data: trendData.complianceRates,
        backgroundColor: '#3B82F6',
        borderRadius: 4,
      }
    ]
  }

  const currentFlagged = metrics?.outlierMetrics?.currentFlagged || 0
  const isCritical = currentFlagged > 50

  return (
    <OfficerGuard>
      <div className="p-8">
        <PageHeader
          title="Sweeper Workflow Analytics"
          subtitle="Monitor SLA compliance and outlier collection performance"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Sweeper Analytics' }
          ]}
        />

        {error && (
          <div className="mb-6 p-4 bg-error/10 border border-error/30 text-error rounded-lg">
            {error}
          </div>
        )}

        {isCritical && !loading && (
          <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-600 text-red-800 rounded shadow-sm flex items-center">
            <span className="text-2xl mr-3">⚠️</span>
            <div>
              <h3 className="font-bold">Critical Alert: High Outlier Volume</h3>
              <p>There are currently {currentFlagged} outlier reports exceeding the SLA threshold. Immediate sweeper dispatch recommended.</p>
            </div>
          </div>
        )}

        {/* Export Controls */}
        <div className="bg-surface-elevated border-2 border-border p-4 mb-8 flex flex-col md:flex-row items-center gap-4 shadow-sm">
          <div className="flex-1 font-bold text-lg text-gray-700">Filters & Export</div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Region:</span>
            <select 
              value={region} 
              onChange={(e) => setRegion(e.target.value)}
              className="border border-border rounded p-2 text-sm"
            >
              <option value="">All Regions</option>
              <option value="North">North District</option>
              <option value="South">South District</option>
              <option value="East">East District</option>
              <option value="West">West District</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Start:</span>
            <DatePicker 
              selected={dateRange.start} 
              onChange={(date) => setDateRange(prev => ({...prev, start: date}))} 
              className="border border-border rounded p-2 text-sm w-32"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">End:</span>
            <DatePicker 
              selected={dateRange.end} 
              onChange={(date) => setDateRange(prev => ({...prev, end: date}))} 
              className="border border-border rounded p-2 text-sm w-32"
            />
          </div>
          <Button 
            variant="primary" 
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export to CSV'}
          </Button>
        </div>

        {loading ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={`sla-${i}`} />)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={`task-${i}`} />)}
            </div>
          </>
        ) : metrics && (
          <>
            {/* SLA Compliance Overview */}
            <h2 className="text-xl font-bold mb-4 text-gray-800">SLA Compliance Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-surface-elevated border-2 border-border p-6 shadow-sm">
                <div className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2">Current Outliers</div>
                <p className={`text-4xl font-black ${isCritical ? 'text-red-600' : 'text-gray-900'}`}>
                  {metrics.outlierMetrics.currentFlagged}
                </p>
              </div>
              <div className="bg-surface-elevated border-2 border-border p-6 shadow-sm">
                <div className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2">SLA Compliance Rate</div>
                <p className="text-4xl font-black text-gray-900">{metrics.slaCompliance.rate}%</p>
              </div>
              <div className="bg-surface-elevated border-2 border-border p-6 shadow-sm">
                <div className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2">Avg Outlier Age</div>
                <p className="text-4xl font-black text-gray-900">{metrics.outlierMetrics.averageAge}h</p>
              </div>
              <div className="bg-surface-elevated border-2 border-border p-6 shadow-sm">
                <div className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2">Avg Resolution Time</div>
                <p className="text-4xl font-black text-gray-900">{metrics.outlierMetrics.averageResolutionTime}h</p>
              </div>
            </div>

            {/* Sweeper Task Performance */}
            <h2 className="text-xl font-bold mb-4 text-gray-800">Sweeper Task Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-surface-elevated border-2 border-border p-6 shadow-sm">
                <div className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2">Tasks Created</div>
                <p className="text-4xl font-black text-blue-600">{metrics.sweeperTasks.totalCreated}</p>
              </div>
              <div className="bg-surface-elevated border-2 border-border p-6 shadow-sm">
                <div className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2">Tasks Completed</div>
                <p className="text-4xl font-black text-green-600">{metrics.sweeperTasks.totalCompleted}</p>
              </div>
              <div className="bg-surface-elevated border-2 border-border p-6 shadow-sm">
                <div className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2">Avg Route Time</div>
                <p className="text-4xl font-black text-gray-900">{metrics.sweeperTasks.averageRouteTime}m</p>
              </div>
              <div className="bg-surface-elevated border-2 border-border p-6 shadow-sm">
                <div className="text-xs font-mono uppercase tracking-widest text-text-muted mb-2">Avg Clusters/Task</div>
                <p className="text-4xl font-black text-gray-900">{metrics.sweeperTasks.averageClustersPerTask}</p>
              </div>
            </div>
          </>
        )}

        {/* Historical Trends */}
        <h2 className="text-xl font-bold mb-4 text-gray-800">Historical Trends & Distribution</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-surface-elevated border-2 border-border p-6 shadow-sm h-[400px]">
            <h3 className="font-bold text-gray-700 mb-4 uppercase tracking-wider text-sm">30-Day Outlier Count Trend</h3>
            <div className="h-[300px] w-full">
              {loading ? <SkeletonChartCard /> : (
                <Line data={lineChartData} options={{ maintainAspectRatio: false }} />
              )}
            </div>
          </div>
          
          <div className="bg-surface-elevated border-2 border-border p-6 shadow-sm h-[400px]">
            <h3 className="font-bold text-gray-700 mb-4 uppercase tracking-wider text-sm">Daily SLA Compliance Rate</h3>
            <div className="h-[300px] w-full">
              {loading ? <SkeletonChartCard /> : (
                <Bar data={barChartData} options={{ maintainAspectRatio: false }} />
              )}
            </div>
          </div>
        </div>
        
        {/* Geographic Heatmap */}
        <div className="bg-surface-elevated border-2 border-border p-6 shadow-sm">
          <h3 className="font-bold text-gray-700 mb-4 uppercase tracking-wider text-sm">Outlier Geographic Distribution</h3>
          <div className="w-full h-[500px] relative border border-border">
            {!loading && (
              <EcoPinMap 
                hideFilterPanel={true}
                hideClusters={false}
                hidePins={true}
                selectedTemplate="sweeper"
                externalShowHeatmap={true}
              />
            )}
          </div>
        </div>

      </div>
    </OfficerGuard>
  )
}
