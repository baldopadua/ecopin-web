'use client'
import { useEffect, useState } from 'react'
import { fetchPublicReports } from '@/lib/api'

export default function ReportsPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublicReports().then(data => {
      setReports(data)
      setLoading(false)
    })
  }, [])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Reports</h1>
        <p className="text-text-secondary">View and manage environmental reports</p>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-text-primary mb-4">Reports List</h2>
        {loading ? (
          <p className="text-text-muted">Loading reports...</p>
        ) : reports.length === 0 ? (
          <p className="text-text-muted">No reports available</p>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text-primary">{report.title}</h3>
                    <p className="text-text-secondary mt-1">{report.description}</p>
                    <div className="mt-2 flex gap-4 text-sm">
                      <span className="text-text-muted">Type: {report.issue_type}</span>
                      <span className="text-text-muted">Status: {report.status}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      report.status === 'resolved' 
                        ? 'bg-green-100 text-green-800' 
                        : report.status === 'in_progress'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {report.status}
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
