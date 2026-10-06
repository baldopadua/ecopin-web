import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { useRouter } from 'next/navigation'

export const createEcoPinIcon = (status, isRemoving = false, isSelected = false) => {
  let color = 'var(--error)' // unresolved
  if (status === 'in_progress') color = 'var(--warning)' // in_progress
  if (status === 'resolved') color = 'var(--success)' // resolved

  // If selected, use a distinct color (purple)
  if (isSelected) color = '#8B5CF6'

  const animation = isRemoving ? 'markerBounceOut 0.3s ease-in forwards' : 'markerBounceIn 0.5s ease-out'

  return L.divIcon({
    className: isRemoving ? 'custom-marker removing' : 'custom-marker',
    html: `<div style="background-color: ${color}; width: ${isSelected ? '48px' : '40px'}; height: ${isSelected ? '48px' : '40px'}; border-radius: 50%; border: ${isSelected ? '4px solid white' : '3px solid white'}; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; animation: ${animation};">
      <img src="/pin-icon.svg" alt="pin" style="width: ${isSelected ? '24px' : '20px'}; height: ${isSelected ? '24px' : '20px'};" />
    </div>`,
    iconSize: [isSelected ? 48 : 40, isSelected ? 48 : 40],
    iconAnchor: [isSelected ? 24 : 20, isSelected ? 24 : 20],
  })
}

export default function EcoPinMarker({ report, position, isRemoving = false, isSelected = false, selectionMode = false, onReportSelect, customUrl }) {
  const router = useRouter()

  const handlePopupRouting = (e, reportId) => {
    e.stopPropagation()
    if (customUrl) {
       router.push(customUrl)
    } else {
       router.push(`/dashboard/raw-data/${reportId}`) // Update to use raw-data route for standard report view
    }
  }

  return (
    <Marker
      position={position}
      icon={createEcoPinIcon(report.status, isRemoving, isSelected)}
      eventHandlers={{
        click: (e) => {
          if (selectionMode && onReportSelect) {
            e.originalEvent.stopPropagation()
            onReportSelect(report.id)
          }
        }
      }}
    >
      <Popup>
        <div className="p-1 min-w-[220px]">
          <div className="text-xs font-semibold text-blue-600 mb-1 tracking-wider uppercase">REPORT #{report.id?.substring(0, 8)}</div>
          <strong className="block text-sm text-gray-800 mb-2 truncate">
            {report.title || (report.issue_type ? report.issue_type.replace(/_/g, ' ') : 'Report Details')}
          </strong>
          {report.description && (
             <p className="text-sm text-text-secondary mt-1">{report.description.substring(0, 80)}...</p>
          )}

          <div className="mt-3 flex gap-2 flex-wrap">
            <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${report.status === 'resolved' ? 'bg-green-100 text-green-700' :
              report.status === 'in_progress' ? 'bg-orange-100 text-orange-700' :
                report.status === 'waiting_for_feedback' ? 'bg-purple-100 text-purple-700' :
                  report.status === 'closed' ? 'bg-gray-100 text-gray-700' :
                    report.status === 'pending_owner_consent' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
              }`}>
              {report.status?.replace(/_/g, ' ').toUpperCase()}
            </span>
            <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${report.validation_status === 'approved' || report.validation_status === 'validated'
              ? 'bg-green-100 text-green-700'
              : report.validation_status === 'manual_review' || report.validation_status === 'Manual_Review'
                ? 'bg-purple-100 text-purple-700'
                : report.validation_status === 'rejected'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
              {report.validation_status?.replace(/_/g, ' ').toUpperCase()}
            </span>
            {report.issue_type && (
               <span className="text-[10px] px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
                 {report.issue_type.replace(/_/g, ' ').toUpperCase()}
               </span>
            )}
          </div>
          {!selectionMode && (
            <div className="mt-4">
              <button
                onClick={(e) => handlePopupRouting(e, report.id)}
                className="w-full bg-blue-600 text-white font-medium text-sm py-2 rounded shadow-sm hover:bg-blue-700 transition-colors"
              >
                {customUrl ? 'View Operation' : 'View Full Details'}
              </button>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  )
}
