'use client'
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import React from 'react'
import { useRouter } from 'next/navigation'
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'
import wkx from 'wkx'
import { Buffer } from 'buffer'
import { fetchValidatedReports, fetchIssueTypes, fetchClusters } from '@/lib/api'
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

export default function EcoPinMap({ centerLat, centerLng, focusReportId, initialValidationStatus, initialStatus, selectionMode = false, selectedReports = [], onReportSelect, hideFilterPanel = false, onReportClick, onClusterSelect }) {
  console.log('EcoPinMap props:', { centerLat, centerLng, focusReportId, initialValidationStatus, initialStatus, selectionMode, hideFilterPanel })
  
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

  const handleMarkerClick = useCallback((reportId) => {
    if (selectionMode && onReportSelect) {
      onReportSelect(reportId)
      return // Don't navigate or call onReportClick in selection mode
    }
    
    if (onReportClick) {
      onReportClick(reportId)
      return // Don't navigate if onReportClick is provided
    }
    
    router.push(`/dashboard/reports/${reportId}`)
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
            url={isDark
              ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
              : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            }
            attribution={isDark
              ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
              : '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            }
          />
          <HeatmapLayer heatPoints={heatPoints} showHeatmap={showHeatmap} />

          {/* Cluster Markers (shown when zoomed out) */}
          {showClusters && zoom <= 15 && filteredClusters.map((cluster) => {
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
                      router.push(`/dashboard/officer/clusters/${cluster.id}`)
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
                          router.push(`/dashboard/officer/clusters/${cluster.id}`)
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
          {showClusters && zoom > 15 && filteredClusters.map((cluster) => {
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
          {showPins && filteredReports.map((report) => {
            // Hide individual pins that belong to clusters when zoomed out AND clusters are enabled
            // Show them when zoomed in OR when clusters are disabled
            if (report.cluster_id && showClusters && zoom <= 15) {
              console.log('Hiding cluster member pin:', report.id, 'cluster_id:', report.cluster_id, 'zoom:', zoom)
              return null
            }
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
              )
            }
            return null
          })}
        </MapContainer>

        {/* Filter Panel Toggle Button */}
        {!hideFilterPanel && !showFilterPanel && (
          <button
            onClick={() => setShowFilterPanel(true)}
            className="absolute top-4 right-4 z-[1001] bg-surface/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-lg px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface hover:shadow-xl transition-all"
          >
            Show Filters
          </button>
        )}

        {/* Filter Panel */}
        {!hideFilterPanel && showFilterPanel && (
          <div className="absolute top-4 right-4 w-72 bg-surface/95 backdrop-blur-md border border-border/50 rounded-2xl shadow-xl max-h-[calc(100%-2rem)] overflow-hidden z-[1000] flex flex-col">
            <div className="sticky top-0 bg-surface/95 backdrop-blur-md px-4 pt-4 pb-3 border-b border-border/50 z-10 rounded-t-2xl flex justify-between items-center">
              <h3 className="font-bold text-text-primary text-base tracking-tight">Map Filters</h3>
              <button
                onClick={() => setShowFilterPanel(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface text-text-muted hover:text-text-primary transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">

            {/* Map Layers */}
            <div className="mb-5">
              <h4 className="text-[11px] font-semibold text-text-muted mb-3 uppercase tracking-widest">Map Layers</h4>
              <div className="space-y-1">
                <label className="flex items-center justify-between cursor-pointer py-1.5 px-2 rounded-lg hover:bg-surface/80 transition-colors group">
                  <span className="text-sm text-text-primary">Report Pins</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={showPins}
                      onChange={(e) => setShowPins(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-10 h-5 rounded-full transition-colors ${showPins ? 'bg-accent-green' : 'bg-text-muted/30'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white dark:bg-surface-elevated rounded-full shadow-sm transition-transform ${showPins ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer py-1.5 px-2 rounded-lg hover:bg-surface/80 transition-colors group">
                  <span className="text-sm text-text-primary">Report Clusters</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={showClusters}
                      onChange={(e) => setShowClusters(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-10 h-5 rounded-full transition-colors ${showClusters ? 'bg-accent-green' : 'bg-text-muted/30'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white dark:bg-surface-elevated rounded-full shadow-sm transition-transform ${showClusters ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer py-1.5 px-2 rounded-lg hover:bg-surface/80 transition-colors group">
                  <span className="text-sm text-text-primary">Heatmap Overlay</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={showHeatmap}
                      onChange={(e) => setShowHeatmap(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-10 h-5 rounded-full transition-colors ${showHeatmap ? 'bg-accent-green' : 'bg-text-muted/30'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white dark:bg-surface-elevated rounded-full shadow-sm transition-transform ${showHeatmap ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Status Filter */}
            <div className="mb-5">
              <h4 className="text-[11px] font-semibold text-text-muted mb-3 uppercase tracking-widest">Status</h4>
              <div className="space-y-1">
                {[
                  { value: 'all', label: 'All', color: null },
                  { value: 'unresolved', label: 'Unresolved', color: 'var(--error)' },
                  { value: 'in_progress', label: 'In Progress', color: 'var(--warning)' },
                  { value: 'resolved', label: 'Resolved', color: 'var(--success)' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                    className={`flex items-center gap-2.5 w-full py-2 px-3 rounded-xl text-sm transition-all ${
                      statusFilter === opt.value
                        ? 'bg-accent-green/10 text-accent-green font-medium'
                        : 'text-text-primary hover:bg-surface/80'
                    }`}
                  >
                    {opt.color && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor: opt.color}}></span>}
                    {!opt.color && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 border-2 border-text-muted"></span>}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Validation Status Filter */}
            <div className="mb-5">
              <h4 className="text-[11px] font-semibold text-text-muted mb-3 uppercase tracking-widest">Validation</h4>
              <div className="space-y-1">
                {[
                  { value: 'validated', label: 'Validated' },
                  { value: 'manual_review', label: 'Pending / Manual Review' },
                  { value: 'all', label: 'All' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setValidationStatusFilter(opt.value)}
                    className={`w-full py-2 px-3 rounded-xl text-sm text-left transition-all ${
                      validationStatusFilter === opt.value
                        ? 'bg-accent-green/10 text-accent-green font-medium'
                        : 'text-text-primary hover:bg-surface/80'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Issue Type Filter */}
            <div className="mb-5">
              <h4 className="text-[11px] font-semibold text-text-muted mb-3 uppercase tracking-widest">Issue Type</h4>
              <select
                value={issueTypeFilter}
                onChange={(e) => setIssueTypeFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface/80 border border-border/50 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-green/20 focus:border-accent-green/40 transition-all appearance-none cursor-pointer"
              >
                <option value="all">All Types</option>
                {issueTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="mb-5">
              <h4 className="text-[11px] font-semibold text-text-muted mb-3 uppercase tracking-widest">Date Range</h4>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] text-text-muted block mb-1.5 uppercase tracking-wide">From</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-surface/80 border border-border/50 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-green/20 focus:border-accent-green/40 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-muted block mb-1.5 uppercase tracking-wide">To</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-surface/80 border border-border/50 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-green/20 focus:border-accent-green/40 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Reset Filters Button */}
            {(statusFilter !== 'all' || validationStatusFilter !== 'all' || issueTypeFilter !== 'all' || startDate || endDate) && (
              <button
                onClick={() => {
                  setStatusFilter('all')
                  setValidationStatusFilter('all')
                  setIssueTypeFilter('all')
                  setStartDate('')
                  setEndDate('')
                }}
                className="btn-secondary whitespace-nowrap cursor-pointer"
              >
                Reset Filters
              </button>
            )}

            {/* Report Count */}
            <div className="pt-4 border-t border-border/50">
              <p className="text-xs text-text-muted text-center">
                {loading ? 'Loading...' : `${filteredReports.length} reports, ${clusters.length} clusters`}
              </p>
            </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}