'use client'
import React, { useEffect, useState, useMemo, useCallback, useRef, useDeferredValue } from 'react'
import { MAP_LOCATIONS as LOCATIONS } from '@/lib/map-search.mjs'
import { publicReportSearchText, matchesGallerySearch } from '@/lib/public-gallery.mjs'
import Link from 'next/link'
import Image from 'next/image'
import { createPinIcon } from '@/components/landing/pinIcon'
import { 
  fetchBatchReportEvidence, 
  getCachedEvidence, 
  hasCachedEvidence,
  fetchBatchReportPublishers,
  getCachedPublisher
} from '@/lib/api/reports'
import { useSearchParams } from 'next/navigation'
import styles from './Explore.module.css'
import PhotoViewer from './PhotoViewer'
import ViewModeSwitch from './ViewModeSwitch'
import GalleryToolbar from './GalleryToolbar'
import StatusTabs from './StatusTabs'
import PublicSelect from '@/components/ui/PublicSelect'
import PublicReportPopup from '@/components/landing/PublicReportPopup'
import ResponseDeadline from '@/components/ui/ResponseDeadline'
import landingStyles from '@/components/landing/LandingPage.module.css'
import { exploreUrl } from '@/lib/explore-url.mjs'
import { formatReportAddress } from '@/lib/format-location.mjs'

import PublicLoadingState from '@/components/ui/PublicLoadingState'
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polygon, 
  Polyline, 
  useMap, 
  useMapEvents 
} from 'react-leaflet'
import L from 'leaflet'
import wkx from 'wkx'
import { Buffer } from 'buffer'
import { fetchReportEvidence, fetchClusters } from '@/lib/api'
import { fetchPublicReportPage, fetchPublicReportById } from '@/lib/api/public-report-page.mjs'
import { supabase } from '@/lib/supabase'
import SecureImage from '@/components/ui/SecureImage'

import { 
  Smartphone,
  Loader2,
  MapPin, 
  Calendar, 
  ChevronDown, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
 
  Search, 
  Compass, 
  FileText, 
  Layers, 
  X, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  ExternalLink,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Download,
  Camera,
  Eye,
  RotateCcw,
  Maximize2,
  LayoutGrid,
  Share2,
  Trash2,
  Droplets,
  Wind,
  Building,
  TreePine,
  CheckCircle,
  User,
  ImageOff
} from 'lucide-react'
import { reportDiagnostic } from '../../lib/diagnostics.mjs';

if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer
}

const PASIG_CENTER = [14.5802, 121.0850]
const DEFAULT_ZOOM = 14
const ISSUE_TYPES = ['waste', 'flooding', 'pollution', 'infrastructure', 'illegal_logging', 'others']



// Haversine distance calculation in kilometers
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 9999
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Verification check: public site strictly displays verified/approved reports to avoid false reports
const isReportVerified = (report) => {
  if (!report) return false
  const val = (report.validation_status || '').toLowerCase().trim()
  if (val === 'manual_review' || val === 'pending' || val === 'rejected') return false
  const stage = (report.stage || '').toLowerCase().trim()
  return (
    val === 'approved' || 
    val === 'validated' || 
    val === 'verified' || 
    stage === 'verified'
  )
}

const getReportImage = (report, evidenceMap = {}) => {
  // Return null if evidence is being fetched but not loaded yet
  if (report?.id && evidenceMap[report.id] === undefined) {
    return null
  }
  if (report?.id && evidenceMap[report.id]?.length > 0) {
    const firstImg = evidenceMap[report.id].find(e => e.resource_type === 'image' || !e.resource_type)
    if (firstImg?.url) return firstImg.url
  }
  const cached = report?.id ? getCachedEvidence(report.id) : null
  if (cached?.length > 0) {
    const firstImg = cached.find(e => e.resource_type === 'image' || !e.resource_type)
    if (firstImg?.url) return firstImg.url
  }
  if (report?.before_photo_url) return report.before_photo_url
  if (report?.after_photo_url) return report.after_photo_url
  // Return null instead of misleading category fallback
  return null
}

// Environmental Severity Metric formatter: properly formats 0-100 scale vs legacy 1-5 scale
const formatSeverityScore = (score) => {
  if (score === null || score === undefined) return null
  const num = Number(score)
  if (isNaN(num)) return String(score)
  // Scores > 5 come from the backend's 0-100 environmental severity metric
  if (num > 5) {
    return `${num}/100`
  }
  // Fallback for legacy 1-5 fixture scores
  return `${num}/5`
}

const geometryCache = new Map()
const parseGeometry = (geometry) => {
  if (!geometry) return null
  if (geometryCache.has(geometry)) return geometryCache.get(geometry)
  try {
    if (typeof geometry === 'string') {
      const buffer = Buffer.from(geometry, 'hex')
      const parsed = wkx.Geometry.parse(buffer)
      if (parsed && parsed.x && parsed.y) {
        const res = [parsed.y, parsed.x]
        geometryCache.set(geometry, res)
        return res
      }
    } else if (typeof geometry === 'object' && geometry.type === 'Point') {
      const [lng, lat] = geometry.coordinates
      const res = [lat, lng]
      geometryCache.set(geometry, res)
      return res
    }
  } catch (error) {}
  geometryCache.set(geometry, null)
  return null
}

function ViewportTracker({ onViewport }) {
  const map = useMap()
  const lastBoundsRef = useRef(null)

  const publishViewport = useCallback(() => {
    if (!map) return
    const bounds = map.getBounds()
    if (!bounds || typeof bounds.getSouth !== 'function') return

    const south = Math.max(-90, bounds.getSouth())
    const north = Math.min(90, bounds.getNorth())
    const west = bounds.getWest()
    const east = bounds.getEast()
    const currentZoom = map.getZoom()

    const last = lastBoundsRef.current
    const EPS = 0.00005
    if (
      last &&
      last.zoom === currentZoom &&
      Math.abs(last.south - south) < EPS &&
      Math.abs(last.north - north) < EPS &&
      Math.abs(last.west - west) < EPS &&
      Math.abs(last.east - east) < EPS
    ) {
      return
    }

    lastBoundsRef.current = { south, north, west, east, zoom: currentZoom }
    onViewport({ south, north, west, east }, currentZoom)
  }, [map, onViewport])
  
  useMapEvents({ 
    moveend: publishViewport, 
    zoomend: publishViewport, 
    resize: publishViewport 
  })
  
  useEffect(() => { 
    publishViewport() 
  }, [publishViewport])
  
  return null
}

function MapController({ selectedCoords }) {
  const map = useMap()
  useEffect(() => {
    if (!selectedCoords) return
    const coords = Array.isArray(selectedCoords) ? selectedCoords : selectedCoords.coords
    if (!coords || !coords[0] || !coords[1]) return

    const isReset = selectedCoords?.isReset
    const targetZoom = (typeof selectedCoords === 'object' && !Array.isArray(selectedCoords) && selectedCoords.zoom)
      ? selectedCoords.zoom
      : (isReset ? DEFAULT_ZOOM : Math.max(map.getZoom(), 15))

    const shouldOffset = typeof selectedCoords === 'object' && !Array.isArray(selectedCoords) && Boolean(selectedCoords.offsetPopup)

    let centerLatLng = coords
    if (shouldOffset) {
      try {
        const mapSize = map.getSize()
        if (mapSize && mapSize.y > 0) {
          // Perfectly center the details popup card in the map viewport:
          // The popup card is ~350px tall and anchored ~50px above the pin.
          // To put the popup card dead-center, offset the pin downwards by (popupHeight / 2) + anchorHeight.
          const idealOffset = 225
          const maxAllowedOffset = Math.max(120, Math.round(mapSize.y * 0.42))
          const pixelOffsetY = Math.min(idealOffset, maxAllowedOffset)

          const targetPoint = map.project(coords, targetZoom)
          const offsetPoint = L.point(targetPoint.x, targetPoint.y - pixelOffsetY)
          centerLatLng = map.unproject(offsetPoint, targetZoom)
        }
      } catch (e) {
        centerLatLng = coords
      }
    }

    const currentZoom = map.getZoom()
    const zoomChanged = targetZoom !== currentZoom

    try {
      map.stop()
    } catch (e) {}

    if (zoomChanged || currentZoom < 14) {
      map.flyTo(centerLatLng, targetZoom, {
        duration: 0.55,
        easeLinearity: 0.25
      })
    } else {
      map.panTo(centerLatLng, {
        animate: true,
        duration: 0.35,
        easeLinearity: 0.25
      })
    }
  }, [selectedCoords, map])
  return null
}


// Heatmap layer using L.heatLayer
function HeatmapLayer({ heatPoints, showHeatmap }) {
  const map = useMap()
  const heatLayerRef = useRef(null)

  useEffect(() => {
    if (!map) return

    if (showHeatmap && heatPoints && heatPoints.length > 0) {
      if (typeof window !== 'undefined' && typeof L !== 'undefined' && typeof L.heatLayer === 'function') {
        if (!heatLayerRef.current) {
          heatLayerRef.current = L.heatLayer(heatPoints, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            max: 1.0,
            gradient: { 0.4: '#0052CC', 0.65: '#22c55e', 1: '#ef4444' }
          }).addTo(map)
        } else {
          heatLayerRef.current.setLatLngs(heatPoints)
        }
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
        reportDiagnostic('error', 'map', e)
      }
      heatLayerRef.current = null
    }
  }, [heatPoints, showHeatmap, map])

  return null
}

