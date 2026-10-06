'use client'
import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import React from 'react'
import { useRouter } from 'next/navigation'
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, useMapEvents, useMap, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.heat'
import wkx from 'wkx'
import { Buffer } from 'buffer'
import { fetchValidatedReports, fetchIssueTypes, fetchClusters } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import OutlierClusterLayer from './OutlierClusterLayer'

// Polyfill Buffer for browser environment
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer
}

const normalizeString = (str) => {
  if (!str) return '';
  return str.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

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

// Removed createClusterIcon in favor of OutlierClusterLayer

const parseGeometry = (geometry) => {
  if (!geometry) return null

  try {
    // 1. Handle Stringified GeoJSON (Add this block)
    if (typeof geometry === 'string' && geometry.startsWith('{')) {
      const geoJSON = JSON.parse(geometry)
      if (geoJSON.type === 'Point' && geoJSON.coordinates) {
        return [geoJSON.coordinates[1], geoJSON.coordinates[0]] // [lat, lng]
      }
    }
    // 2. Handle PostGIS geometry (hex string)
    else if (typeof geometry === 'string') {
      const buffer = Buffer.from(geometry, 'hex')
      const parsed = wkx.Geometry.parse(buffer)
      if (parsed && parsed.x && parsed.y) {
        return [parsed.y, parsed.x] // Leaflet uses [lat, lng]
      }
    }
    // 3. Handle standard GeoJSON Object format
    else if (typeof geometry === 'object' && geometry.type === 'Point') {
      const [lng, lat] = geometry.coordinates
      return [lat, lng]
    }
  } catch (error) {
    console.error('Error parsing geometry:', error)
  }

  return null
}

function MapViewportTracker({ setZoom, setMapBounds }) {
  const timeoutId = useRef(null)

  const map = useMapEvents({
    'moveend zoomend': () => {
      if (timeoutId.current) clearTimeout(timeoutId.current)
      timeoutId.current = setTimeout(() => {
        setZoom(map.getZoom())
        setMapBounds(map.getBounds())
      }, 300) // Debounce viewport updates to prevent aggressive re-renders
    }
  })

  // Initial bounds on mount
  useEffect(() => {
    if (map) {
      setMapBounds(map.getBounds())
    }
    return () => {
      if (timeoutId.current) clearTimeout(timeoutId.current)
    }
  }, [map, setMapBounds])

  return null
}

function MapResizer() {
  const map = useMap()

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize()
    })

    const container = map.getContainer()
    if (container) {
      resizeObserver.observe(container)
    }

    return () => resizeObserver.disconnect()
  }, [map])

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
    let timeoutId
    if (centerLat && centerLng && !hasCentered.current) {
      console.log('Centering map on:', centerLat, centerLng)
      hasCentered.current = true
      timeoutId = setTimeout(() => {
        if (map && map.getContainer && map.getContainer()) {
          map.flyTo([centerLat, centerLng], 17, {
            duration: 1.5
          })
        }
      }, 500)
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [centerLat, centerLng, map])

  return null
}

