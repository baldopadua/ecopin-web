'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchClusters, fetchValidatedReports } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'

export default function ClustersPage() {
  const [clusters, setClusters] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    Promise.all([
      fetchClusters(),
      fetchValidatedReports()
    ]).then(([clustersData, reportsData]) => {
      setClusters(clustersData)
      setReports(reportsData)
      setLoading(false)
    }).catch(error => {
      console.error('Error fetching data:', error)
      setLoading(false)
    })
  }, [])

  const handleRowClick = (clusterId) => {
    router.push(`/dashboard/clusters/${clusterId}`)
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-orange-100 text-orange-800'
      case 'low':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Clusters"
        subtitle="Grouped reports of similar environmental issues"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clusters' }
        ]}
      />

      {/* Clusters List */}
      <div className="card">
        <h2 className="text-xl font-bold text-text-primary mb-4">Clusters List</h2>
        {loading ? (
          <p className="text-text-muted">Loading clusters...</p>
        ) : clusters.length === 0 ? (
          <p className="text-text-muted">No clusters found</p>
        ) : (
          <div className="space-y-4">
            {clusters.map((cluster) => {
              const clusterReports = reports.filter(r => String(r.cluster_id) === String(cluster.id))
              return (
                <div
                  key={cluster.id}
                  className="p-4 border border-border rounded-lg hover:bg-surface cursor-pointer transition-colors"
                  onClick={() => handleRowClick(cluster.id)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-text-primary">Cluster #{cluster.id}</h3>
                      <p className="text-text-secondary mt-1">
                        {cluster.issue_type ? `Issue type: ${cluster.issue_type}` : 'Similar environmental issues'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm">
                        <span className="text-text-muted">
                          {clusterReports.length} reports
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(cluster.severity)}`}>
                        {cluster.severity} severity
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
