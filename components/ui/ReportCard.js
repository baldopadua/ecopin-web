'use client'
import StatusBadge from './StatusBadge'
import { Tag, Calendar, MapPin } from 'lucide-react'

export default function ReportCard({ report, onClick }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div 
      className="card hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-text-primary text-base leading-tight flex-1 mr-2 line-clamp-1">
            {report.title}
          </h3>
          <StatusBadge status={report.status} type="report" />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Tag size={16} aria-hidden="true" />
            <span>{report.issue_type || 'General'}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Calendar size={16} aria-hidden="true" />
            <span>{formatDate(report.created_at)}</span>
          </div>
          
          {report.latitude && report.longitude && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <MapPin size={16} aria-hidden="true" />
              <span className="text-xs">
                {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
