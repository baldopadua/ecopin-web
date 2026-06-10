'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { fetchReportById, fetchReportEvidence, updateReportStatus } from '@/lib/api'
import PageHeader from '@/components/layout/PageHeader'
import wkx from 'wkx'
import { Buffer } from 'buffer'

// Polyfill Buffer for browser environment
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.id
  
  const [report, setReport] = useState(null)
  const [evidence, setEvidence] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchReportById(reportId),
      fetchReportEvidence(reportId)
    ]).then(([reportData, evidenceData]) => {
      console.log('Report data:', reportData)
      console.log('Evidence data:', evidenceData)
      if (reportData) {
        setReport(reportData)
        setEvidence(evidenceData)
      } else {
        setError('Report not found')
      }
      setLoading(false)
    }).catch(err => {
      console.error('Error loading report:', err)
      setError('Failed to load report')
      setLoading(false)
    })
  }, [reportId])

  const parseLocation = (location, latitude, longitude) => {
    // reports_view has latitude and longitude columns directly
    if (latitude && longitude) {
      return { latitude, longitude }
    }
    
    if (!location) return { latitude: null, longitude: null }
    
    try {
      // Handle GeoJSON format from reports_view
      if (typeof location === 'string' && location.startsWith('{')) {
        const geoJSON = JSON.parse(location)
        if (geoJSON.type === 'Point' && geoJSON.coordinates) {
          return { latitude: geoJSON.coordinates[1], longitude: geoJSON.coordinates[0] }
        }
      }
      // Handle hex string format
      else if (typeof location === 'string') {
        const buffer = Buffer.from(location, 'hex')
        const geometry = wkx.Geometry.parse(buffer)
        if (geometry && geometry.x && geometry.y) {
          return { latitude: geometry.y, longitude: geometry.x }
        }
      }
      // Handle Buffer format
      else if (Buffer.isBuffer(location)) {
        const geometry = wkx.Geometry.parse(location)
        if (geometry && geometry.x && geometry.y) {
          return { latitude: geometry.y, longitude: geometry.x }
        }
      }
    } catch (error) {
      console.error('Error parsing location:', error)
    }
    
    return { latitude: null, longitude: null }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default:
        return 'bg-red-100 text-red-800 border-red-300'
    }
  }

  const getValidationColor = (status) => {
    switch (status) {
      case 'validated':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const handleStatusUpdate = async (newStatus) => {
    setUpdatingStatus(true)
    try {
      await updateReportStatus(reportId, newStatus)
      // Refresh report data
      const updatedReport = await fetchReportById(reportId)
      setReport(updatedReport)
      setShowStatusDropdown(false)
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('Failed to update status. Please try again.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <PageHeader 
          title="Report Details"
          subtitle="Loading report information..."
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Reports', href: '/dashboard/reports' },
            { label: 'Details' }
          ]}
        />
        <div className="card">
          <p className="text-text-muted">Loading report details...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="p-8">
        <PageHeader 
          title="Report Details"
          subtitle="Error loading report"
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Reports', href: '/dashboard/reports' },
            { label: 'Details' }
          ]}
        />
        <div className="card">
          <p className="text-error">{error || 'Report not found'}</p>
          <button 
            onClick={() => router.back()}
            className="btn-secondary mt-4"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const location = parseLocation(report.location, report.latitude, report.longitude)
  const dateStr = new Date(report.created_at).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <div className="p-8">
      <PageHeader 
        title="Report Details"
        subtitle="View detailed report information"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Reports', href: '/dashboard/reports' },
          { label: 'Details' }
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Badges */}
          <div className="card">
            <div className="flex justify-between items-start">
              <button 
                onClick={() => router.back()}
                className="btn-secondary text-sm"
              >
                ← Back
              </button>
              <div className="flex gap-3">
                <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(report.status)}`}>
                  {report.status.replace('_', ' ').toUpperCase()}
                </span>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${getValidationColor(report.validation_status)}`}>
                  {report.validation_status === 'validated' ? 'AI VALIDATED' : report.validation_status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Title and Issue Type */}
          <div className="card">
            <h1 className="text-3xl font-bold text-text-primary mb-2">{report.title}</h1>
            <p className="text-lg text-text-secondary">Issue: {report.issue_type || 'General'}</p>
          </div>

          {/* Description */}
          <div className="card">
            <h2 className="text-xl font-bold text-text-primary mb-4">Description</h2>
            <p className="text-text-primary leading-relaxed">
              {report.description || 'No description provided.'}
            </p>
          </div>

          {/* Location and Date */}
          <div className="card">
            <h2 className="text-xl font-bold text-text-primary mb-4">Location & Date</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-green/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-accent-green" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Coordinates</p>
                  <p className="text-text-primary font-medium">
                    {location.latitude && location.longitude 
                      ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                      : 'Location not available'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-green/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-accent-green" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-text-muted">Submitted</p>
                  <p className="text-text-primary font-medium">{dateStr}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Evidence Photos */}
          <div className="card">
            <h2 className="text-xl font-bold text-text-primary mb-4">Evidence Photos</h2>
            {evidence.length === 0 ? (
              <div className="h-48 bg-surface rounded-lg flex items-center justify-center border border-dashed border-border">
                <div className="text-center">
                  <svg className="w-12 h-12 text-text-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-text-muted">No evidence images available</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {evidence.map((img, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={img.url}
                      alt={`Evidence ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setSelectedImage(img.url)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Before & After (if resolved) */}
          {report.status === 'resolved' && (
            <div className="card">
              <h2 className="text-xl font-bold text-text-primary mb-4">Before & After</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-48 bg-surface rounded-lg flex items-center justify-center border border-dashed border-border">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-text-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-text-muted">Before</p>
                  </div>
                </div>
                <div className="h-48 bg-surface rounded-lg flex items-center justify-center border border-dashed border-border">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-text-muted mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-text-muted">After</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Reporter Info */}
          <div className="card">
            <h2 className="text-lg font-bold text-text-primary mb-4">Reporter Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-text-muted">Name</p>
                <p className="text-text-primary font-medium">
                  {report.profiles?.full_name || report.user_full_name || 'Anonymous'}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-muted">User ID</p>
                <p className="text-text-primary font-medium text-sm">{report.user_id || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Report Metadata */}
          <div className="card">
            <h2 className="text-lg font-bold text-text-primary mb-4">Report Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-text-muted">Report ID</p>
                <p className="text-text-primary font-medium text-sm">{report.id}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted">Created</p>
                <p className="text-text-primary font-medium text-sm">{dateStr}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted">Last Updated</p>
                <p className="text-text-primary font-medium text-sm">
                  {new Date(report.updated_at).toLocaleString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* LGU Notes/Updates */}
          <div className="card">
            <h2 className="text-lg font-bold text-text-primary mb-4">LGU Notes & Updates</h2>
            <div className="bg-surface p-4 rounded-lg border border-border">
              <p className="text-text-muted text-sm">
                No LGU notes or updates available for this report yet.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <h2 className="text-lg font-bold text-text-primary mb-4">Actions</h2>
            <div className="space-y-3">
              <div className="relative">
                <button 
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  disabled={updatingStatus}
                  className="btn-primary w-full"
                >
                  {updatingStatus ? 'Updating...' : 'Update Status'}
                </button>
                {showStatusDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded-lg shadow-lg z-10">
                    <button
                      onClick={() => handleStatusUpdate('unresolved')}
                      disabled={report.status === 'unresolved'}
                      className={`w-full px-4 py-3 text-left border-b border-border last:border-b-0 transition-colors ${
                        report.status === 'unresolved'
                          ? 'bg-accent-green/20 text-accent-green font-semibold cursor-not-allowed'
                          : 'text-text-primary hover:bg-accent-green/10'
                      }`}
                    >
                      <span className="font-medium">Unresolved</span>
                      {report.status === 'unresolved'}
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('in_progress')}
                      disabled={report.status === 'in_progress'}
                      className={`w-full px-4 py-3 text-left border-b border-border last:border-b-0 transition-colors ${
                        report.status === 'in_progress'
                          ? 'bg-accent-green/20 text-accent-green font-semibold cursor-not-allowed'
                          : 'text-text-primary hover:bg-accent-green/10'
                      }`}
                    >
                      <span className="font-medium">In Progress</span>
                      {report.status === 'in_progress'}
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('resolved')}
                      disabled={report.status === 'resolved'}
                      className={`w-full px-4 py-3 text-left transition-colors ${
                        report.status === 'resolved'
                          ? 'bg-accent-green/20 text-accent-green font-semibold cursor-not-allowed'
                          : 'text-text-primary hover:bg-accent-green/10'
                      }`}
                    >
                      <span className="font-medium">Resolved</span>
                      {report.status === 'resolved'}
                    </button>
                  </div>
                )}
              </div>
              <button className="btn-secondary w-full">
                Add Note
              </button>
              <button 
                onClick={() => router.push('/dashboard/map-view')}
                className="btn-secondary w-full"
              >
                View on Map
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[2000]"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] p-4">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white text-4xl hover:text-gray-300 transition-colors"
            >
              ×
            </button>
            <img
              src={selectedImage}
              alt="Full size evidence"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  )
}
