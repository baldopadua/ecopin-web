'use client'
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import React from 'react'
import { useRouter } from 'next/navigation'
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, useMapEvents, useMap, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'
import wkx from 'wkx'
import { Buffer } from 'buffer'
import { fetchValidatedReports, fetchIssueTypes, fetchClusters } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'

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

const createIcon = (status, isRemoving = false, isSelected = false) => {
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

const createClusterIcon = (cluster) => {
  const severity = cluster.severity
  let color = 'var(--warning)' // medium (default)
  if (severity === 'high') color = 'var(--error)'
  if (severity === 'low') color = '#3B82F6'

  const count = cluster.report_count

  return L.divIcon({
    className: 'custom-cluster-marker',
    html: `<div style="background-color: ${color}; width: 50px; height: 50px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; font-size: 16px;">
      ${count}
    </div>`,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
  })
}

const parseGeometry = (geometry) => {
  if (!geometry) return null

  try {
    // Handle PostGIS geometry (hex string)
    if (typeof geometry === 'string') {
      const buffer = Buffer.from(geometry, 'hex')
      const parsed = wkx.Geometry.parse(buffer)
      if (parsed && parsed.x && parsed.y) {
        return [parsed.y, parsed.x] // Leaflet uses [lat, lng]
      }
    }
    // Handle GeoJSON format
    else if (typeof geometry === 'object' && geometry.type === 'Point') {
      const [lng, lat] = geometry.coordinates
      return [lat, lng]
    }
  } catch (error) {
    console.error('Error parsing geometry:', error)
  }

  return null
}

function ZoomTracker({ setZoom }) {
  const map = useMapEvents({
    zoomend: () => {
      const newZoom = map.getZoom()
      console.log('Zoom changed to:', newZoom)
      setZoom(newZoom)
    },
  })
  return null
}

function HeatmapLayer({ heatPoints, showHeatmap }) {
  const map = useMap()
  const heatLayerRef = useRef(null)

  useEffect(() => {
    if (showHeatmap && heatPoints.length > 0) {
      if (!heatLayerRef.current) {
        heatLayerRef.current = L.heatLayer(heatPoints, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          max: 1.0,
          gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
        }).addTo(map)
      } else {
        heatLayerRef.current.setLatLngs(heatPoints)
      }
    } else if (heatLayerRef.current) {
      heatLayerRef.current.remove()
      heatLayerRef.current = null
    }

    return () => {
      try {
        if (heatLayerRef.current && map) {
          map.removeLayer(heatLayerRef.current)
        }
      } catch (e) {
        console.error(e)
      }

      heatLayerRef.current = null
    }
  }, [heatPoints, showHeatmap, map])

  return null
}

function MapCenter({ centerLat, centerLng }) {
  const map = useMap()
  const hasCentered = useRef(false)

  useEffect(() => {
    if (centerLat && centerLng && !hasCentered.current) {
      console.log('Centering map on:', centerLat, centerLng)
      hasCentered.current = true
      setTimeout(() => {
        map.flyTo([centerLat, centerLng], 17, {
          duration: 1.5
        })
      }, 500)
    }
  }, [centerLat, centerLng, map])

  return null
}

