'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import wkx from 'wkx'
import { Buffer } from 'buffer'
import { fetchValidatedReports, fetchIssueTypes } from '@/lib/api'
import { supabase } from '@/lib/supabase'

// Polyfill Buffer for browser environment
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer
}

const PLP_CENTER = [14.561433, 121.075636]
const DEFAULT_ZOOM = 15

// area bounds
const PASIG_BOUNDS = [
  [14.52, 121.02], // Southwest
  [14.62, 121.12]  // Northeast
]

const createIcon = (status, isRemoving = false) => {
  let color = '#EF4444' // unresolved
  if (status === 'in_progress') color = '#F59E0B' // in_progress
  if (status === 'resolved') color = '#ADFF2F' // resolved
  
  const animation = isRemoving ? 'markerBounceOut 0.3s ease-in forwards' : 'markerBounceIn 0.5s ease-out'
  
  return L.divIcon({
    className: isRemoving ? 'custom-marker removing' : 'custom-marker',
    html: `<div style="background-color: ${color}; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; animation: ${animation};">
      <img src="/pin-icon.svg" alt="pin" style="width: 20px; height: 20px;" />
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

export default function EcoPinMap() {
  const [mounted, setMounted] = useState(false)
  const [reports, setReports] = useState([])
  const [filteredReports, setFilteredReports] = useState([])
  const [removingIds, setRemovingIds] = useState(new Set())
  const [issueTypes, setIssueTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Filter states
  const [showPins, setShowPins] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [issueTypeFilter, setIssueTypeFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    import('@/lib/leaflet-fix')
    setMounted(true)
    
    // Fetch data when component mounts
    Promise.all([
      fetchValidatedReports(),
      fetchIssueTypes()
    ]).then(([reportsData, typesData]) => {
      setReports(reportsData)
      setFilteredReports(reportsData)
      setIssueTypes(typesData)
      setLoading(false)
    })

    // Set up real-time subscription for reports table 
    const subscription = supabase
      .channel('reports-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes 
          schema: 'public',
          table: 'reports'
        },
        (payload) => {
          console.log('Real-time update received:', payload)
          // Refetch reports when changes occur
          fetchValidatedReports().then(reportsData => {
            setReports(reportsData)
          })
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Apply filters
  useEffect(() => {
    let filtered = reports

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter)
    }

    if (issueTypeFilter !== 'all') {
      filtered = filtered.filter(r => r.issue_type === issueTypeFilter)
    }

    if (startDate) {
      filtered = filtered.filter(r => new Date(r.created_at) >= new Date(startDate))
    }

    if (endDate) {
      filtered = filtered.filter(r => new Date(r.created_at) <= new Date(endDate))
    }

    // Identify reports being removed
    const currentIds = new Set(filtered.map(r => r.id))
    const removedIds = filteredReports
      .filter(r => !currentIds.has(r.id))
      .map(r => r.id)

    if (removedIds.length > 0) {
      setRemovingIds(new Set(removedIds))
      
      // Wait for exit animation to complete
      setTimeout(() => {
        setRemovingIds(new Set())
        setFilteredReports(filtered)
      }, 300)
    } else {
      setFilteredReports(filtered)
    }
  }, [statusFilter, issueTypeFilter, startDate, endDate, reports])

  const handleMarkerClick = (reportId) => {
    router.push(`/dashboard/reports/${reportId}`)
  }

  if (!mounted) return <p>Loading map...</p>

  return (
    <>
      <style jsx global>{`
        @keyframes markerBounceIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes markerBounceOut {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(0);
            opacity: 0;
          }
        }
        .custom-marker div {
          animation: markerBounceIn 0.5s ease-out;
        }
        .custom-marker.removing div {
          animation: markerBounceOut 0.3s ease-in forwards;
        }
      `}</style>
      <div className="relative h-full w-full">
      <MapContainer
        key="ecopin-map"
        center={PLP_CENTER}
        zoom={DEFAULT_ZOOM}
        maxBounds={PASIG_BOUNDS}
        maxBoundsViscosity={1.0}
        minZoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />
        {showPins && filteredReports.map((report) => {
          let latitude, longitude
          
          // reports_view has latitude and longitude columns directly
          if (report.latitude && report.longitude) {
            latitude = report.latitude
            longitude = report.longitude
          }
          // Fallback to parsing location field
          else if (report.location) {
            try {
              // Handle GeoJSON format from reports_view
              if (typeof report.location === 'string' && report.location.startsWith('{')) {
                const geoJSON = JSON.parse(report.location)
                if (geoJSON.type === 'Point' && geoJSON.coordinates) {
                  longitude = geoJSON.coordinates[0]
                  latitude = geoJSON.coordinates[1]
                }
              }
              // Handle hex string format - convert to Buffer first
              else if (typeof report.location === 'string') {
                const buffer = Buffer.from(report.location, 'hex')
                const geometry = wkx.Geometry.parse(buffer)
                if (geometry && geometry.x && geometry.y) {
                  longitude = geometry.x
                  latitude = geometry.y
                }
              }
              // Handle Buffer format
              else if (Buffer.isBuffer(report.location)) {
                const geometry = wkx.Geometry.parse(report.location)
                if (geometry && geometry.x && geometry.y) {
                  longitude = geometry.x
                  latitude = geometry.y
                }
              }
            } catch (error) {
              console.error('Error parsing location for report', report.id, ':', error)
            }
          }

          if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
            const isRemoving = removingIds.has(report.id)
            
            return (
              <Marker 
                key={report.id} 
                position={[latitude, longitude]} 
                icon={createIcon(report.status, isRemoving)}
                eventHandlers={{
                  mouseover: (e) => {
                    const marker = e.target
                    marker.openPopup()
                  },
                  mouseout: (e) => {
                    const marker = e.target
                    marker.closePopup()
                  },
                  click: () => handleMarkerClick(report.id)
                }}
              >
                <Popup>
                  <div className="p-2">
                    <strong className="block text-sm">{report.title}</strong>
                    <p className="text-xs text-gray-600 mt-1">{report.description?.substring(0, 100)}...</p>
                    <div className="mt-2 flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        report.status === 'resolved' ? 'bg-green-100 text-green-800' :
                        report.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {report.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                        {report.issue_type}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleMarkerClick(report.id)}
                      className="mt-2 w-full text-xs bg-accent-green text-white py-1 rounded hover:bg-accent-green-dark"
                    >
                      Click to View Details
                    </button>
                  </div>
                </Popup>
              </Marker>
            )
          }
          return null
        })}
      </MapContainer>

      {/* Filter Panel */}
      <div className="absolute top-4 right-4 w-72 bg-surface-elevated border border-border rounded-lg shadow-lg p-4 max-h-[calc(100vh-2rem)] overflow-y-auto z-[1000]">
        <h3 className="font-bold text-text-primary mb-4">Map Filters</h3>
        
        {/* Map Layers */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-text-secondary mb-2">MAP LAYERS</h4>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showPins}
              onChange={(e) => setShowPins(e.target.checked)}
              className="w-4 h-4 accent-accent-green"
            />
            <span className="text-sm text-text-primary">Report Pins</span>
          </label>
        </div>

        {/* Status Filter */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-text-secondary mb-2">STATUS</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="all"
                checked={statusFilter === 'all'}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-4 h-4 accent-accent-green"
              />
              <span className="text-sm text-text-primary">All</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="unresolved"
                checked={statusFilter === 'unresolved'}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-4 h-4 accent-accent-green"
              />
              <span className="flex items-center gap-2 text-sm text-text-primary">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                Unresolved
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="in_progress"
                checked={statusFilter === 'in_progress'}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-4 h-4 accent-accent-green"
              />
              <span className="flex items-center gap-2 text-sm text-text-primary">
                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                In Progress
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="resolved"
                checked={statusFilter === 'resolved'}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-4 h-4 accent-accent-green"
              />
              <span className="flex items-center gap-2 text-sm text-text-primary">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                Resolved
              </span>
            </label>
          </div>
        </div>

        {/* Issue Type Filter */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-text-secondary mb-2">ISSUE TYPE</h4>
          <select
            value={issueTypeFilter}
            onChange={(e) => setIssueTypeFilter(e.target.value)}
            className="w-full input text-sm"
          >
            <option value="all">All Types</option>
            {issueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-text-secondary mb-2">DATE RANGE</h4>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-text-muted block mb-1">FROM</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full input text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">TO</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full input text-sm"
              />
            </div>
          </div>
        </div>

        {/* Report Count */}
        <div className="pt-4 border-t border-border">
          <p className="text-sm text-text-secondary">
            {loading ? 'Loading...' : `${filteredReports.length} validated reports displayed`}
          </p>
        </div>
      </div>
      </div>
    </>
  )
}