// Floating controls placed directly over the map with dark mode support
function FloatingMapControls({ 
  onFindPoi, 
  onSelectCluster,
  poiClusters = [],
  loadingClusters = false,
  poiQuery, 
  setPoiQuery,
  showPoiInput,
  setShowPoiInput
}) {
  const map = useMap()

  // Filter clusters and landmarks based on input query
  const filteredPoiList = useMemo(() => {
    const q = (poiQuery || '').toLowerCase().trim()
    if (!q) return poiClusters
    return poiClusters.filter(item => 
      (item.title || '').toLowerCase().includes(q) ||
      (item.nearbyLandmark || '').toLowerCase().includes(q) ||
      (item.issue_type || '').toLowerCase().includes(q) ||
      (item.severity || '').toLowerCase().includes(q)
    )
  }, [poiClusters, poiQuery])

  return (
    <>
      {/* Top-Left Floating Controls */}
      <div className="absolute top-3 left-3 z-[400] flex flex-wrap items-center gap-2 pointer-events-auto">
        {/* Verified Reports Trust Badge */}
        <div className="flex items-center gap-1.5 bg-white/95 dark:bg-[#1C1C1C]/95 px-3.5 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/40 shadow-sm text-xs font-semibold text-emerald-700 dark:text-emerald-400 select-none">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Verified Reports Only</span>
        </div>

        {/* Find points of interest pill */}
        <div className="relative" data-poi-dropdown>
          <button 
            type="button" 
            onClick={() => setShowPoiInput(!showPoiInput)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border shadow-sm text-xs font-semibold transition-all ${
              showPoiInput 
                ? 'bg-blue-50 dark:bg-[#0052CC]/25 text-blue-900 dark:text-[#60A5FA] border-blue-300 dark:border-[#0052CC]/50' 
                : 'bg-white/95 dark:bg-[#1C1C1C]/95 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#333] hover:text-gray-900 dark:hover:text-white hover:shadow'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            <span>Find points of interest</span>
            {poiClusters.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-[#0052CC]/40 text-[var(--landing-blue)] text-[10px] font-bold rounded-full">
                {poiClusters.length}
              </span>
            )}
          </button>
          
          {showPoiInput && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-[#1C1C1C] rounded-2xl shadow-xl border border-gray-200 dark:border-[#2A2A2A] p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Search cluster or hotspot..."
                  value={poiQuery}
                  onChange={(e) => setPoiQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onFindPoi(poiQuery)
                      setShowPoiInput(false)
                    }
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-transparent text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-[#333] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0052CC]"
                  autoFocus
                />
              </div>

              {/* Fetched Clusters Header */}
              <div className="mt-2.5 px-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <span>Active Clusters & Hotspots</span>
                <span>{filteredPoiList.length} total</span>
              </div>

              {/* Fetched Clusters List */}
              <div className="mt-1.5 max-h-60 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar">
                {loadingClusters ? (
                  <div className="py-4 text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0052CC]" />
                    <span>Fetching cluster points...</span>
                  </div>
                ) : filteredPoiList.length > 0 ? (
                  filteredPoiList.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (onSelectCluster) onSelectCluster(item)
                        setShowPoiInput(false)
                      }}
                      className="w-full text-left px-2.5 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-[#0052CC]/20 hover:text-[#0052CC] dark:hover:text-[#60A5FA] rounded-xl transition-all flex items-start gap-2.5 group border border-transparent hover:border-blue-200 dark:hover:border-blue-900/40"
                    >
                      <div className="p-1.5 rounded-lg bg-blue-100/70 dark:bg-blue-900/40 text-[var(--landing-blue)] mt-0.5 flex-shrink-0 group-hover:bg-[#0052CC] group-hover:text-white transition-colors">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold truncate">{item.title}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-[#0052CC]/20 text-[var(--landing-blue)] flex-shrink-0">
                            {item.report_count} {item.report_count === 1 ? 'report' : 'reports'}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="py-3 text-center text-xs text-gray-400">
                    No matching cluster points found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top-Right Zoom Controls Pill */}
      <div className="absolute top-3 right-3 z-[400] pointer-events-auto">
        <div className="flex items-center bg-white/95 dark:bg-[#1C1C1C]/95 rounded-full border border-gray-200 dark:border-[#333] shadow-sm overflow-hidden text-gray-700 dark:text-gray-200 font-bold divide-x divide-gray-200 dark:divide-[#333] hover:shadow transition-shadow">
          <button 
            type="button" 
            onClick={() => map.zoomOut()}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#2A2A2A] transition-colors text-base active:scale-95"
            title="Zoom out"
          >
            −
          </button>
          <button 
            type="button" 
            onClick={() => map.zoomIn()}
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-[#2A2A2A] transition-colors text-base active:scale-95"
            title="Zoom in"
          >
            +
          </button>
        </div>
      </div>
    </>
  )
}

export default function PublicMap({ theme = 'light' }) {
  const searchParams = useSearchParams()
  const activeNavTab = searchParams.get('view') === 'gallery' ? 'gallery' : 'reports'
  const linkedReportId = searchParams.get('report')
  const [reportLink, setReportLink] = useState(null)
  const [mounted, setMounted] = useState(false)
  const changeMode = mode => {
    setDetailedReport(null)
    window.history.pushState(null, '', exploreUrl(mode, new URLSearchParams(window.location.search)))
  }
  const [reports, setReports] = useState([])
  const [allReports, setAllReports] = useState([])
  const [loadingAllReports, setLoadingAllReports] = useState(true)
  const [galleryLoadError, setGalleryLoadError] = useState(false)
  const [galleryHasMore, setGalleryHasMore] = useState(false)
  const [viewport, setViewport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [issueTypeFilter, setIssueTypeFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [locationFilter, setLocationFilter] = useState('all')
  const [showPins, setShowPins] = useState(true)
  const [showClusters, setShowClusters] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(false)
  
  const [sortBy, setSortBy] = useState('newest')
  
  // Gallery Specific Filter & Search & Lightbox
  const [gallerySearch, setGallerySearch] = useState('')
  const deferredGallerySearch = useDeferredValue(gallerySearch)
  const [galleryStatusFilter, setGalleryStatusFilter] = useState('all') // 'all' | 'resolved' | 'in_progress' | 'unresolved'
  const [galleryCategoryFilter, setGalleryCategoryFilter] = useState('all')
  const [gallerySeverityFilter, setGallerySeverityFilter] = useState('all') // 'all' | 'high' | 'medium' | 'low'
  const [gallerySortBy, setGallerySortBy] = useState('newest') // 'newest' | 'oldest' | 'severity' | 'title'
  const [galleryViewMode, setGalleryViewMode] = useState('grid') // 'grid' | 'showcase'
  const [photoSelection, setPhotoSelection] = useState(null)
  const closePhotoViewer = useCallback(() => setPhotoSelection(null), [setPhotoSelection])
  
  const [evidenceCache, setEvidenceCache] = useState({})
  const [publisherMap, setPublisherMap] = useState({})
   // 'before' | 'after' | 'split'
  const [copiedLinkId, setCopiedLinkId] = useState(null)
  
  // Floating dropdown states
  const [activeFilterDropdown, setActiveFilterDropdown] = useState(null)
  const [showPoiInput, setShowPoiInput] = useState(false)
  const [poiQuery, setPoiQuery] = useState('')
  const [clusters, setClusters] = useState([])
  const [loadingClusters, setLoadingClusters] = useState(false)
  
  // Selection & Details
  const [selectedReportId, setSelectedReportId] = useState(null)
  const [flyCoords, setFlyCoords] = useState(null)
  
  const [detailedReport, setDetailedReport] = useState(null)
  const [detailedEvidence, setDetailedEvidence] = useState([])
  const [loadingEvidence, setLoadingEvidence] = useState(false)

  // Modals
  
  
  const [mobileTab, setMobileTab] = useState('split')

  
  

  const markerRefs = useRef({})
  const isDark = theme === 'dark'

  useEffect(() => {
    if (!linkedReportId) return
    const controller = new AbortController()
    fetchPublicReportById(supabase, linkedReportId, controller.signal).then(async report => {
      if (controller.signal.aborted) return
      setReportLink({ id: linkedReportId, state: report ? 'ready' : 'unavailable' })
      if (!report) return
      setDetailedReport(report)
      setSelectedReportId(report.id)
      setDetailedEvidence([])
      setLoadingEvidence(false)
      if (Number.isFinite(report.latitude) && Number.isFinite(report.longitude)) {
        setFlyCoords({ coords: [report.latitude, report.longitude], zoom: 15, offsetPopup: true })
      }
      if (report.location_precision !== 'exact') return
      setLoadingEvidence(true)
      try {
        const evidence = await fetchReportEvidence(report.id)
        if (!controller.signal.aborted) setDetailedEvidence(evidence || [])
      } catch {
        if (!controller.signal.aborted) setDetailedEvidence([])
      } finally {
        if (!controller.signal.aborted) setLoadingEvidence(false)
      }
    }).catch(() => {
      if (!controller.signal.aborted) setReportLink({ id: linkedReportId, state: 'error' })
    })
    return () => controller.abort()
  }, [linkedReportId, refresh])

  // Initialize client dependencies
  useEffect(() => {
    let active = true
    import('@/lib/leaflet-fix').then(() => { 
      if (typeof window !== 'undefined') {
        try {
          require('leaflet.heat')
        } catch (e) {
          reportDiagnostic('error', 'map', 'Failed to load leaflet.heat', e)
        }
      }
      if (active) setMounted(true) 
    })
    return () => { active = false }
  }, [])
  

  // Fetch all reports across database for global gallery view, location filtering, and accurate city-wide counts
  useEffect(() => {
    let active = true
    const loadAllReports = async () => {
      try {
        setLoadingAllReports(true)
        setGalleryLoadError(false)
        const page = await fetchPublicReportPage(supabase, {
          bounds: { south: -85, north: 85, west: -180, east: 180 },
          status: 'all',
          issueType: 'all',
          limit: 500
        })
        if (active && page.reports) {
          setAllReports(page.reports)
          setGalleryHasMore(page.hasMore)
        }
      } catch (err) {
        if (active) setGalleryLoadError(true)
        reportDiagnostic('error', 'map', 'Failed to load all reports for gallery/city-wide:', err)
      } finally {
        if (active) setLoadingAllReports(false)
      }
    }
    loadAllReports()
    return () => { active = false }
  }, [refresh])

  // Keep map queries bounded; refresh only after the viewport or filters settle.
  useEffect(() => {
    const controller = new AbortController()
    const locationActive = locationFilter !== 'all' && locationFilter !== 'Pasig City (All)'
    if (activeNavTab !== 'reports' || (!locationActive && !viewport)) return () => controller.abort()
    const timer = setTimeout(async () => {
      setLoading(true)
      setLoadError(false)
      try {
        const page = await fetchPublicReportPage(supabase, {
          bounds: locationActive ? { south: -85, north: 85, west: -180, east: 180 } : viewport,
          status: statusFilter, issueType: issueTypeFilter, limit: locationActive ? 500 : 200,
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        setReports(page.reports)
        setHasMore(page.hasMore)
      } catch {
        if (controller.signal.aborted) return
        setReports([])
        setHasMore(false)
        setLoadError(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [viewport, locationFilter, statusFilter, issueTypeFilter, refresh, activeNavTab])
  // Periodic refresh
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') setRefresh(v => v + 1)
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Fetch clusters for Points of Interest and Cluster Layers
  useEffect(() => {
    let active = true
    const loadClusters = async () => {
      setLoadingClusters(true)
      try {
        const data = await fetchClusters()
        if (active && Array.isArray(data)) {
          setClusters(data)
        }
      } catch (err) {
        reportDiagnostic('error', 'map', 'Failed to load clusters for points of interest:', err)
      } finally {
        if (active) setLoadingClusters(false)
      }
    }

    loadClusters()
    return () => { active = false }
  }, [refresh])

  const onViewport = useCallback((nextBounds, nextZoom) => {
    if (!nextBounds) return
    setViewport(prev => {
      if (!prev) return nextBounds
      const EPS = 0.00005
      if (
        Math.abs(prev.south - nextBounds.south) < EPS &&
        Math.abs(prev.north - nextBounds.north) < EPS &&
        Math.abs(prev.west - nextBounds.west) < EPS &&
        Math.abs(prev.east - nextBounds.east) < EPS
      ) {
        return prev
      }
      return nextBounds
    })
    setZoom(prev => (prev === nextZoom ? prev : nextZoom))
  }, [])

  // Dismiss open filter dropdowns and POI search on outside-click or Escape key
  useEffect(() => {
    if (!activeFilterDropdown && !showPoiInput) return
    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-filter-dropdown]')) {
        setActiveFilterDropdown(null)
      }
      if (!e.target.closest('[data-poi-dropdown]')) {
        setShowPoiInput(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveFilterDropdown(null)
        setShowPoiInput(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeFilterDropdown, showPoiInput])

  // Client-side filtering & search (strictly enforces verified reports to eliminate false reports)
  const filteredReports = useMemo(() => {
    let list = (reports || []).filter(isReportVerified)
    
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'unresolved') {
        list = list.filter(r => r.status === 'unresolved' || r.status === 'pending')
      } else if (statusFilter === 'in_progress') {
        list = list.filter(r => r.status === 'in_progress' || r.status === 'investigating' || r.status === 'dispatched')
      } else if (statusFilter === 'resolved') {
        list = list.filter(r => r.status === 'resolved' || r.status === 'completed')
      } else {
        list = list.filter(r => r.status === statusFilter)
      }
    }

    // Issue Type / Category filter
    if (issueTypeFilter !== 'all') {
      list = list.filter(r => r.issue_type === issueTypeFilter)
    }

    // Severity filter (evaluating both severity_level and severity_score)
    if (severityFilter !== 'all') {
      list = list.filter(r => {
        const level = (r.severity_level || '').toLowerCase()
        const score = Number(r.severity_score) || 0
        const isUrgent = r.status === 'urgent'
        const isHigh = level === 'high' || level === 'critical' || (score > 5 ? score >= 60 : score >= 4) || isUrgent
        const isMedium = level === 'medium' || level === 'moderate' || (score > 5 ? (score >= 40 && score < 60) : score === 3)
        const isLow = level === 'low' || level === 'minimal' || (score > 0 && (score > 5 ? score < 40 : score <= 2))

        if (severityFilter === 'urgent' || severityFilter === 'high') return isHigh
        if (severityFilter === 'medium') return isMedium
        if (severityFilter === 'low') return isLow
        return level === severityFilter.toLowerCase()
      })
    }

    // Location filter with proximity check (~2.8km)
    if (locationFilter !== 'all' && locationFilter !== 'Pasig City (All)') {
      const targetLoc = LOCATIONS.find(l => l.name.toLowerCase().includes(locationFilter.toLowerCase()))
      if (targetLoc) {
        list = list.filter(r => {
          let lat = r.latitude || r.parsedLat
          let lng = r.longitude || r.parsedLng
          if (!lat || !lng) {
            const geom = parseGeometry(r.location)
            if (geom) { lat = geom[0]; lng = geom[1] }
          }
          if (lat && lng) {
            const dist = getDistanceKm(lat, lng, targetLoc.lat, targetLoc.lng)
            if (dist <= 2.8) return true
          }
          const text = `${r.title || ''} ${r.description || ''}`.toLowerCase()
          return text.includes(locationFilter.toLowerCase().split(' ')[0])
        })
      }
    }
    

    // Date filtering (custom startDate/endDate or quick presets)
    if (startDate) {
      list = list.filter(r => new Date(r.created_at) >= new Date(startDate))
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      list = list.filter(r => new Date(r.created_at) <= end)
    }
    if (!startDate && !endDate && dateFilter !== 'all') {
      const now = new Date()
      list = list.filter(r => {
        const d = new Date(r.created_at)
        const diffHours = (now - d) / (1000 * 60 * 60)
        if (dateFilter === '24h') return diffHours <= 24
        if (dateFilter === '7d') return diffHours <= 24 * 7
        if (dateFilter === '30d') return diffHours <= 24 * 30
        return true
      })
    }

    return list
  }, [reports, statusFilter, issueTypeFilter, severityFilter, locationFilter, startDate, endDate, dateFilter])

  // Sorted reports for the Results Panel
  const sortedReports = useMemo(() => {
    const list = [...filteredReports]
    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    } else if (sortBy === 'severity') {
      const score = (r) => {
        const level = (r.severity_level || '').toLowerCase()
        const numScore = Number(r.severity_score) || 0
        const isUrgent = r.status === 'urgent'
        if (isUrgent || level === 'critical' || level === 'high' || (numScore > 5 ? numScore >= 60 : numScore >= 4)) {
          return 300 + numScore
        }
        if (level === 'medium' || level === 'moderate' || (numScore > 5 ? (numScore >= 40 && numScore < 60) : numScore === 3)) {
          return 200 + numScore
        }
        return 100 + numScore
      }
      list.sort((a, b) => score(b) - score(a) || new Date(b.created_at) - new Date(a.created_at))
    } else if (sortBy === 'status') {
      const getStatusRank = (status) => {
        const s = (status || '').toLowerCase()
        if (s === 'unresolved' || s === 'pending') return 1
        if (s === 'in_progress' || s === 'investigating' || s === 'dispatched') return 2
        if (s === 'resolved' || s === 'completed') return 3
        return 4
      }
      list.sort((a, b) => getStatusRank(a.status) - getStatusRank(b.status) || new Date(b.created_at) - new Date(a.created_at))
    }
    return list
  }, [filteredReports, sortBy])

  // Category counts across current verified public reports (calculated city-wide when allReports loaded)
  const categoryCounts = useMemo(() => {
    const sourceReports = (allReports && allReports.length > 0) ? allReports : reports
    const verifiedReports = (sourceReports || []).filter(isReportVerified)
    const counts = { all: verifiedReports.length }
    ISSUE_TYPES.forEach(cat => { counts[cat] = 0 })
    verifiedReports.forEach(r => {
      if (r.issue_type && counts[r.issue_type] !== undefined) {
        counts[r.issue_type]++
      }
    })
    return counts
  }, [allReports, reports])

  // Filter counts for badges (strictly across verified reports)
  const filterCounts = useMemo(() => {
    const reps = (reports || []).filter(isReportVerified)
    
    const status = {
      all: reps.length,
      unresolved: reps.filter(r => r.status === 'unresolved' || r.status === 'pending').length,
      in_progress: reps.filter(r => r.status === 'in_progress' || r.status === 'investigating' || r.status === 'dispatched').length,
      resolved: reps.filter(r => r.status === 'resolved' || r.status === 'completed').length,
    }

    const severity = {
      all: reps.length,
      urgent: reps.filter(r => {
        const lvl = (r.severity_level || '').toLowerCase()
        const score = Number(r.severity_score) || 0
        return lvl === 'high' || lvl === 'critical' || lvl === 'urgent' || (score > 5 ? score >= 60 : score >= 4) || r.status === 'urgent'
      }).length,
      medium: reps.filter(r => {
        const lvl = (r.severity_level || '').toLowerCase()
        const score = Number(r.severity_score) || 0
        return lvl === 'medium' || lvl === 'moderate' || (score > 5 ? (score >= 40 && score < 60) : score === 3)
      }).length,
      low: reps.filter(r => {
        const lvl = (r.severity_level || '').toLowerCase()
        const score = Number(r.severity_score) || 0
        return lvl === 'low' || lvl === 'minimal' || (score > 0 && (score > 5 ? score < 40 : score <= 2))
      }).length,
    }

    const category = { all: reps.length }
    ISSUE_TYPES.forEach(cat => {
      category[cat] = reps.filter(r => r.issue_type === cat).length
    })

    return { status, severity, category }
  }, [reports])

  // Location proximity counts (strictly across verified reports)
  const locationCounts = useMemo(() => {
    const sourceReports = allReports.length > 0 ? allReports : reports
    const verifiedReports = (sourceReports || []).filter(isReportVerified)
    const counts = { all: verifiedReports.length }
    LOCATIONS.forEach(loc => {
      if (loc.name === 'Pasig City (All)') {
        counts[loc.name] = verifiedReports.length
      } else {
        counts[loc.name] = verifiedReports.filter(r => {
          let lat = r.latitude, lng = r.longitude
          if (!lat || !lng) {
            const geom = parseGeometry(r.location)
            if (geom) { lat = geom[0]; lng = geom[1] }
          }
          if (lat && lng) {
            if (getDistanceKm(lat, lng, loc.lat, loc.lng) <= 2.8) return true
          }
          const text = `${r.title || ''} ${r.description || ''}`.toLowerCase()
          return text.includes(loc.name.toLowerCase().split(' ')[0])
        }).length
      }
    })
    return counts
  }, [allReports, reports])

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return (
      statusFilter !== 'all' || 
      issueTypeFilter !== 'all' || 
      severityFilter !== 'all' || 
      (locationFilter !== 'all' && locationFilter !== 'Pasig City (All)') || 
      dateFilter !== 'all' || 
      Boolean(startDate) || 
      Boolean(endDate) || 
      !showPins || 
      !showClusters || 
      showHeatmap
    )
  }, [statusFilter, issueTypeFilter, severityFilter, locationFilter, dateFilter, startDate, endDate, showPins, showClusters, showHeatmap])

  // Reset all filters back to default
  const handleResetFilters = useCallback(() => {
    setStatusFilter('all')
    setIssueTypeFilter('all')
    setSeverityFilter('all')
    setLocationFilter('all')
    setDateFilter('all')
    setStartDate('')
    setEndDate('')
    setShowPins(true)
    setShowClusters(true)
    setShowHeatmap(false)
    
    setActiveFilterDropdown(null)
    setFlyCoords({ coords: PASIG_CENTER, zoom: DEFAULT_ZOOM, isReset: true, timestamp: Date.now() })
  }, [setStatusFilter, setIssueTypeFilter, setSeverityFilter, setLocationFilter, setDateFilter, setStartDate, setEndDate, setShowPins, setShowClusters, setShowHeatmap, setActiveFilterDropdown, setFlyCoords])
  const gallerySearchIndex = useMemo(() => new Map((allReports.length ? allReports : reports).map(report => [report.id, publicReportSearchText(report)])), [allReports, reports])
  const galleryReports = useMemo(() => {
    const sourceReports = (allReports && allReports.length > 0) ? allReports : reports
    let list = (sourceReports || []).filter(isReportVerified)
    
    
    if (galleryStatusFilter !== 'all') {
      if (galleryStatusFilter === 'unresolved') {
        list = list.filter(r => r.status === 'unresolved' || r.status === 'pending')
      } else if (galleryStatusFilter === 'in_progress') {
        list = list.filter(r => r.status === 'in_progress' || r.status === 'investigating' || r.status === 'dispatched')
      } else if (galleryStatusFilter === 'resolved') {
        list = list.filter(r => r.status === 'resolved' || r.status === 'completed')
      } else {
        list = list.filter(r => r.status === galleryStatusFilter)
      }
    }

    if (galleryCategoryFilter !== 'all') {
      list = list.filter(r => r.issue_type === galleryCategoryFilter)
    }

    if (gallerySeverityFilter !== 'all') {
      if (gallerySeverityFilter === 'high') {
        list = list.filter(r => {
          const score = Number(r.severity_score) || 0
          return r.severity_level === 'high' || r.severity_level === 'critical' || (score > 5 ? score >= 60 : score >= 4)
        })
      } else if (gallerySeverityFilter === 'medium') {
        list = list.filter(r => {
          const score = Number(r.severity_score) || 0
          return r.severity_level === 'medium' || r.severity_level === 'moderate' || (score > 5 ? (score >= 40 && score < 60) : score === 3)
        })
      } else if (gallerySeverityFilter === 'low') {
        list = list.filter(r => {
          const score = Number(r.severity_score) || 0
          return r.severity_level === 'low' || r.severity_level === 'minimal' || (score > 0 && (score > 5 ? score < 40 : score <= 2))
        })
      }
    }

    if (deferredGallerySearch.trim()) {
      list = list.filter(report => matchesGallerySearch(gallerySearchIndex.get(report.id) || '', deferredGallerySearch))
    }

    // Sort order
    if (gallerySortBy === 'oldest') {
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    } else if (gallerySortBy === 'severity') {
      list.sort((a, b) => (b.severity_score || 0) - (a.severity_score || 0))
    } else if (gallerySortBy === 'title') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    } else {
      // newest
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    }

    return list
  }, [allReports, reports, galleryStatusFilter, galleryCategoryFilter, gallerySeverityFilter, deferredGallerySearch, gallerySearchIndex, gallerySortBy])

  const evidenceReports = activeNavTab === 'gallery' ? galleryReports : sortedReports
  // Fetch only the first visible page of exact public photos, in one request.
  useEffect(() => {
    const photoIds = evidenceReports.slice(0, 24)
      .filter(report => !hasCachedEvidence(report.id) && evidenceCache[report.id] === undefined)
      .map(report => report.id)
    if (!photoIds.length) return
    const controller = new AbortController()
    fetchBatchReportEvidence(photoIds, controller.signal).then(photos => {
      if (controller.signal.aborted) return
      setEvidenceCache(previous => ({ ...previous, ...Object.fromEntries(photoIds.map(id => [id, photos[id] || []])) }))
    }).catch(() => {})
    return () => controller.abort()
  }, [evidenceReports])

  // Batch fetch publisher names and consent for visible public reports
  useEffect(() => {
    const reportIds = evidenceReports.slice(0, 36)
      .filter(report => report?.id && !publisherMap[report.id])
      .map(report => report.id)
    if (!reportIds.length) return
    const controller = new AbortController()
    fetchBatchReportPublishers(reportIds, controller.signal).then(publishers => {
      if (controller.signal.aborted) return
      setPublisherMap(previous => ({ ...previous, ...publishers }))
    }).catch(() => {})
    return () => controller.abort()
  }, [evidenceReports, publisherMap])
  // Keyboard navigation for Lightbox and Details Drawer
  

  // Fetch evidence immediately when lightbox opens on an item
  

  // Share report link handler — uses Web Share API if supported, falls back to clipboard copy
  const handleShareReport = async (report, e) => {
    if (e) e.stopPropagation()
    if (typeof window === 'undefined') return
    const url = window.location.origin + exploreUrl('map', { report: String(report.id) })
    const reportId = report.id
    const shareData = {
      title: `EcoPin Report: ${report.title || 'Environmental Incident'}`,
      text: `Citizen report in Pasig City — track resolution progress on EcoPin!`,
      url,
    }
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(url)
        setCopiedLinkId(reportId)
        setTimeout(() => setCopiedLinkId(id => id === reportId ? null : id), 2200)
      }
    } catch (err) {
      // User cancelled share or clipboard unavailable — try clipboard as last resort
      if (err?.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(url)
          setCopiedLinkId(reportId)
          setTimeout(() => setCopiedLinkId(id => id === reportId ? null : id), 2200)
        } catch {
          // Silent fail — clipboard not available (e.g. non-https)
        }
      }
    }
  }

  // Category Icon helper
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'waste': return <Trash2 className="w-3.5 h-3.5" />
      case 'flooding': return <Droplets className="w-3.5 h-3.5" />
      case 'pollution': return <Wind className="w-3.5 h-3.5" />
      case 'infrastructure': return <Building className="w-3.5 h-3.5" />
      case 'illegal_logging': return <TreePine className="w-3.5 h-3.5" />
      default: return <Sparkles className="w-3.5 h-3.5" />
    }
  }

  // Cluster calculations (merges database clusters and viewport reports in memory)
  const filteredClusters = useMemo(() => {
    const clusterMap = {};

    // 1. Initialize from fetched DB clusters if available
    const safeClusters = Array.isArray(clusters) ? clusters : [];
    safeClusters.forEach(c => {
      let lat = null, lng = null
      if (c.center) {
        const geom = parseGeometry(c.center)
        if (geom) {
          lat = geom[0]
          lng = geom[1]
        }
      } else if (c.centerLat && c.centerLng) {
        lat = c.centerLat
        lng = c.centerLng
      }

      if (lat && lng) {
        clusterMap[c.id] = {
          id: c.id,
          reports: [],
          severity: c.severity || 'low',
          report_count: c.report_count || 0,
          centerLat: lat,
          centerLng: lng,
          label: c.label,
          issue_type: c.issue_type,
          status: c.status
        };
      }
    });

    // 2. Link reports matching cluster_id and dynamically create clusters if not in DB
    const safeReports = Array.isArray(filteredReports) ? filteredReports : [];
    safeReports.forEach(report => {
      if (report.cluster_id) {
        if (!clusterMap[report.cluster_id]) {
          clusterMap[report.cluster_id] = {
            id: report.cluster_id,
            reports: [],
            severity: 'low',
            report_count: 0
          };
        }
        clusterMap[report.cluster_id].reports.push(report);
        if (!safeClusters.some(c => c.id === report.cluster_id)) {
          clusterMap[report.cluster_id].report_count++;
        }
        
        if (report.status === 'urgent' || report.status === 'unresolved') {
          clusterMap[report.cluster_id].severity = 'high';
        } else if (clusterMap[report.cluster_id].severity !== 'high' && report.status === 'in_progress') {
          clusterMap[report.cluster_id].severity = 'medium';
        }
      }
    });
    
    return Object.values(clusterMap).filter(c => c.report_count >= 2).map(c => {
      if (c.centerLat && c.centerLng) return c;
      let sumLat = 0, sumLng = 0;
      let validPoints = 0;
      c.reports.forEach(r => {
        let lat = r.latitude, lng = r.longitude;
        if (!lat || !lng) {
          const geom = parseGeometry(r.location);
          if (geom) { lat = geom[0]; lng = geom[1]; }
        }
        if (lat && lng) {
          sumLat += lat; sumLng += lng; validPoints++;
        }
      });
      c.centerLat = validPoints > 0 ? sumLat / validPoints : null;
      c.centerLng = validPoints > 0 ? sumLng / validPoints : null;
      return c;
    }).filter(c => c.centerLat && c.centerLng);
  }, [clusters, filteredReports]);

  const filteredClusterReports = useMemo(() => {
    const reportMap = {};
    const safeReports = Array.isArray(filteredReports) ? filteredReports : [];
    safeReports.forEach(report => {
      if (report.cluster_id) {
        if (!reportMap[report.cluster_id]) reportMap[report.cluster_id] = [];
        reportMap[report.cluster_id].push(report);
      }
    });
    return reportMap;
  }, [filteredReports]);

  // Pre-calculated polygon geometries to avoid expensive trigonometric sorting during render
  const clusterPolygonData = useMemo(() => {
    return filteredClusters.map((cluster) => {
      const memberReports = filteredClusterReports[cluster.id]
      if (!memberReports || memberReports.length < 3) return null

      const polygonPoints = memberReports.map(report => {
        let latitude = report.latitude, longitude = report.longitude
        if (!latitude || !longitude) {
          const geom = parseGeometry(report.location)
          if (geom) { latitude = geom[0]; longitude = geom[1] }
        }
        return (latitude && longitude) ? [latitude, longitude] : null
      }).filter(Boolean)

      if (polygonPoints.length < 3) return null

      const centerLat = polygonPoints.reduce((s, p) => s + p[0], 0) / polygonPoints.length
      const centerLng = polygonPoints.reduce((s, p) => s + p[1], 0) / polygonPoints.length
      const sortedPoints = [...polygonPoints].sort((a, b) => {
        return Math.atan2(a[1] - centerLng, a[0] - centerLat) - Math.atan2(b[1] - centerLng, b[0] - centerLat)
      })

      return { id: cluster.id, positions: sortedPoints }
    }).filter(Boolean)
  }, [filteredClusters, filteredClusterReports]);

  // Formatted cluster list for Points of Interest
  const poiClusters = useMemo(() => {
    const list = (clusters || []).map(c => {
      let lat = null, lng = null
      if (c.center) {
        const geom = parseGeometry(c.center)
        if (geom) {
          lat = geom[0]
          lng = geom[1]
        }
      } else if (c.centerLat && c.centerLng) {
        lat = c.centerLat
        lng = c.centerLng
      }

      if (lat === null || lng === null) return null

      // Proximity to known Pasig landmarks
      let nearbyLandmark = null
      const sortedLandmarks = LOCATIONS
        .filter(l => l.name !== 'Pasig City (All)')
        .map(l => ({ ...l, dist: getDistanceKm(lat, lng, l.lat, l.lng) }))
        .sort((a, b) => a.dist - b.dist)

      if (sortedLandmarks.length > 0 && sortedLandmarks[0].dist <= 3.5) {
        nearbyLandmark = sortedLandmarks[0].name
      }

      const issue = (c.issue_type || 'Incident').replace(/_/g, ' ')
      const issueFormatted = issue.charAt(0).toUpperCase() + issue.slice(1)
      const count = c.report_count || 0
      
      const title = c.label 
        ? c.label 
        : nearbyLandmark 
          ? `${issueFormatted} Cluster • ${nearbyLandmark}` 
          : `${issueFormatted} Cluster`

      const subtitle = `${count} ${count === 1 ? 'report' : 'verified reports'} • ${c.severity || 'Normal'} priority`

      return {
        id: c.id,
        title,
        subtitle,
        issue_type: c.issue_type,
        severity: c.severity,
        report_count: count,
        status: c.status,
        lat,
        lng,
        nearbyLandmark,
        raw: c
      }
    }).filter(Boolean)

    // Merge any clusters derived from filteredReports not already in DB clusters
    filteredClusters.forEach(fc => {
      if (!list.some(item => item.id === fc.id) && fc.centerLat && fc.centerLng) {
        let nearbyLandmark = null
        const sortedLandmarks = LOCATIONS
          .filter(l => l.name !== 'Pasig City (All)')
          .map(l => ({ ...l, dist: getDistanceKm(fc.centerLat, fc.centerLng, l.lat, l.lng) }))
          .sort((a, b) => a.dist - b.dist)

        if (sortedLandmarks.length > 0 && sortedLandmarks[0].dist <= 3.5) {
          nearbyLandmark = sortedLandmarks[0].name
        }

        const count = fc.report_count || fc.reports?.length || 0
        list.push({
          id: fc.id,
          title: nearbyLandmark ? `Incident Cluster • ${nearbyLandmark}` : `Active Cluster (${count} reports)`,
          subtitle: `${count} verified reports`,
          issue_type: fc.reports?.[0]?.issue_type || 'waste',
          severity: fc.severity || 'medium',
          report_count: count,
          status: 'active',
          lat: fc.centerLat,
          lng: fc.centerLng,
          nearbyLandmark,
          raw: fc
        })
      }
    })

    return list
  }, [clusters, filteredClusters])

  // Parsed reports and spiderfy logic
  const processedReportsInfo = useMemo(() => {
    const coordsMap = {}
    const parsedReports = filteredReports.map(report => {
      let lat, lng
      if (report.latitude && report.longitude) {
        lat = report.latitude
        lng = report.longitude
      } else if (report.location) {
        const geom = parseGeometry(report.location)
        if (geom) { lat = geom[0]; lng = geom[1] }
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

  // Heatmap points with Spatial LOD Strategy (cluster centers for zoom <= 14, spatial hashing for zoom > 14)
  const heatPoints = useMemo(() => {
    if (!showHeatmap) return []

    if (zoom <= 14 && filteredClusters.length > 0) {
      return filteredClusters.map(cluster => {
        if (!cluster.centerLat || !cluster.centerLng) return null
        return [cluster.centerLat, cluster.centerLng, cluster.report_count]
      }).filter(Boolean)
    }

    const hashMap = {}
    processedReportsInfo.parsedReports.forEach(report => {
      const lat = report.parsedLat
      const lng = report.parsedLng
      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        const hashLat = lat.toFixed(3)
        const hashLng = lng.toFixed(3)
        const key = `${hashLat},${hashLng}`

        if (!hashMap[key]) {
          hashMap[key] = { lat: parseFloat(hashLat), lng: parseFloat(hashLng), count: 0 }
        }
        hashMap[key].count += 1
      }
    })

    return Object.values(hashMap).map(p => [p.lat, p.lng, p.count])
  }, [showHeatmap, zoom, filteredClusters, processedReportsInfo])

  // Selecting a report: centers map smoothly with popup clearance, highlights card, opens popup
  const handleSelectReport = useCallback((report, customCoords = null) => {
    if (!report) return
    setSelectedReportId(report.id)
    const lat = customCoords ? customCoords[0] : (report.parsedLat || report.latitude)
    const lng = customCoords ? customCoords[1] : (report.parsedLng || report.longitude)
    if (lat && lng) {
      setFlyCoords({
        coords: [lat, lng],
        offsetPopup: true,
        timestamp: Date.now()
      })
    }
    
    // Scroll card into view on right side
    const cardEl = document.getElementById(`report-card-${report.id}`)
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [])

  // Open marker popup when selectedReportId changes (if not already opened by direct marker click)
  useEffect(() => {
    if (!selectedReportId) return
    const marker = markerRefs.current?.[selectedReportId]
    if (marker && !marker.isPopupOpen()) {
      const timer = setTimeout(() => {
        if (marker && !marker.isPopupOpen()) {
          marker.openPopup()
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [selectedReportId])

  // Jump from Gallery to Map (navigates to map view, centers pin, and opens sidebar details mini)
  const handleJumpToMap = (report) => {
    if (!report) return
    changeMode('map')
    handleViewDetails(report)
    setTimeout(() => {
      handleSelectReport(report)
    }, 150)
  }

  // Detailed Sidebar View / Evidence fetching
  const handleViewDetails = async (report) => {
    if (!report) return
    const cachedPub = publisherMap[report.id] || getCachedPublisher(report.id)
    const enrichedReport = cachedPub ? { ...report, ...cachedPub } : report
    setDetailedReport(enrichedReport)
    if (!cachedPub) {
      fetchBatchReportPublishers([report.id]).then(pubData => {
        if (pubData && pubData[report.id]) {
          setPublisherMap(prev => ({ ...prev, [report.id]: pubData[report.id] }))
          setDetailedReport(prev => (prev?.id === report.id ? { ...prev, ...pubData[report.id] } : prev))
        }
      }).catch(() => {})
    }
    if (mobileTab === 'map') {
      setMobileTab('list')
    }
    if (report.location_precision === 'approximate') {
      setDetailedEvidence([])
      setLoadingEvidence(false)
      return
    }
    const cached = evidenceCache[report.id] || getCachedEvidence(report.id)
    if (cached) {
      setDetailedEvidence(cached)
      setLoadingEvidence(false)
      return
    }
    setDetailedEvidence([])
    setLoadingEvidence(true)
    try {
      const evidence = await fetchReportEvidence(report.id)
      setDetailedEvidence(evidence || [])
      setEvidenceCache(prev => ({ ...prev, [report.id]: evidence || [] }))
    } catch (e) {
      reportDiagnostic('error', 'map', e)
    } finally {
      setLoadingEvidence(false)
    }
  }

  // Location flying
  const handleFlyToLocation = (locName) => {
    if (locName === 'all' || locName === 'Pasig City (All)') {
      setFlyCoords(previous => ({ coords: PASIG_CENTER, zoom: DEFAULT_ZOOM, isReset: true, timestamp: (previous?.timestamp || 0) + 1 }))
      return
    }
    const target = LOCATIONS.find(l => l.name.toLowerCase().includes(locName.toLowerCase()))
    if (target) {
      setFlyCoords(previous => ({ coords: [target.lat, target.lng], zoom: 15, timestamp: (previous?.timestamp || 0) + 1 }))
    }
  }

  // Handle cluster selection from Points of Interest
  const handleSelectClusterPoi = useCallback((clusterItem) => {
    if (!clusterItem || !clusterItem.lat || !clusterItem.lng) return
    setPoiQuery(clusterItem.title)

    // Check if there is an existing report matching this cluster in memory
    const matchingReport = filteredReports.find(r => r.cluster_id === clusterItem.id)
    if (matchingReport) {
      handleSelectReport(matchingReport, [clusterItem.lat, clusterItem.lng])
    } else {
      setFlyCoords({ coords: [clusterItem.lat, clusterItem.lng], zoom: 15, timestamp: Date.now() })
    }
  }, [filteredReports, handleSelectReport])

  // Find POI search (searches fetched cluster points of interest, landmarks, and reports)
  const handleFindPoi = useCallback((query) => {
    if (!query) return
    const q = query.toLowerCase().trim()

    // 1. Check fetched clusters first
    const clusterMatch = poiClusters.find(c => 
      (c.title || '').toLowerCase().includes(q) ||
      (c.nearbyLandmark || '').toLowerCase().includes(q) ||
      (c.issue_type || '').toLowerCase().includes(q)
    )
    if (clusterMatch) {
      handleSelectClusterPoi(clusterMatch)
      return
    }

    // 2. Check static city landmarks
    const match = LOCATIONS.find(l => l.name.toLowerCase().includes(q))
    if (match) {
      setFlyCoords({ coords: [match.lat, match.lng], zoom: 15, timestamp: Date.now() })
      return
    }

    // 3. Check reports
    const found = processedReportsInfo.parsedReports.find(r => 
      (r.title || '').toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q)
    )
    if (found && found.parsedLat && found.parsedLng) {
      handleSelectReport(found)
    }
  }, [poiClusters, handleSelectClusterPoi, processedReportsInfo, handleSelectReport])

  // Reusable Google Maps-style Sidebar Details Panel (rendered in Map view right sidebar & Gallery slide-over)
  const renderReportDetailsSidebar = () => {
    if (!detailedReport) return null

    return (
      <div className="h-full flex flex-col min-h-0 bg-white dark:bg-[#1C1C1C] animate-sidebar-slide-in">
        {/* Top Details Header Bar */}
        <div className="px-4 py-3 border-b border-gray-200/80 dark:border-[#2A2A2A] flex items-center justify-between gap-2 bg-white/95 dark:bg-[#1C1C1C]/95 backdrop-blur-md flex-shrink-0 z-10">
          <button
            type="button"
            onClick={() => setDetailedReport(null)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-[#0052CC] dark:hover:text-[#60A5FA] transition-all py-1.5 px-3 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200/70 dark:border-[#333] cursor-pointer shadow-xs active:scale-95"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{activeNavTab === 'gallery' ? 'Back to Gallery' : 'Back to Reports'}</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => handleShareReport(detailedReport, e)}
              className={`relative p-2 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                copiedLinkId === detailedReport?.id
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
              title={copiedLinkId === detailedReport?.id ? 'Link copied!' : 'Share link to report'}
              aria-label={copiedLinkId === detailedReport?.id ? 'Link copied!' : 'Share link to report'}
            >
              {copiedLinkId === detailedReport?.id
                ? <Check className="w-4 h-4" />
                : <Share2 className="w-4 h-4" />
              }
              {copiedLinkId === detailedReport?.id && (
                <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold bg-gray-900 text-white px-2 py-0.5 rounded-md pointer-events-none shadow-lg">
                  Copied!
                </span>
              )}
            </button>

            

            <button
              type="button"
              onClick={() => {
                
                setPhotoSelection({ report: detailedReport, index: 0 })
                
              }}
              className="p-2 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Open photos"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-gray-200 dark:bg-[#333] mx-0.5" />

            <button
              type="button"
              onClick={() => setDetailedReport(null)}
              className="p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Close details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Details Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar text-gray-900 dark:text-gray-100">
          {/* Hero Photo Card with Click-to-Inspect */}
          <div 
            onClick={() => {
              
              setPhotoSelection({ report: detailedReport, index: 0 })
              
            }}
            className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-gray-100 dark:bg-[#222] border border-gray-200/80 dark:border-[#2A2A2A] shadow-sm cursor-pointer group select-none"
          >
            {(() => {
              const heroImg = getReportImage(detailedReport, evidenceCache)
              return heroImg === null ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200 dark:bg-[#333]">
                  <ImageOff className="w-12 h-12 text-gray-400" />
                  <span className="text-sm text-gray-400 mt-2">No photo available</span>
                </div>
              ) : (
                <SecureImage
                  src={heroImg}
                  alt={detailedReport.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
              )
            })()}
            
            {/* Elegant Gradient overlays for maximum badge contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/40 pointer-events-none" />

            {/* Top Badges */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-md shadow-xs border border-white/20 flex items-center gap-1">
                  {getCategoryIcon(detailedReport.issue_type)}
                  <span>{detailedReport.issue_type?.replace(/_/g, ' ') || 'Incident'}</span>
                </span>
                
                {detailedReport.status === 'urgent' || detailedReport.severity_level === 'high' ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-600/90 text-white shadow-xs backdrop-blur-md border border-red-400/30 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-white" />
                    <span>Urgent</span>
                  </span>
                ) : detailedReport.status === 'resolved' ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600/90 text-white shadow-xs backdrop-blur-md border border-emerald-400/30 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-white" />
                    <span>Resolved</span>
                  </span>
                ) : detailedReport.status === 'in_progress' ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#0052CC]/90 text-white shadow-xs backdrop-blur-md border border-blue-400/30 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-white" />
                    <span>In Progress</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/90 text-white shadow-xs backdrop-blur-md border border-amber-300/30">
                    {detailedReport.status?.replace(/_/g, ' ') || 'Unresolved'}
                  </span>
                )}
              </div>

              {/* Photo count indicator if multiple photos available */}
              {(detailedEvidence.length > 0 || (evidenceCache[detailedReport.id]?.length > 0)) && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 text-white backdrop-blur-md border border-white/20 flex items-center gap-1">
                  <Camera className="w-3 h-3 text-blue-300" />
                  <span>{(detailedEvidence.length || evidenceCache[detailedReport.id]?.length || 0)} photos</span>
                </span>
              )}
            </div>

            {/* Bottom Floating Pill: Inspect overlay */}
            <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full text-[11px] font-medium bg-white/90 hover:bg-white text-gray-900 dark:bg-black/75 dark:hover:bg-black/90 dark:text-white backdrop-blur-md transition-all shadow-md flex items-center gap-1.5 group-hover:scale-105">
              <Maximize2 className="w-3 h-3 text-[var(--landing-blue)]" />
              <span className="font-semibold">Expand Photo</span>
            </div>
          </div>

          {/* Title & Report Metadata */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-[#252525] px-2 py-0.5 rounded-md">
                    #{detailedReport.id?.toString().slice(0, 8)}
                  </span>
                  {detailedReport.location_precision === 'approximate' && (
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/40">
                      Approximate Area
                    </span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-bold leading-snug text-gray-900 dark:text-white tracking-tight">
                  {detailedReport.title || 'Environmental Incident'}
                </h3>
              </div>

              {detailedReport.severity_score && (
                <div className="flex-shrink-0 flex flex-col items-end">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">
                    Severity
                  </span>
                  <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 whitespace-nowrap shadow-xs">
                    {formatSeverityScore(detailedReport.severity_score)}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Info Bento Grid */}
            <ResponseDeadline report={detailedReport} details />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-gray-50/80 dark:bg-[#242424] rounded-2xl border border-gray-100 dark:border-[#2A2A2A] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gray-200/60 dark:bg-white/5 flex items-center justify-center flex-shrink-0 text-gray-500 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">Date Logged</p>
                  <p className="font-semibold text-gray-800 dark:text-gray-200 truncate text-xs mt-0.5">
                    {new Date(detailedReport.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div 
                onClick={() => handleJumpToMap(detailedReport)}
                className="p-3 bg-gray-50/80 dark:bg-[#242424] hover:bg-blue-50/80 dark:hover:bg-[#0052CC]/15 rounded-2xl border border-gray-100 dark:border-[#2A2A2A] hover:border-blue-200 dark:hover:border-[#0052CC]/40 flex items-center gap-2.5 cursor-pointer transition-all group shadow-xs hover:shadow-sm"
                title="Click to center pin on map"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-100/70 dark:bg-[#0052CC]/20 flex items-center justify-center flex-shrink-0 text-[var(--landing-blue)] group-hover:scale-105 transition-transform">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider group-hover:text-[#0052CC] dark:group-hover:text-[#60A5FA] transition-colors">Location</p>
                  <p className="text-gray-800 dark:text-gray-200 font-semibold line-clamp-2 text-xs mt-0.5 leading-snug" title={formatReportAddress(detailedReport)}>
                    {formatReportAddress(detailedReport)}
                  </p>
                  <p className="font-mono text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                    {detailedReport.latitude?.toFixed(4)}, {detailedReport.longitude?.toFixed(4)}
                  </p>
                </div>
              </div>

              <div className="col-span-2 p-3 bg-gray-50/80 dark:bg-[#242424] rounded-2xl border border-gray-100 dark:border-[#2A2A2A] flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-purple-100/70 dark:bg-purple-950/40 flex items-center justify-center flex-shrink-0 text-purple-600 dark:text-purple-400">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">Reported By</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200 truncate text-xs mt-0.5">
                      {detailedReport.publisher_name || publisherMap[detailedReport.id]?.publisher_name || getCachedPublisher(detailedReport.id)?.publisher_name || 'Anonymous'}
                    </p>
                  </div>
                </div>
                {(detailedReport.has_consent || detailedReport.publisher_disclosed || publisherMap[detailedReport.id]?.has_consent || getCachedPublisher(detailedReport.id)?.has_consent) ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 whitespace-nowrap">
                    Disclosed
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-[#333] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#444] whitespace-nowrap">
                    Anonymous
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Verification Card */}
          <div className="p-3.5 bg-gradient-to-r from-blue-50/90 to-indigo-50/50 dark:from-[#0052CC]/15 dark:to-indigo-950/20 border border-blue-100 dark:border-[#0052CC]/30 rounded-2xl flex items-start gap-3 text-xs shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>EcoPin Verified Citizen Report</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-[11px] mt-0.5 leading-relaxed">
                Geographic validation confirmed within Pasig City municipal boundaries for LGU response routing.
              </p>
            </div>
          </div>

          {/* Citizen Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Citizen Description
              </h4>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">Field Report</span>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-[#242424] rounded-2xl border border-gray-100 dark:border-[#2A2A2A] text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-h-40 overflow-y-auto custom-scrollbar font-normal">
              {detailedReport.description || 'Verified environmental observation submitted via Pasig City EcoPin mobile network.'}
            </div>
          </div>

          {/* Citizen Photo Evidence */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Photo Evidence
              </h4>
              {detailedEvidence.length > 0 && (
                <span className="text-[10px] font-semibold text-[var(--landing-blue)]">
                  {detailedEvidence.length} items
                </span>
              )}
            </div>
            {loadingEvidence ? (
              <div className="h-28 flex flex-col items-center justify-center bg-gray-50 dark:bg-[#242424] rounded-2xl border border-gray-100 dark:border-[#2A2A2A] gap-2">
                <div className="w-5 h-5 border-2 border-[#0052CC] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[11px] text-gray-400">Loading evidence photos...</span>
              </div>
            ) : detailedEvidence.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {detailedEvidence.filter(item => !item.resource_type || item.resource_type === "image").map((img, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                      
                      setPhotoSelection({ report: detailedReport, index: i + Number(Boolean(detailedReport.before_photo_url)) + Number(Boolean(detailedReport.after_photo_url)) })
                      
                    }}
                    className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-[#333] shadow-xs cursor-pointer group"
                  >
                    <SecureImage src={img.url} alt="Evidence" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-gray-50 dark:bg-[#242424] rounded-2xl border border-gray-100 dark:border-[#2A2A2A] flex items-center gap-3">
                {(() => {
                  const previewImg = getReportImage(detailedReport, evidenceCache)
                  return previewImg === null ? (
                    <div className="w-16 h-12 rounded-xl bg-gray-200 dark:bg-[#333] flex items-center justify-center flex-shrink-0 border border-gray-200 dark:border-[#333]">
                      <ImageOff className="w-4 h-4 text-gray-400" />
                    </div>
                  ) : (
                    <SecureImage
                      src={previewImg}
                      alt="Category preview"
                      className="w-16 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-200 dark:border-[#333]"
                    />
                  )
                })()}
                <div className="text-[11px] text-gray-500 dark:text-gray-400 min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">Baseline reference photo</p>
                  <p className="truncate text-gray-400">Field baseline observation logged at coordinate.</p>
                </div>
              </div>
            )}
          </div>

          {/* Before / After Cleanup (if available) */}
          {(detailedReport.before_photo_url || detailedReport.after_photo_url) && (
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                Official Resolution Evidence
              </h4>
              <div className="grid grid-cols-2 gap-2.5">
                {detailedReport.before_photo_url && (
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-gray-800 text-white mb-1.5 shadow-xs">
                      Before
                    </span>
                    <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-[#333] shadow-xs">
                      <SecureImage src={detailedReport.before_photo_url} alt="Before" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
                {detailedReport.after_photo_url && (
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-600 text-white mb-1.5 shadow-xs">
                      After Resolution
                    </span>
                    <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-[#333] shadow-xs">
                      <SecureImage src={detailedReport.after_photo_url} alt="After" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Sticky Action Bar */}
        <div className="p-4 border-t border-gray-200/80 dark:border-[#2A2A2A] bg-white/95 dark:bg-[#1C1C1C]/95 backdrop-blur-md flex flex-col gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setPhotoSelection({ report: detailedReport, index: 0 })
            }}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 bg-gray-50/80 dark:bg-[#242424] hover:bg-gray-100 dark:hover:bg-[#2A2A2A] transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] shadow-xs"
          >
            <Maximize2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            <span>View full photos & evidence</span>
          </button>
        </div>
      </div>
    )
  }

  if (!mounted) {
    return <PublicLoadingState label="Preparing public reports…" />
  }

  return (
    <div className={`${styles.browser} w-full flex flex-col bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 overflow-hidden font-sans transition-colors duration-300`}>
      <style jsx global>{`
        /* Map Tile Desaturation & Contrast */
        .muted-tiles {
          filter: grayscale(20%) contrast(102%) brightness(101%);
        }
        .leaflet-grab { cursor: grab !important; }
        .leaflet-dragging .leaflet-grab { cursor: grabbing !important; }
        .leaflet-control-zoom { display: none !important; }

        /* Subtle scrollbars */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: ${isDark ? '#1C1C1C' : '#f9fafb'};
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${isDark ? '#333' : '#d1d5db'};
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${isDark ? '#444' : '#9ca3af'};
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Custom Photo Pin Marker */
        .custom-pin-marker {
          background: transparent !important;
          border: none !important;
        }
        .custom-pin-marker .ecopin-pin-wrapper {
          will-change: transform;
        }
        .custom-pin-marker:hover .ecopin-pin-wrapper {
          transform: scale(1.15) translateY(-3px);
          transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
          z-index: 999;
        }

        /* Smooth Slide-in Animation for Sidebar Details */
        @keyframes sidebarSlideInRight {
          from {
            transform: translateX(100%);
            opacity: 0.85;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-sidebar-slide-in {
          animation: sidebarSlideInRight 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform, opacity;
        }

        @keyframes backdropFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-backdrop-fade {
          animation: backdropFadeIn 0.22s ease-out forwards;
        }
      `}</style>


      <h1 className={landingStyles.srOnly}>Explore Pasig</h1>
      {linkedReportId && reportLink?.id !== linkedReportId && <p className={styles.routeNotice} role="status">Opening the linked report…</p>}
      {linkedReportId && reportLink?.id === linkedReportId && reportLink.state === 'unavailable' && <p className={styles.routeNotice} role="status">That public report is unavailable. You can still browse reviewed reports.</p>}
      {linkedReportId && reportLink?.id === linkedReportId && reportLink.state === 'error' && <p className={styles.routeNotice} role="status">The linked report couldn’t load. <button onClick={() => setRefresh(value => value + 1)}>Try again</button></p>}


      {/* VIEW MODE 1: PUBLIC REPORTS (SPLIT MAP & RESULTS) */}
      {activeNavTab === 'reports' && (
        <>
          {/* FILTER BAR (Below Navigation) */}
          <section className={styles.mapToolbar}>
            {/* Left: Pill Filters */}
            <div className={styles.mapFilters}>
              {/* Status Lifecycle Segmented Control (matching Incident Gallery) */}
              <StatusTabs
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  ['all', 'All reports'],
                  ['unresolved', 'Unresolved'],
                  ['in_progress', 'In progress'],
                  ['resolved', 'Resolved']
                ]}
              />

                {/* 1. Layers Toggle Pill */}
                <div className="relative" data-filter-dropdown="true">
                  <button 
                    type="button"
                    onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'layers' ? null : 'layers')}
                    className={`${styles.filterPill} ${(!showPins || !showClusters || showHeatmap) ? styles.filterPillActive : ''}`}
                  >
                    <Layers size={16} />
                    <span>Layers</span>
                    <ChevronDown size={14} />
                  </button>

                  {activeFilterDropdown === 'layers' && (
                    <div 
                      data-filter-dropdown="true"
                      className="absolute top-full left-0 mt-1.5 w-52 bg-white dark:bg-[#1C1C1C] rounded-2xl shadow-xl border border-gray-200 dark:border-[#2A2A2A] p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Map Layers</div>
                      {[
                        { label: 'Individual Pins', state: showPins, set: setShowPins },
                        { label: 'Cluster Regions', state: showClusters, set: setShowClusters },
                        { label: 'Density Heatmap', state: showHeatmap, set: setShowHeatmap },
                      ].map(layer => (
                        <label 
                          key={layer.label} 
                          className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-[#2A2A2A] cursor-pointer transition-colors"
                        >
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{layer.label}</span>
                          <div className="relative inline-flex items-center">
                            <input 
                              type="checkbox" 
                              checked={layer.state} 
                              onChange={(e) => layer.set(e.target.checked)} 
                              className="sr-only" 
                            />
                            <div className={`w-8 h-4 rounded-full transition-colors ${layer.state ? 'bg-[#0052CC]' : 'bg-gray-300 dark:bg-gray-600'}`}>
                              <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${layer.state ? 'translate-x-4' : 'translate-x-0.5'} mt-[1px]`} />
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Location Filter Pill */}
                <div className="relative" data-filter-dropdown="true">
                  <button 
                    type="button"
                    onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'location' ? null : 'location')}
                    className={`${styles.filterPill} ${locationFilter !== 'all' ? styles.filterPillActive : ''}`}
                  >
                    <MapPin size={16} />
                    <span>{locationFilter === 'all' ? 'All Locations' : locationFilter}</span>
                    <ChevronDown size={14} />
                  </button>
                  
                  {activeFilterDropdown === 'location' && (
                    <div 
                      data-filter-dropdown="true"
                      className="absolute top-full left-0 mt-1.5 w-56 max-h-72 overflow-y-auto custom-scrollbar bg-white dark:bg-[#1C1C1C] rounded-2xl shadow-xl border border-gray-200 dark:border-[#2A2A2A] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Filter Location</div>
                      {[
                        { name: 'all', label: 'All Pasig Areas', count: allReports.length > 0 ? allReports.length : reports.length },
                        ...LOCATIONS.filter(l => l.name !== 'Pasig City (All)').map(loc => ({
                          name: loc.name,
                          label: loc.name,
                          count: locationCounts[loc.name] || 0
                        }))
                      ].map(loc => (
                        <button
                          key={loc.name}
                          type="button"
                          onClick={() => {
                            setLocationFilter(loc.name)
                            setActiveFilterDropdown(null)
                            handleFlyToLocation(loc.name)
                            if (loc.name === 'all' && allReports.length > 0) {
                              setReports(allReports)
                            }
                          }}
                          className={`w-full text-left px-3.5 py-1.5 text-xs transition-colors flex items-center justify-between ${
                            locationFilter === loc.name 
                              ? 'bg-blue-50 dark:bg-[#0052CC]/25 text-[var(--landing-blue)] font-bold' 
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2A2A2A]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{loc.label}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-500 dark:text-gray-400">
                              {loc.count}
                            </span>
                          </div>
                          {locationFilter === loc.name && <Check className="w-3 h-3 text-[var(--landing-blue)]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Date Range Pill */}
                <div className="relative" data-filter-dropdown="true">
                  <button 
                    type="button"
                    onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'date' ? null : 'date')}
                    className={`${styles.filterPill} ${(dateFilter !== 'all' || startDate || endDate) ? styles.filterPillActive : ''}`}
                  >
                    <Calendar size={16} />
                    <span>
                      {startDate || endDate
                        ? `${startDate || '...'} to ${endDate || '...'}`
                        : dateFilter === '24h' 
                        ? 'Last 24 Hours' 
                        : dateFilter === '7d' 
                        ? 'Last 7 Days' 
                        : dateFilter === '30d' 
                        ? 'Last 30 Days'
                        : 'All Dates'}
                    </span>
                    <ChevronDown size={14} />
                  </button>
                  
                  {activeFilterDropdown === 'date' && (
                    <div 
                      data-filter-dropdown="true"
                      className="absolute top-full left-0 mt-1.5 w-60 bg-white dark:bg-[#1C1C1C] rounded-2xl shadow-xl border border-gray-200 dark:border-[#2A2A2A] p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Quick Presets</div>
                      {[
                        { id: 'all', label: 'All Dates' },
                        { id: '24h', label: 'Last 24 Hours' },
                        { id: '7d', label: 'Last 7 Days' },
                        { id: '30d', label: 'Last 30 Days' },
                      ].map(d => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setDateFilter(d.id)
                            setStartDate('')
                            setEndDate('')
                            setActiveFilterDropdown(null)
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                            dateFilter === d.id && !startDate && !endDate
                              ? 'bg-blue-50 dark:bg-[#0052CC]/25 text-[var(--landing-blue)] font-bold' 
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2A2A2A]'
                          }`}
                        >
                          <span>{d.label}</span>
                          {dateFilter === d.id && !startDate && !endDate && <Check className="w-3 h-3 text-[var(--landing-blue)]" />}
                        </button>
                      ))}

                      <div className="my-2 border-t border-gray-100 dark:border-[#2A2A2A]" />

                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Custom Date Range</div>
                      <div className="px-2 space-y-2 mt-1">
                        <div>
                          <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 block mb-0.5">From:</label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                              setStartDate(e.target.value)
                              setDateFilter('custom')
                            }}
                            className="w-full px-2 py-1 text-xs bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0052CC]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 block mb-0.5">To:</label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                              setEndDate(e.target.value)
                              setDateFilter('custom')
                            }}
                            className="w-full px-2 py-1 text-xs bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0052CC]"
                          />
                        </div>
                        {(startDate || endDate) && (
                          <button
                            type="button"
                            onClick={() => {
                              setStartDate('')
                              setEndDate('')
                              setDateFilter('all')
                            }}
                            className="w-full py-1 text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline text-center"
                          >
                            Clear Custom Dates
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Category Pill */}
                <div className="relative" data-filter-dropdown="true">
                  <button 
                    type="button"
                    onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'category' ? null : 'category')}
                    className={`${styles.filterPill} ${issueTypeFilter !== 'all' ? styles.filterPillActive : ''}`}
                  >
                    <SlidersHorizontal size={16} />
                    <span className="capitalize">{issueTypeFilter === 'all' ? 'Category' : issueTypeFilter.replace(/_/g, ' ')}</span>
                    <ChevronDown size={14} />
                  </button>

                  {activeFilterDropdown === 'category' && (
                    <div 
                      data-filter-dropdown="true"
                      className="absolute top-full left-0 mt-1.5 w-56 max-h-72 overflow-y-auto custom-scrollbar bg-white dark:bg-[#1C1C1C] rounded-2xl shadow-xl border border-gray-200 dark:border-[#2A2A2A] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Environmental Category</div>
                      {[
                        { id: 'all', label: 'All Categories', count: filterCounts.category.all },
                        ...ISSUE_TYPES.map(cat => ({
                          id: cat,
                          label: cat.replace(/_/g, ' '),
                          count: filterCounts.category[cat] || 0
                        }))
                      ].map(type => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => {
                            setIssueTypeFilter(type.id)
                            setActiveFilterDropdown(null)
                          }}
                          className={`w-full text-left px-3.5 py-1.5 text-xs transition-colors flex items-center justify-between capitalize ${
                            issueTypeFilter === type.id 
                              ? 'bg-blue-50 dark:bg-[#0052CC]/25 text-[var(--landing-blue)] font-bold' 
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2A2A2A]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{type.label}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-500 dark:text-gray-400">
                              {type.count}
                            </span>
                          </div>
                          {issueTypeFilter === type.id && <Check className="w-3 h-3 text-[var(--landing-blue)]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 5. Severity Pill */}
                <div className="relative" data-filter-dropdown="true">
                  <button 
                    type="button"
                    onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'severity' ? null : 'severity')}
                    className={`${styles.filterPill} ${severityFilter !== 'all' ? styles.filterPillActive : ''}`}
                  >
                    <AlertCircle size={16} />
                    <span className="capitalize">{severityFilter === 'all' ? 'Severity' : severityFilter}</span>
                    <ChevronDown size={14} />
                  </button>

                  {activeFilterDropdown === 'severity' && (
                    <div 
                      data-filter-dropdown="true"
                      className="absolute top-full left-0 mt-1.5 w-48 bg-white dark:bg-[#1C1C1C] rounded-2xl shadow-xl border border-gray-200 dark:border-[#2A2A2A] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Severity Level</div>
                      {[
                        { id: 'all', label: 'All Severities', count: filterCounts.severity.all },
                        { id: 'urgent', label: 'Urgent / High', count: filterCounts.severity.urgent },
                        { id: 'medium', label: 'Medium', count: filterCounts.severity.medium },
                        { id: 'low', label: 'Low', count: filterCounts.severity.low },
                      ].map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSeverityFilter(s.id)
                            setActiveFilterDropdown(null)
                          }}
                          className={`w-full text-left px-3.5 py-1.5 text-xs transition-colors flex items-center justify-between capitalize ${
                            severityFilter === s.id 
                              ? 'bg-blue-50 dark:bg-[#0052CC]/25 text-[var(--landing-blue)] font-bold' 
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2A2A2A]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{s.label}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-500 dark:text-gray-400">
                              {s.count}
                            </span>
                          </div>
                          {severityFilter === s.id && <Check className="w-3 h-3 text-[var(--landing-blue)]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reset Filters Button */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className={styles.filterResetBtn}
                    title="Reset all active filters"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
            </div>

            <div className={styles.mapPresentation}>
              <div className={styles.mobileViewToggle} role="group" aria-label="Mobile view mode">
                <button 
                  type="button"
                  aria-pressed={mobileTab === 'map'}
                  onClick={() => setMobileTab('map')}
                >
                  Map
                </button>
                <button 
                  type="button"
                  aria-pressed={mobileTab === 'list'}
                  onClick={() => setMobileTab('list')}
                >
                  List ({sortedReports.length})
                </button>
              </div>

              <ViewModeSwitch mode="map" onChange={changeMode} />
            </div>
          </section>

          {/* SPLIT VIEW (Map + Results Panel) */}
          <div className="flex-1 flex flex-col md:flex-row relative min-h-0 overflow-hidden bg-gray-50 dark:bg-[#121212]">
            {/* LEFT: MAP */}
            <div className={`relative h-full flex-1 md:w-[65%] md:flex-none overflow-hidden ${mobileTab === 'list' ? 'hidden md:block' : 'block'}`}>
              <MapContainer
                center={PASIG_CENTER}
                zoom={DEFAULT_ZOOM}
                zoomControl={false}
                preferCanvas={true}
                style={{ height: '100%', width: '100%', background: isDark ? '#121212' : '#f3f4f6' }}
              >
                <ViewportTracker onViewport={onViewport} />
                <MapController selectedCoords={flyCoords} />
                <TileLayer key={isDark ? "dark" : "light"}
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
                  className={isDark ? styles.darkTiles : styles.lightTiles}
                />

                <HeatmapLayer heatPoints={heatPoints} showHeatmap={showHeatmap} />

                <FloatingMapControls 
                  onFindPoi={handleFindPoi}
                  onSelectCluster={handleSelectClusterPoi}
                  poiClusters={poiClusters}
                  loadingClusters={loadingClusters}
                  poiQuery={poiQuery}
                  setPoiQuery={setPoiQuery}
                  showPoiInput={showPoiInput}
                  setShowPoiInput={setShowPoiInput}
                />

                {/* Cluster Markers */}
                {showClusters && zoom <= 14 && filteredClusters.map((cluster) => {
                  if (!cluster.centerLat || !cluster.centerLng) return null
                  const isClusterSelected = (cluster.reports || []).some(r => r.id === selectedReportId)
                  const clusterFirstReport = cluster.reports && cluster.reports[0]
                  const clusterImage = clusterFirstReport
                    ? getReportImage(clusterFirstReport, evidenceCache)
                    : null

                  return (
                    <Marker
                      key={`cluster-${cluster.id}`}
                      position={[cluster.centerLat, cluster.centerLng]}
                      icon={createPinIcon(clusterImage, isClusterSelected, isDark, cluster.status, true)}
                      zIndexOffset={isClusterSelected ? 1000 : 0}
                      eventHandlers={{
                        click: () => {
                          if (cluster.reports && cluster.reports[0]) {
                            handleSelectReport(cluster.reports[0], [cluster.centerLat, cluster.centerLng])
                          } else {
                            setFlyCoords({
                              coords: [cluster.centerLat, cluster.centerLng],
                              zoom: Math.max(zoom + 2, 15),
                              timestamp: Date.now()
                            })
                          }
                        }
                      }}
                    />
                  )
                })}

                {/* Cluster Polygons */}
                {showClusters && zoom > 14 && clusterPolygonData.map((cluster) => (
                  <Polygon
                    key={`polygon-${cluster.id}`}
                    positions={cluster.positions}
                    color="#0052CC"
                    fillColor="#0052CC"
                    fillOpacity={isDark ? 0.25 : 0.15}
                    weight={2}
                    dashArray="4 4"
                  />
                ))}

                {/* Individual Pins */}
                {showPins && processedReportsInfo.parsedReports.map((report) => {
                  const isInValidCluster = filteredClusters.some(c => c.id === report.cluster_id)
                  if (showClusters && isInValidCluster && zoom <= 14) return null

                  let latitude = report.parsedLat
                  let longitude = report.parsedLng
                  let originalLat = latitude
                  let originalLng = longitude
                  let isSpiderfied = false

                  if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
                    const key = report.cluster_id ? `cluster_${report.cluster_id}` : `coord_${latitude.toFixed(4)},${longitude.toFixed(4)}`
                    const overlappingIds = processedReportsInfo.coordsMap[key]

                    if (overlappingIds && overlappingIds.length > 1 && zoom > 14) {
                      const index = overlappingIds.indexOf(report.id)
                      const total = overlappingIds.length
                      const radius = 0.00035 * Math.pow(2, 16 - zoom)
                      const angle = (index / total) * Math.PI * 2
                      
                      latitude += Math.sin(angle) * radius
                      longitude += Math.cos(angle) * radius
                      isSpiderfied = true
                    }

                    const isSelected = selectedReportId === report.id

                    const reportImage = getReportImage(report, evidenceCache)

                    return (
                      <React.Fragment key={report.id}>
                        {isSpiderfied && (
                          <Polyline 
                            positions={[[originalLat, originalLng], [latitude, longitude]]} 
                            color="#0052CC" 
                            weight={1.5} 
                            opacity={0.6}
                            dashArray="3 3"
                          />
                        )}

                        <Marker
                          position={[latitude, longitude]}
                          icon={createPinIcon(reportImage, isSelected, isDark, report.status, false)}
                          title={formatReportAddress(report) ? `${report.title || 'Environmental Incident'} • ${formatReportAddress(report)}` : (report.title || 'Environmental Incident')}
                          zIndexOffset={isSelected ? 1000 : 0}
                          ref={(el) => {
                            if (el) markerRefs.current[report.id] = el
                          }}
                          eventHandlers={{
                            click: () => handleSelectReport(report, [latitude, longitude])
                          }}
                        >
                          <Popup closeButton autoPan={false}><PublicReportPopup report={report} onOpen={() => handleViewDetails(report)} /></Popup>
                        </Marker>
                      </React.Fragment>
                    )
                  }
                  return null
                })}
              </MapContainer>

              <div className="absolute bottom-4 left-4 z-[400] pointer-events-none">
                <div className="bg-white/95 dark:bg-[#1C1C1C]/95 px-3.5 py-1.5 rounded-full border border-gray-200/90 dark:border-[#333] shadow-sm text-xs text-gray-600 dark:text-gray-300 font-medium">
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#0052CC] animate-pulse"></span>
                      Loading reports in this area...
                    </span>
                  ) : loadError ? (
                    <span className="text-red-600 dark:text-red-400 font-semibold">Reports load issue. Refreshing...</span>
                  ) : (
                    <span>{filteredReports.length} reports in visible area</span>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: RESULTS PANEL & GOOGLE MAPS STYLE DETAILS SIDEBAR */}
            <div className={`h-full flex-1 md:w-[35%] md:flex-none border-l border-gray-200/90 dark:border-[#2A2A2A] bg-white dark:bg-[#1C1C1C] flex flex-col min-h-0 transition-colors duration-300 ${mobileTab === 'map' ? 'hidden md:flex' : 'flex'}`}>
              {detailedReport ? (
                /* GOOGLE MAPS STYLE SIDEBAR DETAILS VIEW */
                <div key={detailedReport.id} className="h-full flex flex-col min-h-0 overflow-hidden">
                  {renderReportDetailsSidebar()}
                </div>
              ) : (
                /* DEFAULT VIEWPORT REPORTS LIST VIEW */
                <>
                  <div className="relative z-10 px-5 py-3.5 border-b border-gray-200/80 dark:border-[#2A2A2A] flex items-center justify-between gap-3 bg-white dark:bg-[#1C1C1C] flex-shrink-0">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <h2 className="font-bold text-base text-gray-900 dark:text-white tracking-tight truncate">
                          {locationFilter === 'all' ? 'Reports' : locationFilter}
                        </h2>
                        <span className="text-[var(--landing-blue)] font-bold text-xs whitespace-nowrap">
                          {sortedReports.length} Results
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        {locationFilter === 'all' ? 'Showing reports in visible map view' : `Filtered by ${locationFilter}`}
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      <PublicSelect id="map-sort" label="Sort reports" hideLabel value={sortBy} onChange={setSortBy} options={[{ value: "newest", label: "Newest first" }, { value: "severity", label: "By priority" }, { value: "status", label: "By status" }]} className={styles.sortSelect} />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 custom-scrollbar bg-gray-50/50 dark:bg-[#121212]">
                    {sortedReports.length === 0 ? (
                      <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200/80 dark:border-[#2A2A2A] mt-4">
                        <AlertCircle className="w-8 h-8 text-[var(--landing-blue)] mb-2" />
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">No reports match your filters</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[220px]">
                          Try clearing some filter pills or zooming out to see more community reports.
                        </p>
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-4 px-4 py-1.5 text-xs font-semibold text-[var(--landing-blue)] bg-blue-50 dark:bg-[#0052CC]/20 border border-blue-200 dark:border-[#0052CC]/40 rounded-full hover:bg-blue-100 dark:hover:bg-[#0052CC]/30 transition-colors"
                        >
                          Reset all filters
                        </button>
                      </div>
                    ) : (
                      sortedReports.map((report) => {
                        const isSelected = selectedReportId === report.id
                        
                        const thumbImg = getReportImage(report, evidenceCache)

                        return (
                          <div
                            key={report.id}
                            id={`report-card-${report.id}`}
                            onClick={() => {
                              handleSelectReport(report)
                              handleViewDetails(report)
                            }}
                            className={`group relative flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-[#1E1E1E] border transition-all cursor-pointer select-none ${
                              isSelected
                                ? 'border-[#0052CC] dark:border-[#60A5FA] ring-2 ring-[#0052CC]/20 dark:ring-[#60A5FA]/30 shadow-md bg-blue-50/15 dark:bg-[#0052CC]/15'
                                : 'border-gray-200/80 dark:border-[#2A2A2A] hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md'
                            }`}
                          >
                            <div
                              className="relative w-28 h-20 sm:w-32 sm:h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0"
                              title={formatReportAddress(report)}
                            >
                              {thumbImg === null ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200 dark:bg-[#333]">
                                  <ImageOff className="w-5 h-5 text-gray-400" />
                                  <span className="text-[10px] text-gray-400 mt-1">No photo</span>
                                </div>
                              ) : (
                                <SecureImage
                                  src={thumbImg}
                                  alt={report.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              )}

                              {/* Status Badge */}
                              <div className="absolute top-1.5 left-1.5">
                                {report.status === 'resolved' ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                                    <CheckCircle className="w-2.5 h-2.5 text-white" />
                                    <span>Resolved</span>
                                  </span>
                                ) : report.status === 'urgent' || report.severity_level === 'high' ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-600 text-white shadow-xs flex items-center gap-1">
                                    <AlertCircle className="w-2.5 h-2.5 text-white" />
                                    <span>High Priority</span>
                                  </span>
                                ) : report.status === 'in_progress' ? (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#0052CC] text-white shadow-xs flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5 text-white" />
                                    <span>In Progress</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 shadow-xs">
                                    {report.status?.replace(/_/g, ' ') || 'Unresolved'}
                                  </span>
                                )}
                              </div>

                              
                            </div>

                            <div className="flex-1 min-w-0 pr-1">
                              <h4 className="font-bold text-gray-900 dark:text-gray-100 text-xs sm:text-sm leading-snug truncate">
                                {report.title || 'Environmental Incident'}
                              </h4>

                              <p className="font-bold text-xs text-gray-700 dark:text-gray-300 mt-1 truncate">
                                {report.severity_level 
                                  ? `${report.severity_level.toUpperCase()} SEVERITY` 
                                  : 'VERIFIED REPORT'}
                                <span className="font-medium text-gray-400 dark:text-gray-500 ml-1.5">
                                  / {report.status?.replace(/_/g, ' ')}
                                </span>
                              </p>

                              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 capitalize truncate">
                                {report.issue_type?.replace(/_/g, ' ')} • {new Date(report.created_at).toLocaleDateString()}
                                <span className="normal-case"> • By {publisherMap[report.id]?.publisher_name || getCachedPublisher(report.id)?.publisher_name || report.publisher_name || 'Anonymous'}</span>
                              </p>

                              <ResponseDeadline report={report} />

                              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 flex items-start gap-1" title={formatReportAddress(report)}>
                                <MapPin className="w-3.5 h-3.5 text-[var(--landing-blue)] flex-shrink-0 mt-0.5" />
                                <span className="font-medium text-gray-700 dark:text-gray-300 line-clamp-2 leading-tight">
                                  {formatReportAddress(report)}
                                </span>
                              </p>
                            </div>

                            {/* Share button — hover-reveal on card */}
                            <button
                              type="button"
                              aria-label="Copy share link"
                              title={copiedLinkId === report.id ? 'Link copied!' : 'Copy share link'}
                              onClick={(e) => handleShareReport(report, e)}
                              className={`absolute top-2 right-2 p-1.5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer z-10 ${
                                copiedLinkId === report.id
                                  ? 'opacity-100 bg-emerald-500 text-white shadow-md'
                                  : 'bg-white/90 dark:bg-black/60 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-black/80 shadow-sm backdrop-blur-sm border border-gray-200/60 dark:border-white/10'
                              }`}
                            >
                              {copiedLinkId === report.id
                                ? <Check className="w-3 h-3" />
                                : <Share2 className="w-3 h-3" />
                              }
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* VIEW MODE 2: INCIDENT GALLERY (VISUAL TRANSPARENCY SHOWCASE) */}
      {activeNavTab === 'gallery' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-gray-50 dark:bg-[#121212]">

          <GalleryToolbar status={galleryStatusFilter} onStatus={setGalleryStatusFilter} category={galleryCategoryFilter} onCategory={setGalleryCategoryFilter} priority={gallerySeverityFilter} onPriority={setGallerySeverityFilter} search={gallerySearch} onSearch={setGallerySearch} sort={gallerySortBy} onSort={setGallerySortBy} layout={galleryViewMode} onLayout={setGalleryViewMode} onMode={changeMode} categories={ISSUE_TYPES} />
          {/* Gallery Content with slide-over / sidebar details */}
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch', willChange: 'scroll-position' }}>
              {galleryHasMore && <p className={styles.galleryHint}>Showing recent public reports. Use map mode to explore more reports in an area.</p>}
              {deferredGallerySearch && <p className={styles.galleryHint} role="status">{galleryReports.length} matching {galleryReports.length === 1 ? 'report' : 'reports'}</p>}
              {galleryLoadError ? (
                <div className={styles.galleryState} role="alert"><h2>Reports couldn’t load.</h2><p>Please try again to see public reports.</p><button onClick={() => setRefresh(value => value + 1)}>Try again <RotateCcw size={16} /></button></div>
              ) : loadingAllReports && allReports.length === 0 && reports.length === 0 ? (
                <div className="max-w-md mx-auto h-72 flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gray-200 dark:border-[#2A2A2A] shadow-xs mt-8">
                  <Loader2 className="w-8 h-8 text-[var(--landing-blue)] animate-spin mb-3" />
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Loading incident gallery...</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Fetching verified community reports across Pasig City.
                  </p>
                </div>
              ) : galleryReports.length === 0 ? (
                <div className="max-w-md mx-auto h-72 flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gray-200 dark:border-[#2A2A2A] shadow-xs mt-8">
                  {<>
                      <Camera className="w-10 h-10 text-gray-400 mb-3" />
                      <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">No incident photos found</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Try adjusting your search query, status, or selecting a different category filter.
                      </p>
                      
                    </>}
                </div>
              ) : (
                <div className={
                  galleryViewMode === 'showcase'
                    ? "grid grid-cols-1 lg:grid-cols-2 gap-6"
                    : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5"
                }>
                  {galleryReports.map((report, idx) => {
                    const imgUrl = getReportImage(report, evidenceCache)
                    
                    const evidenceList = evidenceCache[report.id] || []
                    const hasRealPhotos = evidenceList.length > 0 || Boolean(report.before_photo_url || report.after_photo_url)

                    return (
                      <div 
                        key={report.id}
                        style={{ transform: 'translateZ(0)', contain: 'content' }}
                        className={`group bg-white dark:bg-[#1E1E1E] rounded-2xl border ${
                          detailedReport?.id === report.id
                            ? 'border-[#0052CC] ring-2 ring-[#0052CC]/25 dark:border-[#60A5FA]'
                            : 'border-gray-200/90 dark:border-[#2A2A2A] hover:border-[#0052CC]/50'
                        } overflow-hidden transition-[border-color,box-shadow] duration-200 flex flex-col`}
                      >
                        {/* Photo Container */}
                        <button type="button" aria-label={`View photos for ${report.title || "Environmental concern"}`} title={formatReportAddress(report)} onClick={() => setPhotoSelection({ report, index: 0 })} className={`w-full relative ${galleryViewMode === 'showcase' ? 'aspect-[16/9]' : 'aspect-[16/10]'} bg-gray-100 dark:bg-gray-800 overflow-hidden`}>
                          {imgUrl === null ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-200 dark:bg-[#333]">
                              <ImageOff className="w-8 h-8 text-gray-400" />
                              <span className="text-xs text-gray-400 mt-2">No photo available</span>
                            </div>
                          ) : (
                            <SecureImage
                              src={imgUrl}
                              alt={report.title}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          )}
                          
                          {/* Status Badge */}
                          <div className="absolute top-2.5 left-2.5">
                            {report.status === 'resolved' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-xs flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-white" />
                                <span>Resolved</span>
                              </span>
                            ) : report.status === 'urgent' || report.severity_level === 'high' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white shadow-xs flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-white" />
                                <span>High Priority</span>
                              </span>
                            ) : report.status === 'in_progress' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#0052CC] text-white shadow-xs flex items-center gap-1">
                                <Clock className="w-3 h-3 text-white" />
                                <span>In Progress</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 shadow-xs">
                                {report.status?.replace(/_/g, ' ') || 'Unresolved'}
                              </span>
                            )}
                          </div>

                          
                          

                          {/* Bottom Left: Category Pill */}
                          <div className="absolute bottom-2.5 left-2.5 bg-white/95 dark:bg-[#1E1E1E]/95 px-2.5 py-1 rounded-full text-[10px] font-bold capitalize text-gray-800 dark:text-gray-200 shadow-xs flex items-center gap-1 border border-gray-100 dark:border-white/10">
                            {getCategoryIcon(report.issue_type)}
                            <span>{report.issue_type?.replace(/_/g, ' ')}</span>
                          </div>

                          {/* Bottom Right: Evidence / Photos Counter Badge */}
                          <div className="absolute bottom-2.5 right-2.5">
                            {evidenceList.length > 0 ? (
                              <span className="bg-black/80 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs border border-white/20">
                                <Camera className="w-3 h-3 text-[#60A5FA]" />
                                <span>{evidenceList.length} Photos</span>
                              </span>
                            ) : hasRealPhotos ? (
                              <span className="bg-black/80 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs border border-white/20">
                                <Sparkles className="w-3 h-3 text-emerald-400" />
                                <span>Proof Attached</span>
                              </span>
                            ) : (
                              <span className="bg-black/70 text-gray-300 px-2 py-0.5 rounded-full text-[9px] font-medium shadow-xs">
                                No photo
                              </span>
                            )}
                          </div>
                        </button>

                        {/* Content Card Body */}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <ResponseDeadline report={report} />
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate">
                                #{report.id?.toString().slice(0, 8)}
                              </span>
                              {report.severity_score && (
                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#2A2A2A] px-2 py-0.5 rounded-full">
                                  Severity: {formatSeverityScore(report.severity_score)}
                                </span>
                              )}
                            </div>

                            <h3 className="font-bold text-sm text-gray-900 dark:text-white leading-snug line-clamp-2 group-hover:text-[#0052CC] dark:group-hover:text-[#60A5FA] transition-colors">
                              <button type="button" className="text-left w-full" onClick={() => handleViewDetails(report)}>{report.title || 'Environmental concern'}</button>
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                              {report.description || 'Verified community report logged in Pasig City.'}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#2A2A2A] space-y-2 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="flex items-center gap-1 text-gray-400">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(report.created_at).toLocaleDateString()}
                              </span>
                              <span className="flex items-start gap-1 flex-1 min-w-0 justify-end ml-2 text-gray-600 dark:text-gray-300" title={formatReportAddress(report)}>
                                <MapPin className="w-3.5 h-3.5 text-[#0052CC] flex-shrink-0 mt-0.5" />
                                <span className="line-clamp-2 text-right font-medium leading-tight">
                                  {formatReportAddress(report)}
                                </span>
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1 truncate">
                                <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                <span className="truncate font-medium text-gray-700 dark:text-gray-300">
                                  {publisherMap[report.id]?.publisher_name || getCachedPublisher(report.id)?.publisher_name || report.publisher_name || 'Anonymous'}
                                </span>
                              </span>
                              {(publisherMap[report.id]?.has_consent || report.publisher_disclosed || getCachedPublisher(report.id)?.has_consent) && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40">
                                  Citizen
                                </span>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => {
                                  setPhotoSelection({ report: galleryReports[idx], index: 0 })
                                  
                                }}
                                className="flex-1 py-1.5 px-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-[#242424] hover:bg-gray-100 dark:hover:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-gray-500" />
                                <span>Photos</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleJumpToMap(report)}
                                className="flex-1 py-1.5 px-2.5 text-xs font-semibold text-[var(--landing-blue)] bg-blue-50 dark:bg-[#0052CC]/15 hover:bg-blue-100 dark:hover:bg-[#0052CC]/25 border border-blue-200 dark:border-[#0052CC]/40 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <MapPin className="w-3.5 h-3.5" />
                                <span>On Map</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Gallery Sidebar Popup Details View */}
            {detailedReport && (
              <div className="fixed inset-0 md:absolute md:inset-0 z-40 md:z-30 flex justify-end overflow-hidden pointer-events-auto">
                {/* Backdrop on all screens with smooth fade to dismiss */}
                <div 
                  className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[2px] animate-backdrop-fade cursor-pointer"
                  onClick={() => setDetailedReport(null)}
                  aria-label="Dismiss details drawer"
                />
                {/* Sidebar Drawer Panel - exactly 35% on md+ screens to match map page */}
                <div 
                  key={detailedReport.id}
                  className="relative w-full md:w-[35%] md:flex-none h-full bg-white dark:bg-[#1C1C1C] border-l border-gray-200/90 dark:border-[#2A2A2A] shadow-2xl flex flex-col z-10 overflow-hidden"
                >
                  {renderReportDetailsSidebar()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {photoSelection?.report && (
        <PhotoViewer
          report={{
            ...photoSelection.report,
            publisher_name: publisherMap[photoSelection.report.id]?.publisher_name || getCachedPublisher(photoSelection.report.id)?.publisher_name || photoSelection.report.publisher_name
          }}
          initialIndex={photoSelection.index}
          evidenceCache={evidenceCache}
          reports={activeNavTab === 'gallery' ? galleryReports : (sortedReports.length ? sortedReports : (galleryReports.length ? galleryReports : [photoSelection.report]))}
          onClose={closePhotoViewer}
          onMap={report => { closePhotoViewer(); handleJumpToMap(report) }}
        />
      )}
    </div>
  )
}