export default function EcoPinMap({ centerLat, centerLng, focusReportId, initialValidationStatus, initialStatus, selectionMode = false, selectedReports = [], onReportSelect, hideFilterPanel = false, hidePins = false, hideClusters = false, onReportClick, onClusterSelect, children }) {
  console.log('EcoPinMap props:', { centerLat, centerLng, focusReportId, initialValidationStatus, initialStatus, selectionMode, hideFilterPanel, hidePins, hideClusters })
  
  const [mounted, setMounted] = useState(false)
  const [reports, setReports] = useState([])
  const [filteredReports, setFilteredReports] = useState([])
  const [removingIds, setRemovingIds] = useState(new Set())
  const [issueTypes, setIssueTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [clusters, setClusters] = useState([])
  const [clusterReports, setClusterReports] = useState({}) // Map of cluster_id -> array of reports
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const mapRef = useRef(null)
  const router = useRouter()

  // Convert selectedReports array to Set for internal use
  const selectedReportsSet = useMemo(() => new Set(selectedReports), [selectedReports])

  // Filter clusters to only show those with reports matching current filters and at least 2 reports
  const filteredClusters = useMemo(() => {
    const filteredIds = new Set(filteredReports.filter(r => r.cluster_id).map(r => r.cluster_id))
    return clusters.filter(c => {
      if (!filteredIds.has(c.id)) return false
      // Check both cluster's report_count and actual filtered reports in cluster are >= 2
      const clusterReportsCount = filteredReports.filter(r => r.cluster_id === c.id).length
      return c.report_count >= 2 && clusterReportsCount >= 2
    })
  }, [clusters, filteredReports])

  // Build cluster-to-reports map from filtered reports only
  const filteredClusterReports = useMemo(() => {
    const map = {}
    filteredReports.forEach(report => {
      if (report.cluster_id) {
        if (!map[report.cluster_id]) map[report.cluster_id] = []
        map[report.cluster_id].push(report)
      }
    })
    return map
  }, [filteredReports])

  // Filter states
  const [showPins, setShowPins] = useState(true)
  const [showClusters, setShowClusters] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [statusFilter, setStatusFilter] = useState(initialStatus || 'all')
  
  // Map validation status to filter value - Manual_Review should be treated as manual_review
  const getValidationFilterValue = (status) => {
    if (status === 'Manual_Review' || status === 'manual_review') {
      return 'manual_review'
    }
    return status || 'validated'
  }
  
  const [validationStatusFilter, setValidationStatusFilter] = useState(getValidationFilterValue(initialValidationStatus))
  const [issueTypeFilter, setIssueTypeFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilterPanel, setShowFilterPanel] = useState(true)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const html = document.documentElement
    setIsDark(html.classList.contains('dark'))
    const observer = new MutationObserver(() => {
      setIsDark(html.classList.contains('dark'))
    })
    observer.observe(html, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Prepare heat points from filtered reports
  const heatPoints = filteredReports.map(report => {
    let latitude, longitude
    if (report.latitude && report.longitude) {
      latitude = report.latitude
      longitude = report.longitude
    } else if (report.location) {
      try {
        if (typeof report.location === 'string' && report.location.startsWith('{')) {
          const geoJSON = JSON.parse(report.location)
          if (geoJSON.type === 'Point' && geoJSON.coordinates) {
            longitude = geoJSON.coordinates[0]
            latitude = geoJSON.coordinates[1]
          }
        } else if (typeof report.location === 'string') {
          const buffer = Buffer.from(report.location, 'hex')
          const geometry = wkx.Geometry.parse(buffer)
          if (geometry && geometry.x && geometry.y) {
            longitude = geometry.x
            latitude = geometry.y
          }
        } else if (Buffer.isBuffer(report.location)) {
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
      return [latitude, longitude, 1.0] // [lat, lng, intensity]
    }
    return null
  }).filter(point => point !== null)

  useEffect(() => {
    import('@/lib/leaflet-fix')
    setMounted(true)

    // Fetch data when component mounts
    Promise.all([
      fetchValidatedReports({ validationStatus: validationStatusFilter }),
      fetchIssueTypes(),
      fetchClusters()
    ]).then(([reportsData, typesData, clustersData]) => {
      console.log('Clusters fetched:', clustersData)
      console.log('Reports fetched:', reportsData)
      console.log('Reports with cluster_id:', reportsData.filter(r => r.cluster_id))
      setReports(reportsData)
      setFilteredReports(reportsData)
      setIssueTypes(typesData)
      setClusters(clustersData)

      // Group reports by cluster_id
      const reportsByCluster = {}
      reportsData.forEach(report => {
        if (report.cluster_id) {
          if (!reportsByCluster[report.cluster_id]) {
            reportsByCluster[report.cluster_id] = []
          }
          reportsByCluster[report.cluster_id].push(report)
        }
      })
      console.log('Reports by cluster:', reportsByCluster)
      setClusterReports(reportsByCluster)

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
          Promise.all([
            fetchValidatedReports(),
            fetchClusters()
          ]).then(([reportsData, clustersData]) => {
            setReports(reportsData)
            setClusters(clustersData)

            // Group reports by cluster_id
            const reportsByCluster = {}
            reportsData.forEach(report => {
              if (report.cluster_id) {
                if (!reportsByCluster[report.cluster_id]) {
                  reportsByCluster[report.cluster_id] = []
                }
                reportsByCluster[report.cluster_id].push(report)
              }
            })
            setClusterReports(reportsByCluster)
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
    let filtered = reports.filter(r => r.validation_status !== 'rejected')

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

  // Refetch reports when validation status filter changes
  useEffect(() => {
    if (mounted) {
      fetchValidatedReports({ validationStatus: validationStatusFilter }).then(reportsData => {
        setReports(reportsData)
        setFilteredReports(reportsData)

        // Update clusterReports when validation status filter changes
        const reportsByCluster = {}
        reportsData.forEach(report => {
          if (report.cluster_id) {
            if (!reportsByCluster[report.cluster_id]) {
              reportsByCluster[report.cluster_id] = []
            }
            reportsByCluster[report.cluster_id].push(report)
          }
        })
        setClusterReports(reportsByCluster)
      })
    }
  }, [validationStatusFilter])

  // Pre-process reports to handle exactly overlapping pins (Spiderfy pattern)
  const processedReportsInfo = useMemo(() => {
    const coordsMap = {}
    const parsedReports = filteredReports.map(report => {
      let lat, lng
      if (report.latitude && report.longitude) {
        lat = report.latitude
        lng = report.longitude
      } else if (report.location) {
        try {
          if (typeof report.location === 'string' && report.location.startsWith('{')) {
            const geoJSON = JSON.parse(report.location)
            if (geoJSON.type === 'Point' && geoJSON.coordinates) {
              lng = geoJSON.coordinates[0]
              lat = geoJSON.coordinates[1]
            }
          } else if (typeof report.location === 'string') {
            const buffer = Buffer.from(report.location, 'hex')
            const geometry = wkx.Geometry.parse(buffer)
            if (geometry && geometry.x && geometry.y) {
              lng = geometry.x
              lat = geometry.y
            }
          } else if (Buffer.isBuffer(report.location)) {
            const geometry = wkx.Geometry.parse(report.location)
            if (geometry && geometry.x && geometry.y) {
              lng = geometry.x
              lat = geometry.y
            }
          }
        } catch (error) {
          console.error('Error parsing location for report', report.id, ':', error)
        }
      }

      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        const key = report.cluster_id ? `cluster_${report.cluster_id}` : `coord_${lat.toFixed(4)},${lng.toFixed(4)}`
        if (!coordsMap[key]) coordsMap[key] = []
        coordsMap[key].push(report.id)
      }
      return { ...report, parsedLat: lat, parsedLng: lng }
    })

    return { parsedReports, coordsMap }
  }, [filteredReports])

  const handleMarkerClick = useCallback((reportId) => {
    if (selectionMode && onReportSelect) {
      onReportSelect(reportId)
      return // Don't navigate or call onReportClick in selection mode
    }
    
    if (onReportClick) {
      onReportClick(reportId)
      return // Don't navigate if onReportClick is provided
    }
    
    router.push(`/dashboard/raw-data/${reportId}`)
  }, [selectionMode, onReportSelect, onReportClick, router])

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

        html.dark .leaflet-control-zoom a {
          background-color: #1e1e1e !important;
          color: #e0e0e0 !important;
          border-color: #333 !important;
        }
        html.dark .leaflet-control-zoom a:hover {
          background-color: #2a2a2a !important;
        }
        html.dark .leaflet-control-zoom {
          border-color: #333 !important;
        }
        html.dark .leaflet-control-attribution {
          background-color: rgba(0, 0, 0, 0.7) !important;
          color: #999 !important;
        }
        html.dark .leaflet-control-attribution a {
          color: #aaa !important;
        }
        html.dark .leaflet-popup-content-wrapper {
          background-color: #1e1e1e !important;
          color: #e0e0e0 !important;
          box-shadow: 0 3px 14px rgba(0, 0, 0, 0.5) !important;
        }
        html.dark .leaflet-popup-tip {
          background-color: #1e1e1e !important;
        }
        html.dark .leaflet-popup-close-button {
          color: #999 !important;
        }
        html.dark .leaflet-popup-close-button:hover {
          color: #fff !important;
        }
      `}</style>
      <div className="relative h-full w-full">
        <MapContainer
          key={centerLat && centerLng ? `map-${centerLat}-${centerLng}` : 'ecopin-map'}
          center={centerLat && centerLng ? [centerLat, centerLng] : PLP_CENTER}
          zoom={centerLat && centerLng ? 17 : DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <ZoomTracker setZoom={setZoom} />
          {centerLat && centerLng && <MapCenter centerLat={centerLat} centerLng={centerLng} />}
          <TileLayer
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
            className={isDark ? 'dark-mode-tiles' : ''}
          />
          <HeatmapLayer heatPoints={heatPoints} showHeatmap={showHeatmap} />

          {/* Cluster Markers (shown when zoomed out) */}
          {!hideClusters && showClusters && zoom <= 15 && filteredClusters.map((cluster) => {
            const center = parseGeometry(cluster.center)
            if (!center) return null

            console.log('Rendering cluster marker:', cluster.id, 'zoom:', zoom)
            return (
              <Marker
                key={cluster.id}
                position={center}
                icon={createClusterIcon(cluster)}
                eventHandlers={{
                  mouseover: (e) => {
                    const marker = e.target
                    marker.openPopup()
                  },
                  mouseout: (e) => {
                    const marker = e.target
                    marker.closePopup()
                  },
                  click: () => {
                    if (selectionMode && onClusterSelect) {
                      const memberReports = filteredClusterReports[cluster.id]
                      if (memberReports && memberReports.length > 0) {
                        onClusterSelect(memberReports.map(r => r.id))
                      }
                    } else {
                      router.push(`/dashboard/officer/hotzone-intel/${cluster.id}`)
                    }
                  }
                }}
              >
                <Popup>
                  <div className="p-2">
                    <strong className="block text-sm">Cluster #{cluster.id}</strong>
                    <p className="text-xs text-text-muted mt-1">
                      {cluster.report_count} reports
                    </p>
                    <p className="text-xs text-text-muted">
                      Severity: <span className={`font-semibold ${cluster.severity === 'high' ? 'text-error' :
                        cluster.severity === 'medium' ? 'text-warning' :
                          'text-info'
                        }`}>{cluster.severity}</span>
                    </p>
                    <p className="text-xs text-text-muted">
                      Type: {cluster.issue_type}
                    </p>
                    {center && (
                      <p className="text-xs text-text-muted">
                        Location: {center[0].toFixed(4)}, {center[1].toFixed(4)}
                      </p>
                    )}
                    {selectionMode && onClusterSelect ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const memberReports = filteredClusterReports[cluster.id]
                          if (memberReports && memberReports.length > 0) {
                            onClusterSelect(memberReports.map(r => r.id))
                          }
                        }}
                        className="mt-2 w-full text-xs bg-accent-green text-white py-1 rounded hover:bg-accent-green-dark"
                      >
                        Add All Reports to Task
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/dashboard/officer/hotzone-intel/${cluster.id}`)
                        }}
                        className="mt-2 w-full text-xs bg-accent-green text-white py-1 rounded hover:bg-accent-green-dark"
                      >
                        View All Reports
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {/* Cluster Polygons (shown when zoomed in - connects actual report pins) */}
          {!hideClusters && showClusters && zoom > 15 && filteredClusters.map((cluster) => {
            const memberReports = filteredClusterReports[cluster.id]
            console.log('Cluster polygon check:', cluster.id, 'memberReports:', memberReports, 'zoom:', zoom)
            if (!memberReports || memberReports.length < 2) return null

            // Get coordinates of all member reports
            const polygonPoints = memberReports.map(report => {
              let latitude, longitude

              if (report.latitude && report.longitude) {
                latitude = report.latitude
                longitude = report.longitude
              } else if (report.location) {
                try {
                  if (typeof report.location === 'string' && report.location.startsWith('{')) {
                    const geoJSON = JSON.parse(report.location)
                    if (geoJSON.type === 'Point' && geoJSON.coordinates) {
                      longitude = geoJSON.coordinates[0]
                      latitude = geoJSON.coordinates[1]
                    }
                  } else if (typeof report.location === 'string') {
                    const buffer = Buffer.from(report.location, 'hex')
                    const geometry = wkx.Geometry.parse(buffer)
                    if (geometry && geometry.x && geometry.y) {
                      longitude = geometry.x
                      latitude = geometry.y
                    }
                  } else if (Buffer.isBuffer(report.location)) {
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
                return [latitude, longitude]
              }
              return null
            }).filter(point => point !== null)

            console.log('Cluster', cluster.id, 'polygon points:', polygonPoints.length)
            if (polygonPoints.length < 3) return null

            // Calculate center of points
            const centerLat = polygonPoints.reduce((sum, p) => sum + p[0], 0) / polygonPoints.length
            const centerLng = polygonPoints.reduce((sum, p) => sum + p[1], 0) / polygonPoints.length

            // Sort points by angle around center to prevent self-intersection
            const sortedPoints = [...polygonPoints].sort((a, b) => {
              const angleA = Math.atan2(a[1] - centerLng, a[0] - centerLat)
              const angleB = Math.atan2(b[1] - centerLng, b[0] - centerLat)
              return angleA - angleB
            })

            return (
              <Polygon
                key={`polygon-${cluster.id}`}
                positions={sortedPoints}
                color="var(--error)"
                fillColor="var(--error)"
                fillOpacity={0.2}
                weight={2}
              />
            )
          })}

          {/* Report Pins */}
          {showPins && processedReportsInfo.parsedReports.map((report) => {
            // Hide individual pins that belong to clusters when zoomed out AND clusters are enabled
            // Show them when zoomed in OR when clusters are disabled
            if (report.cluster_id && showClusters && zoom <= 15) {
              return null
            }
            
            let latitude = report.parsedLat
            let longitude = report.parsedLng
            let originalLat = latitude
            let originalLng = longitude
            let isSpiderfied = false

            if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
              // Spiderfy overlapping pins
              const key = report.cluster_id ? `cluster_${report.cluster_id}` : `coord_${latitude.toFixed(4)},${longitude.toFixed(4)}`
              const overlappingIds = processedReportsInfo.coordsMap[key]
              
              if (overlappingIds && overlappingIds.length > 1 && (zoom > 15 || !showClusters)) {
                const index = overlappingIds.indexOf(report.id)
                const total = overlappingIds.length
                
                // Radius scales with zoom so the visual pixel offset remains constant
                const radius = 0.0004 * Math.pow(2, 17 - zoom)
                const angle = (index / total) * Math.PI * 2
                
                latitude += Math.sin(angle) * radius
                longitude += Math.cos(angle) * radius
                isSpiderfied = true
              }
              
              const isRemoving = removingIds.has(report.id)

              return (
                <React.Fragment key={report.id}>
                  {isSpiderfied && (
                    <Polyline 
                      positions={[[originalLat, originalLng], [latitude, longitude]]} 
                      color="var(--text-muted, #999)" 
                      weight={2} 
                      opacity={0.6}
                      dashArray="4 4"
                    />
                  )}
                  <Marker
                    position={[latitude, longitude]}
                  icon={createIcon(report.status, isRemoving, selectedReportsSet.has(report.id))}
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
                      <p className="text-xs text-text-muted mt-1">{report.description?.substring(0, 100)}...</p>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-1 rounded font-semibold border ${
                          report.status === 'resolved' ? 'bg-success/20 text-success border-success/30' :
                          report.status === 'in_progress' ? 'bg-warning/20 text-warning border-warning/30' :
                          report.status === 'waiting_for_feedback' ? 'bg-purple/20 text-purple border-purple/30' :
                          report.status === 'closed' ? 'bg-text-muted/20 text-text-muted border-text-muted/30' :
                          report.status === 'pending_owner_consent' ? 'bg-info/20 text-info border-info/30' :
                            'bg-error/20 text-error border-error/30'
                          }`}>
                          {report.status?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded font-semibold border ${
                          report.validation_status === 'validated' || report.validation_status === 'automatically_valid'
                            ? 'bg-success/20 text-success border-success/30'
                            : report.validation_status === 'manual_review' || report.validation_status === 'Manual_Review'
                            ? 'bg-purple/20 text-purple border-purple/30'
                            : report.validation_status === 'rejected'
                            ? 'bg-error/20 text-error border-error/30'
                            : 'bg-warning/20 text-warning border-warning/30'
                          }`}>
                          {report.validation_status?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className="text-xs px-2 py-1 rounded font-semibold border bg-info/20 text-info border-info/30">
                          {report.issue_type?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                      {!selectionMode && (
                        <button
                          onClick={() => handleMarkerClick(report.id)}
                          className="mt-2 w-full text-xs bg-accent-green text-white py-1 rounded hover:bg-accent-green-dark"
                        >
                          Click to View Details
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
                </React.Fragment>
              )
            }
            return null
          })}
          {children}
        </MapContainer>

        {/* Filter Panel Toggle Button */}
        {!hideFilterPanel && !showFilterPanel && (
          <div className="absolute bottom-6 left-6 z-[1000]">
            <Button
              variant="secondary"
              className="flex items-center gap-2 shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                setShowFilterPanel(true);
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Show Filters
            </Button>
          </div>
        )}
        {/* Filter Panel */}
        {!hideFilterPanel && showFilterPanel && (
          <div className="absolute bottom-6 left-6 right-6 bg-surface-elevated border-4 border-black dark:border-white z-[1000] p-3 flex flex-col gap-3">
            
            <div className="flex justify-between items-center border-b-2 border-border pb-2">
              <div className="flex gap-4 items-center">
                <h3 className="font-black text-text-primary uppercase tracking-widest text-sm">Map Filters</h3>
                <span className="text-xs font-bold font-mono bg-[#ccff00] text-black px-2 py-0.5 border-2 border-black">
                  {loading ? 'LOADING...' : `${filteredReports.length} REPORTS / ${clusters.length} CLUSTERS`}
                </span>
              </div>
              <button
                onClick={() => setShowFilterPanel(false)}
                className="font-black hover:text-error transition-colors text-sm"
              >
                [ X ]
              </button>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              
              {/* Map Layers */}
              <div className="flex items-center gap-3 border-r-2 border-border pr-6">
                  {[
                    { label: 'Pins', state: showPins, set: setShowPins },
                    { label: 'Clusters', state: showClusters, set: setShowClusters },
                    { label: 'Heatmap', state: showHeatmap, set: setShowHeatmap },
                  ].map(layer => (
                    <label key={layer.label} className="flex items-center gap-1.5 cursor-pointer group">
                      <input type="checkbox" checked={layer.state} onChange={(e) => layer.set(e.target.checked)} className="sr-only" />
                      <div className={`w-4 h-4 border-2 flex items-center justify-center transition-colors ${layer.state ? 'bg-primary border-primary' : 'border-border bg-surface-elevated'}`}>
                        {layer.state && (
                          <svg className="w-3 h-3 text-white dark:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider">{layer.label}</span>
                    </label>
                  ))}
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-surface-elevated border-2 border-black dark:border-white text-text-primary rounded-none cursor-pointer focus:outline-none focus:bg-[#ccff00] focus:text-black focus:border-black"
                >
                  <option value="all">ALL</option>
                  <option value="unresolved">UNRESOLVED</option>
                  <option value="in_progress">IN PROGRESS</option>
                  <option value="resolved">RESOLVED</option>
                </select>
              </div>

              {/* Validation */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Validation:</span>
                <select
                  value={validationStatusFilter}
                  onChange={(e) => setValidationStatusFilter(e.target.value)}
                  className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-surface-elevated border-2 border-black dark:border-white text-text-primary rounded-none cursor-pointer focus:outline-none focus:bg-[#ccff00] focus:text-black focus:border-black"
                >
                  <option value="all">ALL</option>
                  <option value="validated">VALIDATED</option>
                  <option value="manual_review">MANUAL</option>
                </select>
              </div>

              {/* Issue Type */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Type:</span>
                <select
                  value={issueTypeFilter}
                  onChange={(e) => setIssueTypeFilter(e.target.value)}
                  className="max-w-[150px] px-2 py-1 text-xs font-bold uppercase tracking-wider bg-surface-elevated border-2 border-black dark:border-white text-text-primary rounded-none cursor-pointer focus:outline-none focus:bg-[#ccff00] focus:text-black focus:border-black"
                >
                  <option value="all">ALL</option>
                  {issueTypes.map(type => (
                    <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-28 px-2 py-1 text-xs font-bold uppercase bg-surface-elevated border-2 border-black dark:border-white text-text-primary rounded-none focus:outline-none focus:bg-[#ccff00] focus:text-black focus:border-black"
                />
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-28 px-2 py-1 text-xs font-bold uppercase bg-surface-elevated border-2 border-black dark:border-white text-text-primary rounded-none focus:outline-none focus:bg-[#ccff00] focus:text-black focus:border-black"
                />
              </div>
              
              {/* Reset Filters */}
              {(statusFilter !== 'all' || validationStatusFilter !== 'all' || issueTypeFilter !== 'all' || startDate || endDate) && (
                <button
                  onClick={() => {
                    setStatusFilter('all')
                    setValidationStatusFilter('all')
                    setIssueTypeFilter('all')
                    setStartDate('')
                    setEndDate('')
                  }}
                  className="ml-auto px-3 py-1.5 text-xs font-black bg-error text-white uppercase tracking-widest border-2 border-black dark:border-white hover:bg-error/80 transition-all"
                >
                  Reset
                </button>
              )}

            </div>
          </div>
        )}
      </div>
    </>
  )
}