export default function EcoPinMap({ centerLat, centerLng, focusReportId, initialValidationStatus, initialStatus, selectionMode = false, selectedReports = [], onReportSelect, hideFilterPanel = false, hidePins = false, hideClusters = false, onReportClick, onClusterSelect, children, allowedClusterIds, allowedReportIds, externalStatusFilter, externalIssueTypeFilter, externalShowPins, externalShowClusters, externalShowHeatmap, externalMaxBounds, externalMinZoom, selectedTemplate = 'standard' }) {
  console.log('EcoPinMap props:', { centerLat, centerLng, focusReportId, initialValidationStatus, initialStatus, selectionMode, hideFilterPanel, hidePins, hideClusters, allowedClusterIds, allowedReportIds, externalMaxBounds, externalMinZoom, selectedTemplate })

  const [mounted, setMounted] = useState(false)
  const [reports, setReports] = useState([])
  const [filteredReports, setFilteredReports] = useState([])
  const [removingIds, setRemovingIds] = useState(new Set())
  const [issueTypes, setIssueTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [clusters, setClusters] = useState([])
  const [clusterReports, setClusterReports] = useState({}) // Map of cluster_id -> array of reports
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [mapBounds, setMapBounds] = useState(null)
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

  const renderedClusterIds = useMemo(() => {
    return new Set(filteredClusters.map(c => c.id))
  }, [filteredClusters])

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
  const [showPins, setShowPins] = useState(!hidePins)
  const [showClusters, setShowClusters] = useState(!hideClusters)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [statusFilter, setStatusFilter] = useState(initialStatus || 'all')

  // Map validation status to filter value - Manual_Review should be treated as manual_review
  const getValidationFilterValue = (status) => {
    if (status === 'Manual_Review' || status === 'manual_review') {
      return 'manual_review'
    }
    return status || 'approved'
  }

  const [validationStatusFilter, setValidationStatusFilter] = useState(getValidationFilterValue(initialValidationStatus))
  const [issueTypeFilter, setIssueTypeFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilterPanel, setShowFilterPanel] = useState(true)
  const [isDark, setIsDark] = useState(false)

  // Sync with external props if provided
  useEffect(() => {
    if (externalStatusFilter !== undefined) setStatusFilter(externalStatusFilter)
    if (externalIssueTypeFilter !== undefined) setIssueTypeFilter(externalIssueTypeFilter)
    if (externalShowPins !== undefined) setShowPins(externalShowPins)
    if (externalShowClusters !== undefined) setShowClusters(externalShowClusters)
    if (externalShowHeatmap !== undefined) setShowHeatmap(externalShowHeatmap)
  }, [externalStatusFilter, externalIssueTypeFilter, externalShowPins, externalShowClusters, externalShowHeatmap])

  useEffect(() => {
    const html = document.documentElement
    setIsDark(html.classList.contains('dark'))
    const observer = new MutationObserver(() => {
      setIsDark(html.classList.contains('dark'))
    })
    observer.observe(html, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    import('@/lib/leaflet-fix')
    setMounted(true)

    // Fetch data when component mounts
    console.log(`[EcoPinMap Initial Fetch] Triggering fetch with initialValidationStatusFilter: ${validationStatusFilter}`)
    Promise.all([
      fetchValidatedReports({ validationStatus: validationStatusFilter }),
      fetchIssueTypes(),
      fetchClusters()
    ]).then(([reportsData, typesData, clustersData]) => {
      console.log(`[EcoPinMap Initial Fetch] Successfully fetched ${reportsData?.length || 0} reports`)
      console.log('[EcoPinMap Initial Fetch] Validation statuses in fetched reports:', reportsData.map(r => ({ id: r.id, validation_status: r.validation_status })))
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
          console.log('[EcoPinMap Real-time Fetch] Triggering fetch due to real-time update. Current filter:', validationStatusFilter)
          // Refetch reports when changes occur
          Promise.all([
            fetchValidatedReports({ validationStatus: validationStatusFilter }),
            fetchClusters()
          ]).then(([reportsData, clustersData]) => {
            console.log(`[EcoPinMap Real-time Fetch] Successfully fetched ${reportsData?.length || 0} reports`)
            console.log('[EcoPinMap Real-time Fetch] Validation statuses in fetched reports:', reportsData.map(r => ({ id: r.id, validation_status: r.validation_status })))
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

    if (allowedClusterIds !== undefined || allowedReportIds !== undefined) {
      filtered = filtered.filter(r => {
        const cIdsString = allowedClusterIds ? allowedClusterIds.map(String) : []
        const rIdsString = allowedReportIds ? allowedReportIds.map(String) : []
        const clusterMatch = cIdsString.length > 0 && r.cluster_id && cIdsString.includes(String(r.cluster_id))
        const reportMatch = rIdsString.length > 0 && rIdsString.includes(String(r.id))
        return clusterMatch || reportMatch
      })
    }

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
  }, [statusFilter, issueTypeFilter, startDate, endDate, reports, allowedClusterIds, allowedReportIds])

  // Refetch reports when validation status filter changes
  useEffect(() => {
    if (mounted) {
      console.log(`[EcoPinMap Filter Change] validationStatusFilter changed to: ${validationStatusFilter}. Triggering fetch.`)
      fetchValidatedReports({ validationStatus: validationStatusFilter }).then(reportsData => {
        console.log(`[EcoPinMap Filter Change] Successfully fetched ${reportsData?.length || 0} reports`)
        console.log('[EcoPinMap Filter Change] Validation statuses in fetched reports:', reportsData.map(r => ({ id: r.id, validation_status: r.validation_status })))
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

  // Prepare heat points using Spatial LOD
  const heatPoints = useMemo(() => {
    if (!showHeatmap) return [];

    // Spatial LOD Strategy:
    // Zoom <= 14: Use cluster centers to drastically reduce array size while maintaining density
    if (zoom <= 14) {
      return filteredClusters.map(cluster => {
        const center = parseGeometry(cluster.center);
        if (!center) return null;
        return [center[0], center[1], cluster.report_count]; // [lat, lng, intensity]
      }).filter(Boolean);
    }

    // Zoom > 14: Use individual reports but apply Spatial Hashing to aggregate nearby points
    const hashMap = {};
    processedReportsInfo.parsedReports.forEach(report => {
      const lat = report.parsedLat;
      const lng = report.parsedLng;
      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        // Spatial Hashing: round to 3 decimal places (approx 100m precision)
        const hashLat = lat.toFixed(3);
        const hashLng = lng.toFixed(3);
        const key = `${hashLat},${hashLng}`;

        if (!hashMap[key]) {
          hashMap[key] = { lat: parseFloat(hashLat), lng: parseFloat(hashLng), count: 0 };
        }
        hashMap[key].count += 1; // Accumulate heat intensity
      }
    });

    return Object.values(hashMap).map(p => [p.lat, p.lng, p.count]);
  }, [showHeatmap, zoom, filteredClusters, processedReportsInfo]);

  const handlePopupRouting = useCallback((reportId) => {
    if (onReportClick) {
      onReportClick(reportId)
      return
    }
    router.push(`/dashboard/raw-data/${reportId}`)
  }, [onReportClick, router])

  if (!mounted) return (
    <div className="h-full w-full flex items-center justify-center bg-surface dark:bg-[#000000] transition-colors duration-300">
      <img src="/Solo Logo Light.png" alt="Loading..." className="h-24 w-auto object-contain animate-pulse dark:hidden" />
      <img src="/Solo Logo Dark.png" alt="Loading..." className="h-24 w-auto object-contain animate-pulse hidden dark:block" />
    </div>
  );

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
          // maxBounds={externalMaxBounds}
          // minZoom={externalMinZoom}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <MapResizer />
          <MapViewportTracker setZoom={setZoom} setMapBounds={setMapBounds} />
          {centerLat && centerLng && <MapCenter centerLat={centerLat} centerLng={centerLng} />}
          <TileLayer
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
            className={isDark ? 'dark-mode-tiles' : ''}
          />
          <HeatmapLayer heatPoints={heatPoints} showHeatmap={showHeatmap} />

          {/* Cluster Markers (shown when zoomed out) */}
          {!hideClusters && showClusters && zoom <= 15 && (
            <OutlierClusterLayer
              clusters={filteredClusters}
              selectedTemplate={selectedTemplate}
              selectionMode={selectionMode}
              onClusterSelect={onClusterSelect}
              clusterReportsMap={filteredClusterReports}
              onClusterClick={(clusterId) => {
                if (selectionMode && onClusterSelect) {
                  const memberReports = filteredClusterReports[clusterId]
                  if (memberReports && memberReports.length > 0) {
                    onClusterSelect(memberReports.map(r => r.id))
                  }
                }
              }}
            />
          )}

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
            // Only hide them if the cluster marker is ACTUALLY being rendered
            if (report.cluster_id && renderedClusterIds.has(report.cluster_id) && !hideClusters && showClusters && zoom <= 15) {
              return null
            }

            let latitude = report.parsedLat
            let longitude = report.parsedLng
            let originalLat = latitude
            let originalLng = longitude
            let isSpiderfied = false

            if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
              // Client-side DOM Culling: skip if outside viewport
              // if (mapBounds && !mapBounds.contains([latitude, longitude])) return null

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
                          {report.title}
                        </strong>
                        <p className="text-sm text-text-secondary mt-1">{report.description?.substring(0, 80)}...</p>

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
                          <span className="text-[10px] px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
                            {report.issue_type?.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        {!selectionMode && (
                          <div className="mt-4">
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePopupRouting(report.id); }}
                              className="w-full bg-blue-600 text-white font-medium text-sm py-2 rounded shadow-sm hover:bg-blue-700 transition-colors"
                            >
                              View Full Details
                            </button>
                          </div>
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
          <div className="absolute bottom-6 left-6 right-6 bg-surface-elevated border border-border  z-[1000] p-3 flex flex-col gap-3">

            <div className="flex justify-between items-center border-b border-border pb-2">
              <div className="flex gap-4 items-center">
                <h3 className="font-bold text-text-primary uppercase tracking-widest text-sm">Map Filters</h3>
                <span className="text-xs font-bold font-mono bg-[#ccff00] text-text-primary px-2 py-0.5 border border-border">
                  {loading ? 'LOADING...' : `${filteredReports.length} REPORTS / ${clusters.length} CLUSTERS`}
                </span>
              </div>
              <button
                onClick={() => setShowFilterPanel(false)}
                className="font-bold hover:text-error transition-colors text-sm"
              >
                [ X ]
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">

              {/* Map Layers */}
              <div className="flex items-center gap-3 border-r border-border pr-6">
                {[
                  { label: 'Pins', state: showPins, set: setShowPins },
                  { label: 'Clusters', state: showClusters, set: setShowClusters },
                  { label: 'Heatmap', state: showHeatmap, set: setShowHeatmap },
                ].map(layer => (
                  <label key={layer.label} className="flex items-center gap-1.5 cursor-pointer group">
                    <input type="checkbox" checked={layer.state} onChange={(e) => layer.set(e.target.checked)} className="sr-only" />
                    <div className={`w-4 h-4 border border-border flex items-center justify-center transition-colors ${layer.state ? 'bg-primary border-primary' : 'border-border bg-surface-elevated'}`}>
                      {layer.state && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-surface-elevated border border-border  text-text-primary rounded-xl cursor-pointer focus:outline-none focus:bg-[#ccff00] focus:text-text-primary focus:border-border"
                >
                  <option value="all">ALL</option>
                  <option value="unresolved">UNRESOLVED</option>
                  <option value="in_progress">IN PROGRESS</option>
                  <option value="resolved">RESOLVED</option>
                </select>
              </div>

              {/* Validation */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Validation:</span>
                <select
                  value={validationStatusFilter}
                  onChange={(e) => setValidationStatusFilter(e.target.value)}
                  className="px-2 py-1 text-xs font-bold uppercase tracking-wider bg-surface-elevated border border-border  text-text-primary rounded-xl cursor-pointer focus:outline-none focus:bg-[#ccff00] focus:text-text-primary focus:border-border"
                >
                  <option value="all">ALL</option>
                  <option value="approved">APPROVED</option>
                  <option value="manual_review">MANUAL</option>
                </select>
              </div>

              {/* Issue Type */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Type:</span>
                <select
                  value={issueTypeFilter}
                  onChange={(e) => setIssueTypeFilter(e.target.value)}
                  className="max-w-[150px] px-2 py-1 text-xs font-bold uppercase tracking-wider bg-surface-elevated border border-border  text-text-primary rounded-xl cursor-pointer focus:outline-none focus:bg-[#ccff00] focus:text-text-primary focus:border-border"
                >
                  <option value="all">ALL</option>
                  {issueTypes.map(type => (
                    <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-28 px-2 py-1 text-xs font-bold uppercase bg-surface-elevated border border-border  text-text-primary rounded-xl focus:outline-none focus:bg-[#ccff00] focus:text-text-primary focus:border-border"
                />
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-28 px-2 py-1 text-xs font-bold uppercase bg-surface-elevated border border-border  text-text-primary rounded-xl focus:outline-none focus:bg-[#ccff00] focus:text-text-primary focus:border-border"
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
                  className="ml-auto px-3 py-1.5 text-xs font-bold bg-error text-white uppercase tracking-widest border border-border  hover:bg-error/80 transition-all"
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