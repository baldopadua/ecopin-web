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
import { useQueryClient } from '@tanstack/react-query'
import { useDashboardReports, useDashboardClusters } from '@/components/context/DashboardQueryProvider'
import { DASHBOARD_QUERY_KEY } from '@/lib/dashboard-query-client.mjs'
import { supabase } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import OutlierClusterLayer from './OutlierClusterLayer'
import MapSearch from './MapSearch'
import EcoPinMarker from './EcoPinMarker'
import useMapPhotoEvidence from './useMapPhotoEvidence'
import { Filter, Check } from 'lucide-react'
import { reportDiagnostic } from '../../lib/diagnostics.mjs';
import { MAP_LOCATIONS, getDistanceKm } from '@/lib/map-search.mjs';
import { groupNearbyMarkers } from '@/lib/marker-grouping.mjs';
import ClusterMarker from './ClusterMarker';

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
const CLUSTER_EXPAND_ZOOM = 15
// Nearby individual pins collapse into one count marker up to this zoom; closer in, each report shows.
const PIN_GROUP_MAX_ZOOM = 16

// area bounds
const PASIG_BOUNDS = [
  [14.52, 121.02], // Southwest
  [14.62, 121.12]  // Northeast
]

// createIcon moved to EcoPinMarker

const createSearchLocationIcon = (category) => {
  const isAddress = category === 'Address' || category === 'Thoroughfare'
  const bgColor = isAddress ? '#0ea5e9' : '#0052cc'
  const pulseColor = isAddress ? 'rgba(14, 165, 233, 0.35)' : 'rgba(0, 82, 204, 0.35)'

  return L.divIcon({
    className: 'custom-searched-location-pin',
    html: `
      <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
        <span style="position: absolute; width: 38px; height: 38px; border-radius: 9999px; background: ${pulseColor}; animation: pulsePing 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <div style="position: relative; width: 28px; height: 28px; border-radius: 9999px; background: ${bgColor}; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35); border: 2.5px solid white;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
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
    reportDiagnostic('error', 'map', 'Error parsing geometry:', error)
  }

  return null
}

function MapViewportTracker({ setZoom, setMapBounds }) {
  const timeoutId = useRef(null)

  const map = useMapEvents({
    zoom: () => {
      setZoom(map.getZoom())
    },
    zoomend: () => {
      setZoom(map.getZoom())
      if (timeoutId.current) clearTimeout(timeoutId.current)
      setMapBounds(map.getBounds())
    },
    moveend: () => {
      if (timeoutId.current) clearTimeout(timeoutId.current)
      timeoutId.current = setTimeout(() => {
        setZoom(map.getZoom())
        setMapBounds(map.getBounds())
      }, 150)
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
      if (container.clientWidth > 0 && container.clientHeight > 0) map.invalidateSize()
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
    const container = map.getContainer()
    const update = () => {
      if (showHeatmap && heatPoints.length > 0 && container.clientWidth > 0 && container.clientHeight > 0) {
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
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(container)

    return () => {
      observer.disconnect()
      try {
        if (heatLayerRef.current && map) {
          map.removeLayer(heatLayerRef.current)
        }
      } catch (e) {
        reportDiagnostic('error', 'map', e)
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

export default function EcoPinMap({ reports: externalReports, centerLat, centerLng, focusReportId, initialValidationStatus, initialStatus, selectionMode = false, selectedReports = [], onReportSelect, hideFilterPanel = false, hidePins = false, hideClusters = false, onReportClick, onClusterSelect, children, allowedClusterIds, allowedReportIds, externalStatusFilter, externalIssueTypeFilter, externalLocationFilter, externalShowPins, externalShowClusters, externalShowHeatmap, externalMaxBounds, externalMinZoom, selectedTemplate = 'standard', photoPins = false, searchable = false, tasks = [], selectedReportId: externalSelectedReportId }) {

  const [mounted, setMounted] = useState(false)
  const [filteredReports, setFilteredReports] = useState([])
  const [removingIds, setRemovingIds] = useState(new Set())
  const [selectedReportId, setSelectedReportId] = useState(externalSelectedReportId || focusReportId || null)
  const markerRefs = useRef({})
  const reportQuery = useDashboardReports()
  const clusterQuery = useDashboardClusters()
  const queryClient = useQueryClient()
  const clusters = useMemo(() => clusterQuery.data || [], [clusterQuery.data])
  const loading = reportQuery.isPending || clusterQuery.isPending
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

  const activeReportId = externalSelectedReportId !== undefined ? externalSelectedReportId : (selectedReportId || focusReportId)

  useEffect(() => {
    if (activeReportId && markerRefs.current[activeReportId]) {
      markerRefs.current[activeReportId].openPopup()
    }
  }, [activeReportId, filteredReports])

  const handleSearchSelectReport = useCallback((report) => {
    if (!report) return
    setSelectedReportId(report.id)
    if (onReportClick) {
      onReportClick(report)
    }
  }, [onReportClick])

  const handleSearchSelectCluster = useCallback((cluster) => {
    if (!cluster) return
    const memberReports = filteredClusterReports[cluster.id] || []
    if (memberReports.length > 0) {
      setSelectedReportId(memberReports[0].id)
      if (onClusterSelect) {
        onClusterSelect(memberReports.map(r => r.id))
      }
    }
  }, [filteredClusterReports, onClusterSelect])

  const [searchedLocation, setSearchedLocation] = useState(null)
  const searchedLocationRef = useRef(null)

  const handleSearchSelectLocation = useCallback((locationItem) => {
    if (!locationItem || !locationItem.coords) return
    setSearchedLocation(locationItem)
  }, [])

  useEffect(() => {
    if (searchedLocation && searchedLocationRef.current) {
      searchedLocationRef.current.openPopup()
    }
  }, [searchedLocation])

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
  const reports = useMemo(() => {
    const source = externalReports !== undefined ? externalReports : (reportQuery.data || [])
    return source.filter(report =>
      validationStatusFilter === 'all' || (report.validation_status || '').toLowerCase() === validationStatusFilter.toLowerCase()
    )
  }, [externalReports, reportQuery.data, validationStatusFilter])
  const issueTypes = useMemo(() => {
    const source = externalReports !== undefined ? externalReports : (reportQuery.data || [])
    return [...new Set(source.map(report => report.issue_type).filter(Boolean))]
  }, [externalReports, reportQuery.data])
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
          void queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY })
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient])

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

    if (externalLocationFilter && externalLocationFilter !== 'all' && externalLocationFilter !== 'Pasig City (All)') {
      const targetLoc = MAP_LOCATIONS.find(l => l.name.toLowerCase().includes(externalLocationFilter.toLowerCase()))
      if (targetLoc) {
        filtered = filtered.filter(r => {
          let lat = r.latitude != null ? Number(r.latitude) : r.parsedLat
          let lng = r.longitude != null ? Number(r.longitude) : r.parsedLng
          if (!lat || !lng) {
            const geom = parseGeometry(r.location)
            if (geom) { lat = geom[0]; lng = geom[1] }
          }
          if (lat && lng) {
            const dist = getDistanceKm(lat, lng, targetLoc.lat, targetLoc.lng)
            if (dist <= 2.8) return true
          }
          const text = `${r.title || ''} ${r.description || ''} ${r.street_address || ''} ${r.barangay || ''}`.toLowerCase()
          return text.includes(externalLocationFilter.toLowerCase().split(' ')[0])
        })
      }
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
  }, [statusFilter, issueTypeFilter, externalLocationFilter, startDate, endDate, reports, allowedClusterIds, allowedReportIds])

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
          if (typeof report.location === 'object' && report.location !== null && report.location.type === 'Point' && Array.isArray(report.location.coordinates)) {
            lng = report.location.coordinates[0]
            lat = report.location.coordinates[1]
          } else if (typeof report.location === 'string' && report.location.startsWith('{')) {
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
          reportDiagnostic('error', 'map', 'Error parsing location for report', report.id, ':', error)
        }
      }

      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        // Group strictly by identical coordinates (5 decimal places ~= 1.1 meters)
        // so reports with distinct coordinates stay in their actual geographic positions
        const key = `coord_${lat.toFixed(5)},${lng.toFixed(5)}`
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

  const visiblePhotoReports = useMemo(() => !photoPins || !showPins || !mapBounds ? [] : processedReportsInfo.parsedReports.filter(report =>
    Number.isFinite(report.parsedLat) && Number.isFinite(report.parsedLng) && mapBounds.contains([report.parsedLat, report.parsedLng]) &&
    !(report.cluster_id && renderedClusterIds.has(report.cluster_id) && !hideClusters && showClusters && zoom <= CLUSTER_EXPAND_ZOOM)
  ), [photoPins, showPins, mapBounds, processedReportsInfo, renderedClusterIds, hideClusters, showClusters, zoom])
  const pinPhotos = useMapPhotoEvidence(visiblePhotoReports, photoPins)

  // Individual pins that sit close together collapse into a count marker so dense areas stay readable.
  // The active, selected and focused reports always stay as their own pin.
  const pinGroups = useMemo(() => {
    const placeable = !showPins ? [] : processedReportsInfo.parsedReports.filter(report =>
      !(report.cluster_id && renderedClusterIds.has(report.cluster_id) && !hideClusters && showClusters && zoom <= CLUSTER_EXPAND_ZOOM))
    if (zoom > PIN_GROUP_MAX_ZOOM) return placeable.map(report => ({ key: `single:${report.id}`, items: [report] }))
    const keepSingle = new Set([...selectedReportsSet, activeReportId, selectedReportId, focusReportId].filter(Boolean).map(String))
    return groupNearbyMarkers(placeable, { zoom, getPosition: report => [report.parsedLat, report.parsedLng], getId: report => String(report.id), keepSingle })
  }, [showPins, processedReportsInfo, renderedClusterIds, hideClusters, showClusters, zoom, selectedReportsSet, activeReportId, selectedReportId, focusReportId])
  const singleReports = useMemo(() => pinGroups.filter(group => group.items.length === 1).map(group => group.items[0]), [pinGroups])
  const zoomToGroup = useCallback(group => {
    const map = mapRef.current
    if (map) map.fitBounds(group.items.map(report => [report.parsedLat, report.parsedLng]), { padding: [60, 60], maxZoom: PIN_GROUP_MAX_ZOOM + 2 })
  }, [])

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
        @keyframes pulsePing {
          0% {
            transform: scale(0.95);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.6);
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
      <div className="relative h-full w-full isolate z-0">
        <MapContainer
          key={centerLat && centerLng ? `map-${centerLat}-${centerLng}` : 'ecopin-map'}
          center={centerLat && centerLng ? [centerLat, centerLng] : PLP_CENTER}
          zoom={centerLat && centerLng ? 17 : DEFAULT_ZOOM}
          maxZoom={21}
          trackResize={false}
          // maxBounds={externalMaxBounds}
          // minZoom={externalMinZoom}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <MapResizer />
          {searchable && (
            <MapSearch
              reports={processedReportsInfo.parsedReports}
              clusters={filteredClusters}
              tasks={tasks}
              onSelectReport={handleSearchSelectReport}
              onSelectCluster={handleSearchSelectCluster}
              onSelectLocation={handleSearchSelectLocation}
              selectedReportId={activeReportId}
            />
          )}
          <MapViewportTracker setZoom={setZoom} setMapBounds={setMapBounds} />
          <TileLayer
            url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
            maxZoom={21}
            maxNativeZoom={19}
            className={isDark ? 'dark-mode-tiles' : ''}
          />
          <HeatmapLayer heatPoints={heatPoints} showHeatmap={showHeatmap} />

          {/* Active Searched Landmark / Address Pin */}
          {searchedLocation && (
            <Marker
              ref={searchedLocationRef}
              position={searchedLocation.coords}
              icon={createSearchLocationIcon(searchedLocation.category)}
              zIndexOffset={2000}
            >
              <Popup
                className="searched-location-popup"
                autoPan={false}
                onClose={() => setSearchedLocation(null)}
              >
                <div className="p-3 text-xs font-sans min-w-[220px] max-w-[280px]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[#0052cc] dark:text-[#60A5FA] font-bold text-[13px] leading-tight">
                      <span className="truncate">{searchedLocation.title}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#0052cc]/15 text-[#0052cc] dark:text-[#60A5FA] shrink-0">
                      {searchedLocation.category || 'Landmark'}
                    </span>
                  </div>
                  {searchedLocation.subtitle && (
                    <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-300 leading-snug">
                      {searchedLocation.subtitle}
                    </p>
                  )}
                  <div className="mt-2.5 pt-2 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
                    <span>
                      GPS: {Number(searchedLocation.coords[0]).toFixed(4)}, {Number(searchedLocation.coords[1]).toFixed(4)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSearchedLocation(null)}
                      className="text-red-500 hover:text-red-600 font-semibold cursor-pointer"
                    >
                      Clear pin
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Cluster Markers (shown when zoomed out) */}
          {!hideClusters && showClusters && zoom <= CLUSTER_EXPAND_ZOOM && (
            <OutlierClusterLayer
              clusters={filteredClusters}
              selectedTemplate={selectedTemplate}
              selectionMode={selectionMode}
              onClusterSelect={onClusterSelect}
              clusterReportsMap={filteredClusterReports}
              selectedReports={selectedReports}
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
          {!hideClusters && showClusters && zoom > CLUSTER_EXPAND_ZOOM && filteredClusters.map((cluster) => {
            const memberReports = filteredClusterReports[cluster.id]
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
                  reportDiagnostic('error', 'map', 'Error parsing location for report', report.id, ':', error)
                }
              }

              if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
                return [latitude, longitude]
              }
              return null
            }).filter(point => point !== null)

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
          {pinGroups.filter(group => group.items.length > 1).map(group => (
            <ClusterMarker
              key={group.key}
              position={[group.lat, group.lng]}
              count={group.items.length}
              selectedCount={group.items.filter(report => selectedReportsSet.has(report.id)).length}
              overdue={group.items.some(report => report.is_overdue)}
              label="Nearby reports"
              eventHandlers={{ click: () => zoomToGroup(group) }}
            />
          ))}
          {showPins && singleReports.map((report) => {
            // Hide individual pins that belong to clusters when zoomed out AND clusters are enabled
            // Show them when zoomed in OR when clusters are disabled
            // Only hide them if the cluster marker is ACTUALLY being rendered
            if (report.cluster_id && renderedClusterIds.has(report.cluster_id) && !hideClusters && showClusters && zoom <= CLUSTER_EXPAND_ZOOM) {
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

              // Spiderfy only truly overlapping/identical pins
              const key = `coord_${latitude.toFixed(5)},${longitude.toFixed(5)}`
              const overlappingIds = processedReportsInfo.coordsMap[key]

              if (overlappingIds && overlappingIds.length > 1 && (zoom > CLUSTER_EXPAND_ZOOM || !showClusters)) {
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
                  <EcoPinMarker 
                    ref={el => {
                      if (el) markerRefs.current[report.id] = el
                      else delete markerRefs.current[report.id]
                    }}
                    report={report}
                    photoPin={photoPins}
                    photo={pinPhotos[report.id]}
                    position={[latitude, longitude]} 
                    isRemoving={isRemoving} 
                    isSelected={selectedReportsSet.has(report.id) || selectedReportId === report.id || focusReportId === String(report.id)} 
                    selectionMode={selectionMode} 
                    onReportSelect={onReportSelect} 
                  />
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
              <Filter size={16} aria-hidden="true" />
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
                        <Check size={12} strokeWidth={3} className="text-white" aria-hidden="true" />
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
