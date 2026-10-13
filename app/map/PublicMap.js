'use client'
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import LoadingScreen from '@/components/ui/LoadingScreen'
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
import { fetchPublicReportPage } from '@/lib/api/public-report-page.mjs'
import { supabase } from '@/lib/supabase'
import SecureImage from '@/components/ui/SecureImage'
import MobileAppTabContent from '@/components/mobile/MobileAppTabContent'
import { 
  Loader2,
  MapPin, 
  Calendar, 
  ChevronDown, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Bookmark, 
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
  CheckCircle
} from 'lucide-react'

if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer
}

const PASIG_CENTER = [14.5802, 121.0850]
const DEFAULT_ZOOM = 14
const ISSUE_TYPES = ['waste', 'flooding', 'pollution', 'infrastructure', 'illegal_logging', 'others']

const LOCATIONS = [
  { name: 'Pasig City (All)', lat: 14.5802, lng: 121.0850 },
  { name: 'Ortigas Center', lat: 14.5862, lng: 121.0610 },
  { name: 'San Antonio', lat: 14.5815, lng: 121.0645 },
  { name: 'Kapasigan Plaza', lat: 14.5595, lng: 121.0805 },
  { name: 'Ugong North', lat: 14.5910, lng: 121.0760 },
  { name: 'Rosario / Tramo', lat: 14.5875, lng: 121.0920 },
  { name: 'Maybunga Riverbank', lat: 14.5775, lng: 121.0965 },
]

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
  const stage = (report.stage || '').toLowerCase().trim()
  return (
    val === 'approved' || 
    val === 'validated' || 
    val === 'verified' || 
    stage === 'verified'
  )
}

const CATEGORY_IMAGES = {
  waste: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
  flooding: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80',
  pollution: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?auto=format&fit=crop&w=600&q=80',
  infrastructure: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=600&q=80',
  illegal_logging: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
  others: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=600&q=80',
}

const getReportImage = (report, evidenceMap = {}) => {
  if (report?.id && evidenceMap[report.id]?.length > 0) {
    const firstImg = evidenceMap[report.id].find(e => e.resource_type === 'image' || !e.resource_type)
    if (firstImg?.url) return firstImg.url
  }
  if (report?.before_photo_url) return report.before_photo_url
  if (report?.after_photo_url) return report.after_photo_url
  const category = report?.issue_type || 'others'
  return CATEGORY_IMAGES[category] || CATEGORY_IMAGES.others
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

// Custom Pin Icon: high-visibility photo pin with pointer and status pip, no numbers
const createPinIcon = (imageOrUrl, isSelected = false, isDark = false, status = null, isCluster = false) => {
  let imageUrl = imageOrUrl
  if (typeof imageOrUrl === 'object' && imageOrUrl !== null) {
    imageUrl = getReportImage(imageOrUrl)
    if (!status && imageOrUrl.status) status = imageOrUrl.status
  } else if (typeof imageOrUrl === 'number' || !imageOrUrl) {
    imageUrl = CATEGORY_IMAGES.others
  }

  const fallbackImage = CATEGORY_IMAGES.others
  const safeImageUrl = (typeof imageUrl === 'string' && imageUrl.trim().length > 0 && !imageUrl.includes('<') && !imageUrl.includes('"'))
    ? imageUrl
    : fallbackImage

  const size = isSelected ? 50 : (isCluster ? 46 : 42)
  const pointerHeight = isSelected ? 8 : 7
  const pointerWidth = isSelected ? 12 : 10
  const totalHeight = size + pointerHeight

  const borderColor = isSelected 
    ? '#0052CC' 
    : (isCluster ? '#0052CC' : '#FFFFFF')

  const borderWidth = isSelected ? 3.5 : (isCluster ? 3 : 3)

  const shadow = isSelected
    ? '0 0 0 4px rgba(0, 82, 204, 0.45), 0 8px 24px rgba(0, 0, 0, 0.45)'
    : (isCluster
        ? '0 0 0 2px #FFFFFF, 0 4px 14px rgba(0, 0, 0, 0.35)'
        : '0 3px 12px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(0, 0, 0, 0.1)')

  // Status indicator dot (no text/numbers)
  let statusColor = null
  if (status === 'urgent') statusColor = '#EF4444'
  else if (status === 'resolved') statusColor = '#10B981'
  else if (status === 'in_progress') statusColor = '#3B82F6'
  else if (status === 'unresolved' || status === 'submitted' || status === 'pending') statusColor = '#F59E0B'

  const statusPip = statusColor ? `
    <div style="
      position: absolute;
      top: 1px;
      right: 1px;
      width: ${isSelected ? 11 : 9}px;
      height: ${isSelected ? 11 : 9}px;
      border-radius: 50%;
      background: ${statusColor};
      border: 2px solid #FFFFFF;
      box-shadow: 0 1px 3px rgba(0,0,0,0.35);
      z-index: 3;
    "></div>
  ` : ''

  return L.divIcon({
    className: 'custom-pin-marker',
    html: `
      <div class="ecopin-pin-wrapper" style="
        position: relative;
        width: ${size}px;
        height: ${totalHeight}px;
        display: flex;
        flex-direction: column;
        align-items: center;
        filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.32));
        cursor: pointer;
      ">
        <div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          border: ${borderWidth}px solid ${borderColor};
          background: ${isDark ? '#262626' : '#FFFFFF'};
          overflow: hidden;
          position: relative;
          box-sizing: border-box;
          box-shadow: ${shadow};
        ">
          <img 
            src="${safeImageUrl}" 
            alt="Incident"
            loading="lazy"
            style="
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
              border-radius: 50%;
            "
            onerror="this.onerror=null;this.src='${fallbackImage}';"
          />
        </div>
        <div style="
          width: 0;
          height: 0;
          border-left: ${pointerWidth / 2}px solid transparent;
          border-right: ${pointerWidth / 2}px solid transparent;
          border-top: ${pointerHeight}px solid ${borderColor};
          margin-top: -1.5px;
        "></div>
        ${statusPip}
      </div>
    `,
    iconSize: [size, totalHeight],
    iconAnchor: [size / 2, totalHeight],
    popupAnchor: [0, -totalHeight - 4]
  })
}

const parseGeometry = (geometry) => {
  if (!geometry) return null
  try {
    if (typeof geometry === 'string') {
      const buffer = Buffer.from(geometry, 'hex')
      const parsed = wkx.Geometry.parse(buffer)
      if (parsed && parsed.x && parsed.y) {
        return [parsed.y, parsed.x]
      }
    } else if (typeof geometry === 'object' && geometry.type === 'Point') {
      const [lng, lat] = geometry.coordinates
      return [lat, lng]
    }
  } catch (error) {}
  return null
}

function ViewportTracker({ onViewport }) {
  const map = useMap()
  const publishViewport = useCallback(() => {
    const bounds = map.getBounds()
    onViewport({
      south: Math.max(-90, bounds.getSouth()), 
      north: Math.min(90, bounds.getNorth()),
      west: bounds.getWest(), 
      east: bounds.getEast(),
    }, map.getZoom())
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
        console.error(e)
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
        <div className="flex items-center gap-1.5 bg-white/95 dark:bg-[#1C1C1C]/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/40 shadow-sm text-xs font-semibold text-emerald-700 dark:text-emerald-400 select-none">
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
                : 'bg-white/95 dark:bg-[#1C1C1C]/95 backdrop-blur-md text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#333] hover:text-gray-900 dark:hover:text-white hover:shadow'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            <span>Find points of interest</span>
            {poiClusters.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-[#0052CC]/40 text-[#0052CC] dark:text-[#60A5FA] text-[10px] font-bold rounded-full">
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
                      <div className="p-1.5 rounded-lg bg-blue-100/70 dark:bg-blue-900/40 text-[#0052CC] dark:text-[#60A5FA] mt-0.5 flex-shrink-0 group-hover:bg-[#0052CC] group-hover:text-white transition-colors">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold truncate">{item.title}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-[#0052CC]/20 text-[#0052CC] dark:text-[#60A5FA] flex-shrink-0">
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
        <div className="flex items-center bg-white/95 dark:bg-[#1C1C1C]/95 backdrop-blur-md rounded-full border border-gray-200 dark:border-[#333] shadow-sm overflow-hidden text-gray-700 dark:text-gray-200 font-bold divide-x divide-gray-200 dark:divide-[#333] hover:shadow transition-shadow">
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

export default function PublicMap({ user: initialUser, hasSession: initialHasSession, theme = 'light', toggleTheme, initialTab = 'reports' }) {
  const [user, setUser] = useState(initialUser || null)
  const [hasSession, setHasSession] = useState(() => {
    if (initialHasSession !== undefined) return Boolean(initialHasSession)
    if (typeof window !== 'undefined') {
      return Boolean(localStorage.getItem('authToken'))
    }
    return false
  })
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [wipeState, setWipeState] = useState('loading')
  const [activeNavTab, setActiveNavTab] = useState(initialTab) // 'reports' | 'gallery' | 'mobile'

  useEffect(() => {
    if (initialTab && initialTab !== activeNavTab) {
      setActiveNavTab(initialTab)
    }
  }, [initialTab])

  useEffect(() => {
    const handlePopState = () => {
      const path = typeof window !== 'undefined' ? window.location.pathname : ''
      if (path === '/mobile') {
        setActiveNavTab('mobile')
      } else if (path === '/gallery') {
        setActiveNavTab('gallery')
      } else if (path === '/' || path === '/map') {
        setActiveNavTab('reports')
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (mounted) {
      setWipeState('swiping')
      const timer = setTimeout(() => {
        setWipeState('done')
      }, 950)
      return () => clearTimeout(timer)
    }
  }, [mounted])

  const handleNavClick = useCallback((href) => (e) => {
    e.preventDefault()
    if (href === '/mobile') {
      setDetailedReport(null)
      setActiveNavTab('mobile')
      if (typeof window !== 'undefined' && window.location.pathname !== '/mobile') {
        window.history.pushState(null, '', '/mobile')
      }
      return
    }
    if (href === '/gallery') {
      setDetailedReport(null)
      setActiveNavTab('gallery')
      if (typeof window !== 'undefined' && window.location.pathname !== '/gallery') {
        window.history.pushState(null, '', '/gallery')
      }
      return
    }
    if (href === '/' || href === '/map') {
      setDetailedReport(null)
      setActiveNavTab('reports')
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.history.pushState(null, '', '/')
      }
      return
    }
    setIsExiting(true)
    setTimeout(() => {
      router.push(href)
    }, 900)
  }, [router])

  // Sync and fetch authenticated session
  useEffect(() => {
    let active = true
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    if (token && !initialUser) {
      const apiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || ''
      fetch(`${apiUrl}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (active && data && data.user) {
          setUser(data.user)
          setHasSession(true)
        }
      })
      .catch((err) => {
        console.error(err)
        if (active && initialHasSession === undefined) {
          setHasSession(false)
        }
      })
    }
    return () => { active = false }
  }, [initialUser, initialHasSession])
  const [reports, setReports] = useState([])
  const [allReports, setAllReports] = useState([])
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
  const [onlySaved, setOnlySaved] = useState(false)
  const [sortBy, setSortBy] = useState('newest')
  
  // Gallery Specific Filter & Search & Lightbox
  const [gallerySearch, setGallerySearch] = useState('')
  const [galleryStatusFilter, setGalleryStatusFilter] = useState('all') // 'all' | 'resolved' | 'in_progress' | 'unresolved'
  const [galleryCategoryFilter, setGalleryCategoryFilter] = useState('all')
  const [gallerySeverityFilter, setGallerySeverityFilter] = useState('all') // 'all' | 'high' | 'medium' | 'low'
  const [gallerySortBy, setGallerySortBy] = useState('newest') // 'newest' | 'oldest' | 'severity' | 'title'
  const [galleryViewMode, setGalleryViewMode] = useState('grid') // 'grid' | 'showcase'
  const [galleryLightboxIndex, setGalleryLightboxIndex] = useState(null)
  const [galleryActivePhotoIndex, setGalleryActivePhotoIndex] = useState(0)
  const [evidenceCache, setEvidenceCache] = useState({})
  const [beforeAfterMode, setBeforeAfterMode] = useState('after') // 'before' | 'after' | 'split'
  const [copiedLink, setCopiedLink] = useState(false)
  
  // Floating dropdown states
  const [activeFilterDropdown, setActiveFilterDropdown] = useState(null)
  const [showPoiInput, setShowPoiInput] = useState(false)
  const [poiQuery, setPoiQuery] = useState('')
  const [clusters, setClusters] = useState([])
  const [loadingClusters, setLoadingClusters] = useState(false)
  
  // Selection & Details
  const [selectedReportId, setSelectedReportId] = useState(null)
  const [flyCoords, setFlyCoords] = useState(null)
  const [savedReportIds, setSavedReportIds] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('ecopin_saved_reports')
        if (stored) return JSON.parse(stored)
      } catch (e) {}
    }
    return []
  })
  const [detailedReport, setDetailedReport] = useState(null)
  const [detailedEvidence, setDetailedEvidence] = useState([])
  const [loadingEvidence, setLoadingEvidence] = useState(false)

  // Modals
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showPdfSummary, setShowPdfSummary] = useState(false)
  const [mobileTab, setMobileTab] = useState('split')

  const markerRefs = useRef({})
  const isDark = theme === 'dark'

  // Initialize client dependencies
  useEffect(() => {
    let active = true
    import('@/lib/leaflet-fix').then(() => { 
      if (typeof window !== 'undefined') {
        try {
          require('leaflet.heat')
        } catch (e) {
          console.error('Failed to load leaflet.heat', e)
        }
      }
      if (active) setMounted(true) 
    })
    return () => { active = false }
  }, [])

  // Persist saved reports
  const toggleSaveReport = useCallback((id) => {
    setSavedReportIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      try {
        localStorage.setItem('ecopin_saved_reports', JSON.stringify(next))
      } catch (e) {}
      return next
    })
  }, [])

  // Fetch all reports across database for global location filtering and accurate location counts
  useEffect(() => {
    let active = true
    const loadAllReports = async () => {
      try {
        const page = await fetchPublicReportPage(supabase, {
          bounds: { south: -85, north: 85, west: -180, east: 180 },
          status: statusFilter,
          issueType: issueTypeFilter,
          limit: 500
        })
        if (active && page.reports) {
          setAllReports(page.reports)
        }
      } catch (err) {
        console.error('Failed to load all reports for location filter:', err)
      }
    }
    loadAllReports()
    return () => { active = false }
  }, [statusFilter, issueTypeFilter, refresh])

  // Data fetching: when a location filter is active, load all reports; otherwise debounce viewport
  useEffect(() => {
    const controller = new AbortController()
    let active = true

    // If filtering by location, do not restrict query to the visible viewport: load all reports!
    if (locationFilter !== 'all' && locationFilter !== 'Pasig City (All)') {
      setLoading(true)
      setLoadError(false)

      fetchPublicReportPage(supabase, {
        bounds: { south: -85, north: 85, west: -180, east: 180 },
        status: statusFilter,
        issueType: issueTypeFilter,
        limit: 500,
        signal: controller.signal
      }).then(page => {
        if (!active) return
        setReports(page.reports)
        setHasMore(page.hasMore)
      }).catch(err => {
        if (!active || controller.signal.aborted) return
        setReports([])
        setHasMore(false)
        setLoadError(true)
      }).finally(() => {
        if (active) setLoading(false)
      })

      return () => {
        active = false
        controller.abort()
      }
    }

    // Default: debounced viewport-based fetching
    if (!viewport) return
    const timer = setTimeout(async () => {
      setLoading(true)
      setLoadError(false)
      try {
        const page = await fetchPublicReportPage(supabase, {
          bounds: viewport, 
          status: statusFilter, 
          issueType: issueTypeFilter,
          limit: 200, 
          signal: controller.signal,
        })
        if (!active) return
        setReports(page.reports)
        setHasMore(page.hasMore)
      } catch (error) {
        if (!active || controller.signal.aborted) return
        setReports([])
        setHasMore(false)
        setLoadError(true)
      } finally {
        if (active) setLoading(false)
      }
    }, 250)

    return () => {
      active = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [viewport, locationFilter, statusFilter, issueTypeFilter, refresh])

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
        console.error('Failed to load clusters for points of interest:', err)
      } finally {
        if (active) setLoadingClusters(false)
      }
    }

    loadClusters()
    return () => { active = false }
  }, [refresh])

  const onViewport = useCallback((bounds, nextZoom) => {
    setViewport(bounds)
    setZoom(nextZoom)
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

    // Saved only filter
    if (onlySaved) {
      list = list.filter(r => savedReportIds.includes(r.id))
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
  }, [
    reports, 
    statusFilter, 
    issueTypeFilter, 
    severityFilter, 
    locationFilter, 
    onlySaved, 
    startDate, 
    endDate, 
    dateFilter, 
    savedReportIds
  ])

  // Sorted reports for the Results Panel
  const sortedReports = useMemo(() => {
    const list = [...filteredReports]
    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    } else if (sortBy === 'severity') {
      const score = (r) => {
        if (r.status === 'urgent' || r.severity_level === 'high') return 3
        if (r.severity_level === 'medium') return 2
        return 1
      }
      list.sort((a, b) => score(b) - score(a))
    } else if (sortBy === 'status') {
      const order = { unresolved: 1, in_progress: 2, resolved: 3 }
      list.sort((a, b) => (order[a.status] || 9) - (order[b.status] || 9))
    }
    return list
  }, [filteredReports, sortBy])

  // Category counts across current verified public reports
  const categoryCounts = useMemo(() => {
    const verifiedReports = (reports || []).filter(isReportVerified)
    const counts = { all: verifiedReports.length }
    ISSUE_TYPES.forEach(cat => { counts[cat] = 0 })
    verifiedReports.forEach(r => {
      if (r.issue_type && counts[r.issue_type] !== undefined) {
        counts[r.issue_type]++
      }
    })
    return counts
  }, [reports])

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
      showHeatmap || 
      onlySaved
    )
  }, [
    statusFilter,
    issueTypeFilter,
    severityFilter,
    locationFilter,
    dateFilter,
    startDate,
    endDate,
    showPins,
    showClusters,
    showHeatmap,
    onlySaved
  ])

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
    setOnlySaved(false)
    setActiveFilterDropdown(null)
    setFlyCoords({ coords: PASIG_CENTER, zoom: DEFAULT_ZOOM, isReset: true, timestamp: Date.now() })
  }, [])

  // Gallery Reports (strictly displays verified reports, filtered by gallery search, saved status, status, category, severity, and sorted)
  const galleryReports = useMemo(() => {
    let list = (reports || []).filter(isReportVerified)

    // Saved only filter
    if (onlySaved) {
      list = list.filter(r => savedReportIds.includes(r.id))
    }
    
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

    if (gallerySearch.trim()) {
      const q = gallerySearch.toLowerCase()
      list = list.filter(r => 
        (r.title || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.issue_type || '').toLowerCase().includes(q)
      )
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
  }, [reports, onlySaved, savedReportIds, galleryStatusFilter, galleryCategoryFilter, gallerySeverityFilter, gallerySearch, gallerySortBy])

  // Prefetch evidence for visible gallery items
  useEffect(() => {
    if (activeNavTab !== 'gallery' || galleryReports.length === 0) return
    let isCancelled = false

    const toFetch = galleryReports
      .slice(0, 24)
      .filter(r => r.location_precision === 'exact' && evidenceCache[r.id] === undefined)

    if (toFetch.length === 0) return

    const loadEvidenceBatch = async () => {
      for (const rep of toFetch) {
        if (isCancelled) break
        try {
          const ev = await fetchReportEvidence(rep.id)
          if (!isCancelled) {
            setEvidenceCache(prev => ({ ...prev, [rep.id]: ev || [] }))
          }
        } catch {
          if (!isCancelled) {
            setEvidenceCache(prev => ({ ...prev, [rep.id]: [] }))
          }
        }
      }
    }

    loadEvidenceBatch()
    return () => { isCancelled = true }
  }, [activeNavTab, galleryReports, evidenceCache])

  // Keyboard navigation for Lightbox and Details Drawer
  useEffect(() => {
    if (galleryLightboxIndex === null && !detailedReport) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (galleryLightboxIndex !== null) {
          setGalleryLightboxIndex(null)
          setGalleryActivePhotoIndex(0)
        } else if (detailedReport !== null) {
          setDetailedReport(null)
        }
      } else if (galleryLightboxIndex !== null && e.key === 'ArrowRight') {
        setGalleryLightboxIndex(prev => (prev + 1) % galleryReports.length)
        setGalleryActivePhotoIndex(0)
      } else if (galleryLightboxIndex !== null && e.key === 'ArrowLeft') {
        setGalleryLightboxIndex(prev => (prev - 1 + galleryReports.length) % galleryReports.length)
        setGalleryActivePhotoIndex(0)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [galleryLightboxIndex, detailedReport, galleryReports.length])

  // Fetch evidence immediately when lightbox opens on an item
  useEffect(() => {
    if (galleryLightboxIndex === null) return
    const current = galleryReports[galleryLightboxIndex]
    if (!current) return
    if (current.location_precision === 'exact' && evidenceCache[current.id] === undefined) {
      fetchReportEvidence(current.id).then(ev => {
        setEvidenceCache(prev => ({ ...prev, [current.id]: ev || [] }))
      }).catch(() => {
        setEvidenceCache(prev => ({ ...prev, [current.id]: [] }))
      })
    }
  }, [galleryLightboxIndex, galleryReports, evidenceCache])

  // Share report link handler
  const handleShareReport = (report) => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/?report=${report.id}`
      navigator.clipboard?.writeText(url).then(() => {
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
      })
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
    setActiveNavTab('reports')
    handleViewDetails(report)
    setTimeout(() => {
      handleSelectReport(report)
    }, 150)
  }

  // Detailed Sidebar View / Evidence fetching
  const handleViewDetails = async (report) => {
    if (!report) return
    setDetailedReport(report)
    setDetailedEvidence([])
    setLoadingEvidence(true)
    if (mobileTab === 'map') {
      setMobileTab('list')
    }
    if (report.location_precision === 'approximate') {
      setLoadingEvidence(false)
      return
    }
    try {
      const evidence = await fetchReportEvidence(report.id)
      setDetailedEvidence(evidence || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingEvidence(false)
    }
  }

  // Location flying
  const handleFlyToLocation = (locName) => {
    if (locName === 'all' || locName === 'Pasig City (All)') {
      setFlyCoords({ coords: PASIG_CENTER, zoom: DEFAULT_ZOOM, isReset: true, timestamp: Date.now() })
      return
    }
    const target = LOCATIONS.find(l => l.name.toLowerCase().includes(locName.toLowerCase()))
    if (target) {
      setFlyCoords({ coords: [target.lat, target.lng], zoom: 15, timestamp: Date.now() })
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
              onClick={() => handleShareReport(detailedReport)}
              className="p-2 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Share link to report"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => toggleSaveReport(detailedReport.id)}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                savedReportIds.includes(detailedReport.id)
                  ? 'text-[#0052CC] dark:text-[#60A5FA] bg-blue-50 dark:bg-[#0052CC]/20'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
              }`}
              title={savedReportIds.includes(detailedReport.id) ? "Saved in bookmarks" : "Bookmark report"}
            >
              <Bookmark className={`w-4 h-4 ${savedReportIds.includes(detailedReport.id) ? 'fill-[#0052CC] text-[#0052CC] dark:fill-[#60A5FA] dark:text-[#60A5FA]' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => {
                const idx = galleryReports.findIndex(r => r.id === detailedReport.id)
                setGalleryLightboxIndex(idx !== -1 ? idx : 0)
                setGalleryActivePhotoIndex(0)
              }}
              className="p-2 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Open Fullscreen Inspector"
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
              const idx = galleryReports.findIndex(r => r.id === detailedReport.id)
              setGalleryLightboxIndex(idx !== -1 ? idx : 0)
              setGalleryActivePhotoIndex(0)
            }}
            className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-gray-100 dark:bg-[#222] border border-gray-200/80 dark:border-[#2A2A2A] shadow-sm cursor-pointer group select-none"
          >
            <img 
              src={getReportImage(detailedReport, evidenceCache)} 
              alt={detailedReport.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            />
            
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
              <Maximize2 className="w-3 h-3 text-[#0052CC] dark:text-[#60A5FA]" />
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
                title="Click to view pin on map"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-100/70 dark:bg-[#0052CC]/20 flex items-center justify-center flex-shrink-0 text-[#0052CC] dark:text-[#60A5FA] group-hover:scale-105 transition-transform">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider group-hover:text-[#0052CC] dark:group-hover:text-[#60A5FA] transition-colors">Coordinates</p>
                  <p className="font-mono text-gray-800 dark:text-gray-200 font-semibold truncate text-xs mt-0.5">
                    {detailedReport.latitude?.toFixed(4)}, {detailedReport.longitude?.toFixed(4)}
                  </p>
                </div>
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
                <span className="text-[10px] font-semibold text-[#0052CC] dark:text-[#60A5FA]">
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
                {detailedEvidence.map((img, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                      const idx = galleryReports.findIndex(r => r.id === detailedReport.id)
                      setGalleryLightboxIndex(idx !== -1 ? idx : 0)
                      setGalleryActivePhotoIndex(i)
                    }}
                    className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-[#333] shadow-xs cursor-pointer group"
                  >
                    <img src={img.url} alt="Evidence" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-gray-50 dark:bg-[#242424] rounded-2xl border border-gray-100 dark:border-[#2A2A2A] flex items-center gap-3">
                <img 
                  src={getReportImage(detailedReport, evidenceCache)} 
                  alt="Category preview" 
                  className="w-16 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-200 dark:border-[#333]" 
                />
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
                      <img src={detailedReport.before_photo_url} alt="Before" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
                {detailedReport.after_photo_url && (
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-600 text-white mb-1.5 shadow-xs">
                      After Resolution
                    </span>
                    <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-[#333] shadow-xs">
                      <img src={detailedReport.after_photo_url} alt="After" className="w-full h-full object-cover" />
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
            onClick={() => handleJumpToMap(detailedReport)}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-[#0052CC] hover:bg-[#0042A3] active:scale-[0.99] text-white flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <MapPin className="w-4 h-4" />
            <span>{activeNavTab === 'reports' ? 'Center Pin on Map' : 'Locate Pin on Map'}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                const idx = galleryReports.findIndex(r => r.id === detailedReport.id)
                setGalleryLightboxIndex(idx !== -1 ? idx : 0)
                setGalleryActivePhotoIndex(0)
              }}
              className="py-2 px-3 rounded-xl font-semibold text-xs border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 bg-gray-50/80 dark:bg-[#242424] hover:bg-gray-100 dark:hover:bg-[#2A2A2A] transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              <Maximize2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              <span>Inspector</span>
            </button>

            <button
              type="button"
              onClick={() => toggleSaveReport(detailedReport.id)}
              className={`py-2 px-3 rounded-xl font-semibold text-xs border transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] ${
                savedReportIds.includes(detailedReport.id)
                  ? 'border-blue-300 dark:border-blue-800 text-[#0052CC] dark:text-[#60A5FA] bg-blue-50/80 dark:bg-[#0052CC]/20'
                  : 'border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 bg-gray-50/80 dark:bg-[#242424] hover:bg-gray-100 dark:hover:bg-[#2A2A2A]'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${savedReportIds.includes(detailedReport.id) ? 'fill-current' : ''}`} />
              <span>{savedReportIds.includes(detailedReport.id) ? 'Saved' : 'Bookmark'}</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!mounted) {
    return <LoadingScreen mode="static" />
  }

  return (
    <div className="h-screen w-full flex flex-col bg-white dark:bg-[#121212] text-gray-900 dark:text-gray-100 select-none overflow-hidden font-sans transition-colors duration-300">
      <style jsx global>{`
        /* Map Tile Desaturation & Contrast */
        .muted-tiles {
          filter: grayscale(20%) contrast(102%) brightness(101%);
        }
        .leaflet-grab { cursor: grab !important; }
        .leaflet-dragging .leaflet-grab { cursor: grabbing !important; }
        .leaflet-control-zoom { display: none !important; }

        /* Floating Popup Card */
        .leaflet-popup.custom-floating-popup .leaflet-popup-content-wrapper {
          padding: 0 !important;
          border-radius: 18px !important;
          box-shadow: 0 16px 36px -6px rgba(0, 0, 0, ${isDark ? '0.6' : '0.18'}), 0 4px 10px -2px rgba(0, 0, 0, ${isDark ? '0.4' : '0.08'}) !important;
          border: 1px solid ${isDark ? '#2A2A2A' : 'rgba(229, 231, 235, 0.9)'} !important;
          overflow: hidden !important;
          background: ${isDark ? '#1C1C1C' : '#ffffff'} !important;
        }
        .leaflet-popup.custom-floating-popup .leaflet-popup-content {
          margin: 0 !important;
          line-height: inherit !important;
          width: 320px !important;
        }
        .leaflet-popup.custom-floating-popup .leaflet-popup-close-button {
          top: 10px !important;
          right: 10px !important;
          width: 24px !important;
          height: 24px !important;
          background: ${isDark ? '#262626' : 'rgba(255, 255, 255, 0.9)'} !important;
          backdrop-filter: blur(4px) !important;
          border-radius: 50% !important;
          color: ${isDark ? '#F3F4F6' : '#374151'} !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12) !important;
          border: 1px solid ${isDark ? '#3A3A3A' : 'rgba(229, 231, 235, 0.8)'} !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          z-index: 20 !important;
          padding: 0 !important;
          transition: background-color 0.15s ease;
        }
        .leaflet-popup.custom-floating-popup .leaflet-popup-close-button:hover {
          background: ${isDark ? '#333333' : '#f3f4f6'} !important;
          color: ${isDark ? '#FFFFFF' : '#111827'} !important;
        }
        .leaflet-popup.custom-floating-popup .leaflet-popup-tip-container {
          display: none !important;
        }

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
          transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
          will-change: transform;
        }
        .custom-pin-marker:hover .ecopin-pin-wrapper {
          transform: scale(1.15) translateY(-3px);
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

      {/* 1. TOP NAVIGATION BAR */}
      <header className="bg-white dark:bg-[#1C1C1C] border-b border-gray-200/80 dark:border-[#2A2A2A] px-4 sm:px-6 py-2.5 flex items-center justify-between z-30 relative flex-shrink-0 transition-colors duration-300">
        {/* Left: Brand Logo & View Mode Navigation Tabs */}
        <div className="flex items-center gap-4 sm:gap-7 min-w-0">
          <Link href="/" onClick={handleNavClick('/')} className="cursor-pointer transition-all flex items-center group flex-shrink-0 mr-1 sm:mr-3" title="EcoPin Home">
            <img src="/Full Logo Light.png" alt="EcoPin" className="h-7 sm:h-8 w-auto dark:hidden" />
            <img src="/Full Logo Dark.png" alt="EcoPin" className="h-7 sm:h-8 w-auto hidden dark:block" />
          </Link>

          <div className="flex items-center gap-3.5 sm:gap-6 overflow-x-auto no-scrollbar">
            <button 
              type="button"
              onClick={() => {
                setDetailedReport(null)
                setActiveNavTab('reports')
                if (typeof window !== 'undefined' && window.location.pathname !== '/') {
                  window.history.pushState(null, '', '/')
                }
              }}
              className={`text-sm pb-1.5 pt-1 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeNavTab === 'reports'
                  ? 'font-bold text-[#0052CC] dark:text-[#60A5FA] border-b-2 border-[#0052CC] dark:border-[#60A5FA]'
                  : 'font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>Public Reports</span>
            </button>

            <button 
              type="button"
              onClick={() => {
                setActiveNavTab('gallery')
                if (typeof window !== 'undefined' && window.location.pathname !== '/gallery') {
                  window.history.pushState(null, '', '/gallery')
                }
              }}
              className={`text-sm pb-1.5 pt-1 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeNavTab === 'gallery'
                  ? 'font-bold text-[#0052CC] dark:text-[#60A5FA] border-b-2 border-[#0052CC] dark:border-[#60A5FA]'
                  : 'font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>Incident Gallery</span>
            </button>

            <button 
              type="button"
              onClick={() => {
                setActiveNavTab('mobile')
                if (typeof window !== 'undefined' && window.location.pathname !== '/mobile') {
                  window.history.pushState(null, '', '/mobile')
                }
              }}
              className={`text-sm pb-1.5 pt-1 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeNavTab === 'mobile'
                  ? 'font-bold text-[#0052CC] dark:text-[#60A5FA] border-b-2 border-[#0052CC] dark:border-[#60A5FA]'
                  : 'font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>Mobile App</span>
            </button>
          </div>
        </div>

        {/* Right: Theme Toggle, Notifications, Saved Reports, and User Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 flex-shrink-0">
          {toggleTheme && (
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-[#2A2A2A] flex items-center justify-center"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          )}

          {/* User Avatar / Sign In */}
          {hasSession ? (
            <a 
              href="/dashboard" 
              onClick={handleNavClick('/dashboard')}
              className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-[#2A2A2A] group cursor-pointer transition-all"
              title="Open Dashboard"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 flex-shrink-0 group-hover:ring-2 group-hover:ring-[#0052CC] transition-all">
                <img 
                  src={user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || user?.email || 'User')}&background=0052CC&color=fff`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 hidden sm:block max-w-[120px] truncate group-hover:text-[#0052CC] dark:group-hover:text-[#60A5FA] transition-colors">
                {user?.full_name || 'Dashboard'}
              </span>
            </a>
          ) : (
            <div className="pl-2 border-l border-gray-200 dark:border-[#2A2A2A]">
              <Link 
                href="/auth" 
                onClick={handleNavClick('/auth')}
                className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200 hover:text-white hover:bg-[#0052CC] dark:hover:bg-[#0052CC] dark:hover:text-white rounded-full px-3.5 sm:px-4 py-1.5 border border-gray-300 dark:border-[#333] transition-all whitespace-nowrap"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* VIEW MODE 1: PUBLIC REPORTS (SPLIT MAP & RESULTS) */}
      {activeNavTab === 'reports' && (
        <>
          {/* FILTER BAR (Below Navigation) */}
          <section className="bg-white dark:bg-[#1C1C1C] border-b border-gray-200/90 dark:border-[#2A2A2A] px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2.5 z-[1001] relative flex-shrink-0 transition-colors duration-300">
            {/* Left: Pill Filters */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 py-0.5">
                {/* Status Lifecycle Segmented Control (matching Incident Gallery) */}
                <div className="flex items-center bg-gray-200/60 dark:bg-[#242424] p-0.5 rounded-full border border-gray-200 dark:border-[#333] text-xs font-semibold mr-1">
                  {[
                    { id: 'all', label: 'All Reports' },
                    { id: 'unresolved', label: 'Unresolved' },
                    { id: 'in_progress', label: 'In Progress' },
                    { id: 'resolved', label: 'Resolved' }
                  ].map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStatusFilter(st.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        statusFilter === st.id 
                          ? 'bg-white dark:bg-[#1C1C1C] text-[#0052CC] dark:text-[#60A5FA] shadow-xs font-semibold' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                {/* 1. Layers Toggle Pill */}
                <div className="relative" data-filter-dropdown="true">
                  <button 
                    type="button"
                    onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'layers' ? null : 'layers')}
                    className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                      !showPins || !showClusters || showHeatmap
                        ? 'bg-blue-50 dark:bg-[#0052CC]/25 text-blue-900 dark:text-[#60A5FA] border-blue-200 dark:border-[#0052CC]/50 shadow-xs' 
                        : 'bg-white dark:bg-[#242424] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#333] hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#2A2A2A]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    <span>Layers</span>
                    <ChevronDown className="w-3 h-3 text-gray-400" />
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
                    className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                      locationFilter !== 'all' 
                        ? 'bg-blue-50 dark:bg-[#0052CC]/25 text-blue-900 dark:text-[#60A5FA] border-blue-200 dark:border-[#0052CC]/50 shadow-xs' 
                        : 'bg-white dark:bg-[#242424] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#333] hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#2A2A2A]'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    <span>{locationFilter === 'all' ? 'All Locations' : locationFilter}</span>
                    <ChevronDown className="w-3 h-3 text-gray-400" />
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
                              ? 'bg-blue-50 dark:bg-[#0052CC]/25 text-[#0052CC] dark:text-[#60A5FA] font-bold' 
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2A2A2A]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{loc.label}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-500 dark:text-gray-400">
                              {loc.count}
                            </span>
                          </div>
                          {locationFilter === loc.name && <Check className="w-3 h-3 text-[#0052CC] dark:text-[#60A5FA]" />}
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
                    className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                      dateFilter !== 'all' || startDate || endDate
                        ? 'bg-blue-50 dark:bg-[#0052CC]/25 text-blue-900 dark:text-[#60A5FA] border-blue-200 dark:border-[#0052CC]/50 shadow-xs' 
                        : 'bg-white dark:bg-[#242424] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#333] hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#2A2A2A]'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
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
                    <ChevronDown className="w-3 h-3 text-gray-400" />
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
                              ? 'bg-blue-50 dark:bg-[#0052CC]/25 text-[#0052CC] dark:text-[#60A5FA] font-bold' 
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2A2A2A]'
                          }`}
                        >
                          <span>{d.label}</span>
                          {dateFilter === d.id && !startDate && !endDate && <Check className="w-3 h-3 text-[#0052CC] dark:text-[#60A5FA]" />}
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
                    className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                      issueTypeFilter !== 'all' 
                        ? 'bg-blue-50 dark:bg-[#0052CC]/25 text-blue-900 dark:text-[#60A5FA] border-blue-200 dark:border-[#0052CC]/50 shadow-xs' 
                        : 'bg-white dark:bg-[#242424] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#333] hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#2A2A2A]'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    <span className="capitalize">{issueTypeFilter === 'all' ? 'Category' : issueTypeFilter.replace(/_/g, ' ')}</span>
                    <ChevronDown className="w-3 h-3 text-gray-400" />
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
                              ? 'bg-blue-50 dark:bg-[#0052CC]/25 text-[#0052CC] dark:text-[#60A5FA] font-bold' 
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2A2A2A]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{type.label}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-500 dark:text-gray-400">
                              {type.count}
                            </span>
                          </div>
                          {issueTypeFilter === type.id && <Check className="w-3 h-3 text-[#0052CC] dark:text-[#60A5FA]" />}
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
                    className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                      severityFilter !== 'all' 
                        ? 'bg-blue-50 dark:bg-[#0052CC]/25 text-blue-900 dark:text-[#60A5FA] border-blue-200 dark:border-[#0052CC]/50 shadow-xs' 
                        : 'bg-white dark:bg-[#242424] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#333] hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-[#2A2A2A]'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                    <span className="capitalize">{severityFilter === 'all' ? 'Severity' : severityFilter}</span>
                    <ChevronDown className="w-3 h-3 text-gray-400" />
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
                              ? 'bg-blue-50 dark:bg-[#0052CC]/25 text-[#0052CC] dark:text-[#60A5FA] font-bold' 
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2A2A2A]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{s.label}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-100 dark:bg-[#2A2A2A] text-gray-500 dark:text-gray-400">
                              {s.count}
                            </span>
                          </div>
                          {severityFilter === s.id && <Check className="w-3 h-3 text-[#0052CC] dark:text-[#60A5FA]" />}
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
                    className="px-3 py-1.5 rounded-full border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs"
                    title="Reset all active filters"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Far Right: Mobile View Toggle & Saved Reports Filter */}
            <div className="flex items-center gap-2">
              <div className="md:hidden flex items-center bg-gray-100 dark:bg-[#262626] rounded-full p-0.5 border border-gray-200 dark:border-[#333] text-xs font-semibold">
                <button 
                  type="button"
                  onClick={() => setMobileTab('map')}
                  className={`px-2.5 py-1 rounded-full transition-all ${
                    mobileTab === 'map' 
                      ? 'bg-white dark:bg-[#1C1C1C] text-[#0052CC] dark:text-[#60A5FA] shadow-xs' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Map
                </button>
                <button 
                  type="button"
                  onClick={() => setMobileTab('list')}
                  className={`px-2.5 py-1 rounded-full transition-all ${
                    mobileTab === 'list' 
                      ? 'bg-white dark:bg-[#1C1C1C] text-[#0052CC] dark:text-[#60A5FA] shadow-xs' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  List ({sortedReports.length})
                </button>
              </div>

              <button 
                type="button"
                onClick={() => setOnlySaved(!onlySaved)}
                className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                  onlySaved 
                    ? 'border-[#0052CC] bg-blue-50 dark:bg-[#0052CC]/25 text-[#0052CC] dark:text-[#60A5FA]' 
                    : 'border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#262626] bg-white dark:bg-[#242424]'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                <span className="hidden sm:inline">Saved Reports</span>
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {savedReportIds.length}
                </span>
              </button>
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
                style={{ height: '100%', width: '100%', background: isDark ? '#121212' : '#f3f4f6' }}
              >
                <ViewportTracker onViewport={onViewport} />
                <MapController selectedCoords={flyCoords} />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
                  className={isDark ? 'dark-mode-tiles' : 'muted-tiles'}
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
                    : (CATEGORY_IMAGES[cluster.issue_type] || CATEGORY_IMAGES.others)

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
                {showClusters && zoom > 14 && filteredClusters.map((cluster) => {
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

                  return (
                    <Polygon
                      key={`polygon-${cluster.id}`}
                      positions={sortedPoints}
                      color="#0052CC"
                      fillColor="#0052CC"
                      fillOpacity={isDark ? 0.25 : 0.15}
                      weight={2}
                      dashArray="4 4"
                    />
                  )
                })}

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
                    const isSaved = savedReportIds.includes(report.id)
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
                          zIndexOffset={isSelected ? 1000 : 0}
                          ref={(el) => {
                            if (el) markerRefs.current[report.id] = el
                          }}
                          eventHandlers={{
                            click: () => handleSelectReport(report, [latitude, longitude])
                          }}
                        >
                          <Popup 
                            className="custom-floating-popup"
                            closeButton={true}
                            autoPan={true}
                            autoPanPadding={[24, 24]}
                          >
                            <div className="font-sans text-gray-900 dark:text-gray-100 bg-white dark:bg-[#1C1C1C]">
                              <div className="relative w-full h-36 bg-gray-100 dark:bg-gray-800 overflow-hidden rounded-t-[18px]">
                                <img 
                                  src={reportImage} 
                                  alt={report.title} 
                                  className="w-full h-full object-cover" 
                                />
                                <div className="absolute top-2.5 left-2.5 bg-white/90 dark:bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200 shadow-xs">
                                  {report.issue_type?.replace(/_/g, ' ') || 'Incident'}
                                </div>
                                {report.status === 'urgent' && (
                                  <div className="absolute top-2.5 right-10 bg-red-600 text-white px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-xs">
                                    Urgent
                                  </div>
                                )}
                              </div>

                              <div className="p-3.5 sm:p-4 bg-white dark:bg-[#1C1C1C] rounded-b-[18px]">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white leading-snug line-clamp-2">
                                      {report.title || 'Environmental Incident'}
                                    </h4>
                                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                                      Report #{report.id?.toString().slice(0, 8)}
                                    </p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                                      report.status === 'urgent' || report.severity_level === 'high' 
                                        ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400' 
                                        : 'bg-blue-50 dark:bg-[#0052CC]/25 text-[#0052CC] dark:text-[#60A5FA]'
                                    }`}>
                                      {report.severity_level || (report.status === 'urgent' ? 'High' : 'Active')}
                                    </span>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                      {new Date(report.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>

                                <div className="space-y-1 py-2 border-t border-b border-gray-100 dark:border-[#2A2A2A] text-xs">
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Category</span>
                                    <span className="text-gray-700 dark:text-gray-200 font-medium capitalize">{report.issue_type?.replace(/_/g, ' ')}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Location</span>
                                    <span className="text-gray-700 dark:text-gray-200 font-medium truncate max-w-[190px]">
                                      {report.location_precision === 'approximate' 
                                        ? 'Approx. Pasig Vicinity' 
                                        : `${report.latitude?.toFixed(4)}, ${report.longitude?.toFixed(4)}`}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Date reported</span>
                                    <span className="text-gray-700 dark:text-gray-200 font-medium">{new Date(report.created_at).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Status</span>
                                    <span className="text-gray-700 dark:text-gray-200 font-medium capitalize">{report.status?.replace(/_/g, ' ')}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Reporter</span>
                                    <span className="text-gray-700 dark:text-gray-200 font-medium flex items-center gap-1">
                                      <ShieldCheck className="w-3 h-3 text-[#0052CC] dark:text-[#60A5FA]" />
                                      <span>Citizen (Verified)</span>
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-2.5 p-2 bg-blue-50/90 dark:bg-[#0052CC]/15 border border-blue-100 dark:border-[#0052CC]/30 rounded-xl flex items-center gap-2 text-xs text-blue-900 dark:text-blue-200">
                                  <CheckCircle2 className="w-4 h-4 text-[#0052CC] dark:text-[#60A5FA] flex-shrink-0" />
                                  <span className="font-medium text-[11px] leading-tight">
                                    {report.status === 'resolved' 
                                      ? 'This report has been resolved & cleared.'
                                      : report.status === 'in_progress'
                                      ? 'Task force assigned to cleanup area.'
                                      : 'Report logged & queued for inspection.'}
                                  </span>
                                </div>

                                <div className="mt-2.5 flex items-center gap-2">
                                  <button 
                                    type="button"
                                    onClick={() => handleViewDetails(report)}
                                    className="flex-1 py-2 px-3 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-[#242424] border border-gray-300 dark:border-[#333] rounded-xl hover:bg-gray-50 dark:hover:bg-[#2A2A2A] transition-colors shadow-xs text-center"
                                  >
                                    More Details
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => toggleSaveReport(report.id)}
                                    className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-colors shadow-xs text-center flex items-center justify-center gap-1.5 ${
                                      isSaved 
                                        ? 'border-blue-300 dark:border-blue-800 text-[#0052CC] dark:text-[#60A5FA] bg-blue-50 dark:bg-[#0052CC]/20 hover:bg-blue-100'
                                        : 'border-[#0052CC] text-[#0052CC] dark:text-[#60A5FA] bg-blue-50/40 dark:bg-[#0052CC]/15 hover:bg-blue-100 dark:hover:bg-[#0052CC]/30'
                                    }`}
                                  >
                                    <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#0052CC] text-[#0052CC] dark:fill-[#60A5FA] dark:text-[#60A5FA]' : ''}`} />
                                    <span>{isSaved ? 'Saved' : 'Save Report'}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      </React.Fragment>
                    )
                  }
                  return null
                })}
              </MapContainer>

              <div className="absolute bottom-4 left-4 z-[400] pointer-events-none">
                <div className="bg-white/95 dark:bg-[#1C1C1C]/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-gray-200/90 dark:border-[#333] shadow-sm text-xs text-gray-600 dark:text-gray-300 font-medium">
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
                  <div className="px-5 py-3.5 border-b border-gray-200/80 dark:border-[#2A2A2A] flex items-center justify-between gap-3 bg-white dark:bg-[#1C1C1C] flex-shrink-0">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <h2 className="font-bold text-base text-gray-900 dark:text-white tracking-tight truncate">
                          {locationFilter === 'all' ? 'Viewport Reports' : locationFilter}
                        </h2>
                        <span className="text-[#0052CC] dark:text-[#60A5FA] font-bold text-xs whitespace-nowrap">
                          {sortedReports.length} Results
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        {locationFilter === 'all' ? 'Showing reports in visible map view' : `Filtered by ${locationFilter}`}
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-[#242424] border border-gray-200 dark:border-[#333] rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0052CC] cursor-pointer shadow-xs hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                      >
                        <option value="newest">Sort by: Newest</option>
                        <option value="severity">Sort by: Severity</option>
                        <option value="status">Sort by: Status</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 custom-scrollbar bg-gray-50/50 dark:bg-[#121212]">
                    {sortedReports.length === 0 ? (
                      <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-[#1C1C1C] rounded-2xl border border-gray-200/80 dark:border-[#2A2A2A] mt-4">
                        <AlertCircle className="w-8 h-8 text-[#0052CC] dark:text-[#60A5FA] mb-2" />
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">No reports match your filters</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[220px]">
                          Try clearing some filter pills or zooming out to see more community reports.
                        </p>
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-4 px-4 py-1.5 text-xs font-semibold text-[#0052CC] dark:text-[#60A5FA] bg-blue-50 dark:bg-[#0052CC]/20 border border-blue-200 dark:border-[#0052CC]/40 rounded-full hover:bg-blue-100 dark:hover:bg-[#0052CC]/30 transition-colors"
                        >
                          Reset all filters
                        </button>
                      </div>
                    ) : (
                      sortedReports.map((report) => {
                        const isSelected = selectedReportId === report.id
                        const isSaved = savedReportIds.includes(report.id)
                        const thumbImg = getReportImage(report)

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
                            <div className="relative w-28 h-20 sm:w-32 sm:h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                              <img 
                                src={thumbImg} 
                                alt={report.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                              />

                              {report.status === 'urgent' || report.severity_level === 'high' ? (
                                <div className="absolute top-1.5 left-1.5 bg-gray-900/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-sm">
                                  URGENT
                                </div>
                              ) : report.status === 'resolved' ? (
                                <div className="absolute top-1.5 left-1.5 bg-emerald-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-sm">
                                  RESOLVED
                                </div>
                              ) : report.status === 'in_progress' ? (
                                <div className="absolute top-1.5 left-1.5 bg-[#0052CC]/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-sm">
                                  IN PROGRESS
                                </div>
                              ) : (
                                <div className="absolute top-1.5 left-1.5 bg-amber-500/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-sm shadow-xs">
                                  UNRESOLVED
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleSaveReport(report.id)
                                }}
                                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-all"
                                title={isSaved ? 'Remove from saved' : 'Save report'}
                              >
                                <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'text-amber-400 fill-amber-400' : 'text-white'}`} />
                              </button>
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
                              </p>

                              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 truncate flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <span>
                                  {report.location_precision === 'approximate' 
                                    ? 'Pasig City District' 
                                    : `${report.latitude?.toFixed(4)}, ${report.longitude?.toFixed(4)}`}
                                </span>
                              </p>
                            </div>
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
          {/* Gallery Top Filter & Search Bar */}
          <section className="bg-white dark:bg-[#1C1C1C] border-b border-gray-200/80 dark:border-[#2A2A2A] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 transition-colors">
            {/* Left: Status Lifecycle, Category, Priority & Saved Filters */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Status Lifecycle Segmented Control */}
              <div className="flex items-center bg-gray-200/60 dark:bg-[#242424] p-0.5 rounded-full border border-gray-200 dark:border-[#333] text-xs font-semibold">
                {[
                  { id: 'all', label: 'All Photos' },
                  { id: 'unresolved', label: 'Unresolved' },
                  { id: 'in_progress', label: 'In Progress' },
                  { id: 'resolved', label: 'Resolved' }
                ].map(st => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setGalleryStatusFilter(st.id)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      galleryStatusFilter === st.id 
                        ? 'bg-white dark:bg-[#1C1C1C] text-[#0052CC] dark:text-[#60A5FA] shadow-xs font-semibold' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-0.5 hidden sm:block" />

              {/* Category Filter Select */}
              <select
                value={galleryCategoryFilter}
                onChange={(e) => setGalleryCategoryFilter(e.target.value)}
                className={`text-xs font-medium border rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0052CC] cursor-pointer transition-colors ${
                  galleryCategoryFilter !== 'all'
                    ? 'border-[#0052CC] bg-blue-50 dark:bg-[#0052CC]/25 text-[#0052CC] dark:text-[#60A5FA] font-semibold'
                    : 'border-gray-200 dark:border-[#333] bg-white dark:bg-[#242424] text-gray-700 dark:text-gray-300'
                }`}
              >
                <option value="all">Category: All ({categoryCounts.all})</option>
                {ISSUE_TYPES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} ({categoryCounts[cat] || 0})
                  </option>
                ))}
              </select>

              {/* Priority Filter Select */}
              <select
                value={gallerySeverityFilter}
                onChange={(e) => setGallerySeverityFilter(e.target.value)}
                className={`text-xs font-medium border rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0052CC] cursor-pointer transition-colors ${
                  gallerySeverityFilter !== 'all'
                    ? 'border-[#0052CC] bg-blue-50 dark:bg-[#0052CC]/25 text-[#0052CC] dark:text-[#60A5FA] font-semibold'
                    : 'border-gray-200 dark:border-[#333] bg-white dark:bg-[#242424] text-gray-700 dark:text-gray-300'
                }`}
              >
                <option value="all">Priority: All</option>
                <option value="high">Priority: High / Urgent</option>
                <option value="medium">Priority: Medium</option>
                <option value="low">Priority: Low</option>
              </select>

              {/* Saved Reports Toggle Pill */}
              <button 
                type="button"
                onClick={() => setOnlySaved(!onlySaved)}
                className={`px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  onlySaved 
                    ? 'border-[#0052CC] bg-blue-50 dark:bg-[#0052CC]/25 text-[#0052CC] dark:text-[#60A5FA] font-semibold shadow-xs' 
                    : 'border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#262626] bg-white dark:bg-[#242424]'
                }`}
                title={onlySaved ? "Show all gallery reports" : "Show saved reports only"}
              >
                <Bookmark className={`w-3.5 h-3.5 ${onlySaved || savedReportIds.length > 0 ? 'text-[#0052CC] fill-[#0052CC] dark:text-[#60A5FA] dark:fill-[#60A5FA]' : 'text-gray-400'}`} />
                <span>Saved Reports</span>
                {savedReportIds.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    {savedReportIds.length}
                  </span>
                )}
              </button>

              {/* Reset Filters Action */}
              {(galleryCategoryFilter !== 'all' || galleryStatusFilter !== 'all' || gallerySeverityFilter !== 'all' || gallerySearch || onlySaved) && (
                <button
                  type="button"
                  onClick={() => {
                    setGalleryCategoryFilter('all')
                    setGalleryStatusFilter('all')
                    setGallerySeverityFilter('all')
                    setGallerySearch('')
                    setOnlySaved(false)
                  }}
                  className="text-xs text-[#0052CC] dark:text-[#60A5FA] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Right: Search, Sort & View Mode */}
            <div className="flex items-center gap-2.5 ml-auto">
              {/* Search */}
              <div className="relative w-44 sm:w-60">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search incident photos..."
                  value={gallerySearch}
                  onChange={(e) => setGallerySearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-gray-50 dark:bg-[#242424] text-gray-900 dark:text-white border border-gray-200 dark:border-[#333] rounded-full focus:outline-none focus:ring-1 focus:ring-[#0052CC] focus:bg-white dark:focus:bg-[#1C1C1C] transition-all"
                />
                {gallerySearch && (
                  <button
                    type="button"
                    onClick={() => setGallerySearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <select
                value={gallerySortBy}
                onChange={(e) => setGallerySortBy(e.target.value)}
                className="text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#242424] border border-gray-200 dark:border-[#333] rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0052CC] cursor-pointer"
                title="Sort incidents"
              >
                <option value="newest">Sort: Newest</option>
                <option value="oldest">Sort: Oldest</option>
                <option value="severity">Sort: Highest Severity</option>
                <option value="title">Sort: Title (A-Z)</option>
              </select>

              {/* View Mode Switcher */}
              <div className="flex items-center bg-gray-100 dark:bg-[#242424] p-0.5 rounded-full border border-gray-200 dark:border-[#333]">
                <button
                  type="button"
                  onClick={() => setGalleryViewMode('grid')}
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    galleryViewMode === 'grid'
                      ? 'bg-white dark:bg-[#1C1C1C] text-[#0052CC] dark:text-[#60A5FA] shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setGalleryViewMode('showcase')}
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    galleryViewMode === 'showcase'
                      ? 'bg-white dark:bg-[#1C1C1C] text-[#0052CC] dark:text-[#60A5FA] shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Showcase view"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </section>

          {/* Gallery Content with slide-over / sidebar details */}
          <div className="flex-1 flex min-h-0 overflow-hidden relative">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
              {galleryReports.length === 0 ? (
                <div className="max-w-md mx-auto h-72 flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-[#1C1C1C] rounded-3xl border border-gray-200 dark:border-[#2A2A2A] shadow-xs mt-8">
                  {onlySaved ? (
                    <>
                      <Bookmark className="w-10 h-10 text-[#0052CC] fill-[#0052CC]/20 dark:text-[#60A5FA] dark:fill-[#60A5FA]/20 mb-3 animate-pulse" />
                      <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">No saved reports in gallery</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        You haven&apos;t bookmarked any reports yet. Tap the bookmark icon on any incident card to save and track it here.
                      </p>
                      <button
                        type="button"
                        onClick={() => setOnlySaved(false)}
                        className="mt-4 px-4 py-2 text-xs font-semibold text-[#0052CC] dark:text-[#60A5FA] bg-blue-50 dark:bg-[#0052CC]/20 border border-blue-200 dark:border-[#0052CC]/40 rounded-full hover:bg-blue-100 transition-colors"
                      >
                        View All Reports
                      </button>
                    </>
                  ) : (
                    <>
                      <Camera className="w-10 h-10 text-gray-400 mb-3" />
                      <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">No incident photos found</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Try adjusting your search query, status, or selecting a different category filter.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setGallerySearch('')
                          setGalleryStatusFilter('all')
                          setGalleryCategoryFilter('all')
                          setGallerySeverityFilter('all')
                          setOnlySaved(false)
                        }}
                        className="mt-4 px-4 py-2 text-xs font-semibold text-[#0052CC] dark:text-[#60A5FA] bg-blue-50 dark:bg-[#0052CC]/20 border border-blue-200 dark:border-[#0052CC]/40 rounded-full hover:bg-blue-100 transition-colors"
                      >
                        Reset Gallery Filters
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className={
                  galleryViewMode === 'showcase'
                    ? "grid grid-cols-1 lg:grid-cols-2 gap-6"
                    : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5"
                }>
                  {galleryReports.map((report, idx) => {
                    const imgUrl = getReportImage(report, evidenceCache)
                    const isSaved = savedReportIds.includes(report.id)
                    const evidenceList = evidenceCache[report.id] || []
                    const hasRealPhotos = evidenceList.length > 0 || Boolean(report.before_photo_url || report.after_photo_url)

                    return (
                      <div 
                        key={report.id}
                        onClick={() => handleViewDetails(report)}
                        className={`group bg-white dark:bg-[#1E1E1E] rounded-2xl border ${
                          detailedReport?.id === report.id
                            ? 'border-[#0052CC] ring-2 ring-[#0052CC]/25 dark:border-[#60A5FA]'
                            : 'border-gray-200/90 dark:border-[#2A2A2A] hover:border-[#0052CC]/50'
                        } overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer`}
                      >
                        {/* Photo Container */}
                        <div className={`relative ${galleryViewMode === 'showcase' ? 'aspect-[16/9]' : 'aspect-[16/10]'} bg-gray-100 dark:bg-gray-800 overflow-hidden`}>
                          <img 
                            src={imgUrl} 
                            alt={report.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                          
                          {/* Status Badge */}
                          <div className="absolute top-2.5 left-2.5">
                            {report.status === 'resolved' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-xs backdrop-blur-sm flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-white" />
                                <span>Resolved & Cleared</span>
                              </span>
                            ) : report.status === 'urgent' || report.severity_level === 'high' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white shadow-xs backdrop-blur-sm flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-white" />
                                <span>High Priority</span>
                              </span>
                            ) : report.status === 'in_progress' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#0052CC] text-white shadow-xs backdrop-blur-sm flex items-center gap-1">
                                <Clock className="w-3 h-3 text-white" />
                                <span>In Progress</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-xs backdrop-blur-sm">
                                {report.status?.replace(/_/g, ' ') || 'Unresolved'}
                              </span>
                            )}
                          </div>

                          {/* Bookmark Banner Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleSaveReport(report.id)
                            }}
                            className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-all z-10"
                            title={isSaved ? "Remove from bookmarks" : "Save report"}
                          >
                            <Bookmark className={`w-4 h-4 ${isSaved ? 'text-amber-400 fill-amber-400' : 'text-white'}`} />
                          </button>

                          {/* Bottom Left: Category Pill */}
                          <div className="absolute bottom-2.5 left-2.5 bg-white/95 dark:bg-black/80 px-2.5 py-1 rounded-full text-[10px] font-bold capitalize text-gray-800 dark:text-gray-200 backdrop-blur-sm shadow-xs flex items-center gap-1">
                            {getCategoryIcon(report.issue_type)}
                            <span>{report.issue_type?.replace(/_/g, ' ')}</span>
                          </div>

                          {/* Bottom Right: Evidence / Photos Counter Badge */}
                          <div className="absolute bottom-2.5 right-2.5">
                            {evidenceList.length > 0 ? (
                              <span className="bg-black/75 text-white px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-xs flex items-center gap-1 shadow-xs border border-white/20">
                                <Camera className="w-3 h-3 text-[#60A5FA]" />
                                <span>{evidenceList.length} Photos</span>
                              </span>
                            ) : hasRealPhotos ? (
                              <span className="bg-black/75 text-white px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-xs flex items-center gap-1 shadow-xs border border-white/20">
                                <Sparkles className="w-3 h-3 text-emerald-400" />
                                <span>Proof Attached</span>
                              </span>
                            ) : (
                              <span className="bg-black/60 text-gray-300 px-2 py-0.5 rounded-full text-[9px] font-medium backdrop-blur-xs">
                                Field Baseline
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Content Card Body */}
                        <div className="p-4 flex-1 flex flex-col justify-between">
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
                              {report.title || 'Environmental Incident'}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                              {report.description || 'Verified community report logged in Pasig City.'}
                            </p>
                          </div>

                          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#2A2A2A] space-y-2.5 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="flex items-center gap-1 text-gray-400">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(report.created_at).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1 truncate max-w-[140px] text-gray-600 dark:text-gray-300">
                                <MapPin className="w-3.5 h-3.5 text-[#0052CC] flex-shrink-0" />
                                <span className="truncate">
                                  {report.location_precision === 'approximate' ? 'Pasig District' : `${report.latitude?.toFixed(3)}, ${report.longitude?.toFixed(3)}`}
                                </span>
                              </span>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => {
                                  setGalleryLightboxIndex(idx)
                                  setGalleryActivePhotoIndex(0)
                                }}
                                className="flex-1 py-1.5 px-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-[#242424] hover:bg-gray-100 dark:hover:bg-[#2C2C2C] border border-gray-200 dark:border-[#333] rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-gray-500" />
                                <span>Inspect</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleJumpToMap(report)}
                                className="flex-1 py-1.5 px-2.5 text-xs font-semibold text-[#0052CC] dark:text-[#60A5FA] bg-blue-50 dark:bg-[#0052CC]/15 hover:bg-blue-100 dark:hover:bg-[#0052CC]/25 border border-blue-200 dark:border-[#0052CC]/40 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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

      {/* VIEW MODE 3: MOBILE APP SHOWCASE (WITH INTERACTIVE 3D PHONE) */}
      {activeNavTab === 'mobile' && (
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/70 dark:bg-[#121212]">
          <MobileAppTabContent onNavigateToMap={() => {
            setDetailedReport(null)
            setActiveNavTab('reports')
            if (typeof window !== 'undefined' && window.location.pathname !== '/') {
              window.history.pushState(null, '', '/')
            }
          }} />
        </div>
      )}

      {/* FULL-SCREEN INCIDENT LIGHTBOX / INSPECTOR MODAL */}
      {galleryLightboxIndex !== null && galleryReports[galleryLightboxIndex] && (() => {
        const currentReport = galleryReports[galleryLightboxIndex]
        const evidenceItems = evidenceCache[currentReport.id] || []
        const isSaved = savedReportIds.includes(currentReport.id)

        // Compile all media photos for this report
        const mediaPhotos = []
        if (currentReport.before_photo_url) {
          mediaPhotos.push({ url: currentReport.before_photo_url, label: 'Before Cleanup', type: 'before' })
        }
        if (currentReport.after_photo_url) {
          mediaPhotos.push({ url: currentReport.after_photo_url, label: 'After Resolution', type: 'after' })
        }
        evidenceItems.forEach((ev, i) => {
          if (ev.url) {
            mediaPhotos.push({ url: ev.url, label: ev.name || `Citizen Evidence #${i + 1}`, type: 'evidence' })
          }
        })
        if (mediaPhotos.length === 0) {
          mediaPhotos.push({ url: getReportImage(currentReport, evidenceCache), label: 'Field Baseline Reference', type: 'reference' })
        }

        const activePhoto = mediaPhotos[galleryActivePhotoIndex] || mediaPhotos[0]
        const hasBeforeAfter = Boolean(currentReport.before_photo_url && currentReport.after_photo_url)

        return (
          <div 
            className="fixed inset-0 z-[1100] w-screen h-screen bg-black/80 backdrop-blur-xl flex flex-col p-0 overflow-hidden select-none animate-in fade-in duration-200"
            onClick={() => {
              setGalleryLightboxIndex(null)
              setGalleryActivePhotoIndex(0)
            }}
          >
            {/* Full-Screen Inspector Modal Container (Google Drive style dark inspector) */}
            <div 
              className="w-full h-full bg-[#18181B] text-gray-100 flex flex-col overflow-hidden transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Modal Header */}
              <div className="h-14 sm:h-16 px-4 sm:px-6 bg-[#18181B] border-b border-white/10 flex items-center justify-between flex-shrink-0 z-30">
                <div className="flex items-center gap-3">
                  {/* EcoPin Logo (Dark theme version for dark header) */}
                  <Link href="/" className="cursor-pointer flex items-center group">
                    <img src="/Full Logo Dark.png" alt="EcoPin" className="h-6 sm:h-7 w-auto" />
                  </Link>

                  <div className="h-4 w-[1px] bg-white/20 hidden sm:block" />

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#0052CC]/25 text-[#60A5FA] border border-[#0052CC]/40">
                    Inspector
                  </span>
                  <span className="text-xs font-mono text-gray-300 font-medium">
                    #{currentReport.id?.toString().slice(0, 8)}
                  </span>
                  <span className="hidden sm:inline-block text-xs text-gray-400 font-medium">
                    ({galleryLightboxIndex + 1} of {galleryReports.length})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleShareReport(currentReport)}
                    className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-gray-200 text-xs font-semibold border border-white/10 transition-colors flex items-center gap-1.5"
                    title="Share link to report"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleSaveReport(currentReport.id)}
                    className={`p-2 rounded-full border border-white/10 transition-colors ${
                      isSaved 
                        ? 'bg-[#0052CC]/25 text-[#60A5FA]' 
                        : 'bg-white/10 hover:bg-white/15 text-gray-300'
                    }`}
                    title={isSaved ? "Saved in bookmarks" : "Bookmark report"}
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'text-[#60A5FA] fill-[#60A5FA]' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setGalleryLightboxIndex(null)
                      setGalleryActivePhotoIndex(0)
                    }}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white border border-white/10 flex items-center justify-center transition-colors ml-1"
                    title="Close Inspector (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body: Left Dimmed Photo Stage + Right Dark Incident Panel */}
              <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
                {/* Left Photo Stage - Dimmed background, not full black */}
                <div 
                  className="flex-1 relative bg-black/45 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-8 min-h-0 overflow-hidden"
                  onClick={() => {
                    setGalleryLightboxIndex(null)
                    setGalleryActivePhotoIndex(0)
                  }}
                >
                  {/* Previous Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setGalleryLightboxIndex((galleryLightboxIndex - 1 + galleryReports.length) % galleryReports.length)
                      setGalleryActivePhotoIndex(0)
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 hover:bg-black/75 text-white border border-white/20 flex items-center justify-center transition-all z-20 backdrop-blur-md shadow-xl"
                    title="Previous report (Left Arrow)"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {/* Next Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setGalleryLightboxIndex((galleryLightboxIndex + 1) % galleryReports.length)
                      setGalleryActivePhotoIndex(0)
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/40 hover:bg-black/75 text-white border border-white/20 flex items-center justify-center transition-all z-20 backdrop-blur-md shadow-xl"
                    title="Next report (Right Arrow)"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Main Photo Display */}
                  <div 
                    className="relative max-w-5xl max-h-[76vh] w-full flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {hasBeforeAfter && beforeAfterMode === 'split' ? (
                      <div className="grid grid-cols-2 gap-3 w-full">
                        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
                          <img 
                            src={currentReport.before_photo_url} 
                            alt="Before" 
                            className="w-full h-full object-cover" 
                          />
                          <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-black/70 text-white backdrop-blur-xs">
                            Before Cleanup
                          </span>
                        </div>
                        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-[#0052CC] shadow-2xl">
                          <img 
                            src={currentReport.after_photo_url} 
                            alt="After" 
                            className="w-full h-full object-cover" 
                          />
                          <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#0052CC] text-white backdrop-blur-xs">
                            After Resolution
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 max-h-[74vh]">
                        <img 
                          src={activePhoto.url} 
                          alt={activePhoto.label} 
                          className="max-h-[74vh] w-auto max-w-full object-contain rounded-2xl" 
                        />
                        <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs text-white font-medium flex items-center gap-1.5 shadow-md border border-white/15">
                          <Camera className="w-3.5 h-3.5 text-[#60A5FA]" />
                          <span>{activePhoto.label}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Before/After Selector (if both available) */}
                  {hasBeforeAfter && (
                    <div 
                      className="mt-4 flex items-center bg-black/60 p-1 rounded-full border border-white/20 backdrop-blur-md z-10 shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setBeforeAfterMode('before')}
                        className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                          beforeAfterMode === 'before' ? 'bg-white text-black shadow-xs' : 'text-gray-300 hover:text-white'
                        }`}
                      >
                        Before
                      </button>
                      <button
                        type="button"
                        onClick={() => setBeforeAfterMode('after')}
                        className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                          beforeAfterMode === 'after' ? 'bg-[#0052CC] text-white shadow-xs' : 'text-gray-300 hover:text-white'
                        }`}
                      >
                        After Resolution
                      </button>
                      <button
                        type="button"
                        onClick={() => setBeforeAfterMode('split')}
                        className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                          beforeAfterMode === 'split' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-300 hover:text-white'
                        }`}
                      >
                        Side by Side
                      </button>
                    </div>
                  )}

                  {/* Evidence Thumbnails Bar (if multiple photos) */}
                  {mediaPhotos.length > 1 && !hasBeforeAfter && (
                    <div 
                      className="mt-3 flex items-center gap-2 overflow-x-auto max-w-xl py-1.5 px-2.5 bg-black/40 rounded-2xl border border-white/15 backdrop-blur-md z-10 shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {mediaPhotos.map((photo, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setGalleryActivePhotoIndex(pIdx)}
                          className={`relative w-14 h-11 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                            galleryActivePhotoIndex === pIdx ? 'border-[#0052CC] scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={photo.url} alt={photo.label} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Dark Incident Details Panel (Google Drive style inspector) */}
                <div 
                  className="w-full lg:w-[400px] xl:w-[430px] bg-[#18181B] border-t lg:border-t-0 lg:border-l border-white/10 p-5 sm:p-6 overflow-y-auto flex flex-col justify-between custom-scrollbar text-gray-100 flex-shrink-0 z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="space-y-4">
                    {/* Category & Status Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#0052CC]/25 text-[#60A5FA] border border-[#0052CC]/40 flex items-center gap-1.5">
                        {getCategoryIcon(currentReport.issue_type)}
                        <span>{currentReport.issue_type?.replace(/_/g, ' ')}</span>
                      </span>

                      {currentReport.status === 'resolved' ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Resolved</span>
                        </span>
                      ) : currentReport.status === 'in_progress' ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#0052CC]/25 text-[#60A5FA] border border-[#0052CC]/40 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>In Progress</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-950/50 text-amber-400 border border-amber-800/40">
                          {currentReport.status?.replace(/_/g, ' ') || 'Unresolved'}
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold leading-snug text-white">
                        {currentReport.title || 'Environmental Incident'}
                      </h2>
                      <div className="mt-3 p-4 bg-white/5 border border-white/10 rounded-2xl text-xs sm:text-sm text-gray-300 leading-relaxed max-h-40 overflow-y-auto custom-scrollbar">
                        {currentReport.description || 'Verified environmental observation submitted via Pasig City EcoPin mobile network.'}
                      </div>
                    </div>

                    {/* Official Verification Box */}
                    <div className="p-3.5 bg-[#0052CC]/15 border border-[#0052CC]/30 rounded-2xl flex items-start gap-3 text-xs text-blue-200">
                      <ShieldCheck className="w-5 h-5 text-[#60A5FA] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[#60A5FA]">EcoPin Verified Community Report</p>
                        <p className="text-gray-400 text-[11px] mt-0.5">
                          This report was verified for geographic proximity and Pasig LGU task allocation.
                        </p>
                      </div>
                    </div>

                    {/* Metadata Items */}
                    <div className="space-y-3 text-xs text-gray-400 border-t border-white/10 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span>Date Submitted</span>
                        </span>
                        <span className="text-gray-200 font-medium">
                          {new Date(currentReport.created_at).toLocaleDateString()} {new Date(currentReport.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span>Coordinates</span>
                        </span>
                        <span className="text-gray-200 font-medium font-mono text-[11px]">
                          {currentReport.latitude?.toFixed(4)}, {currentReport.longitude?.toFixed(4)}
                        </span>
                      </div>

                      {currentReport.severity_score && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-gray-500" />
                            <span>Severity Score</span>
                          </span>
                          <span className="text-amber-400 font-bold">
                            {formatSeverityScore(currentReport.severity_score)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Actions inside Inspector */}
                  <div className="pt-4 border-t border-white/10 space-y-2.5 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setGalleryLightboxIndex(null)
                        handleJumpToMap(currentReport)
                      }}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-[#0052CC] hover:bg-[#0042A3] text-white transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>Locate Pin on Map</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setGalleryLightboxIndex(null)
                        setGalleryActivePhotoIndex(0)
                      }}
                      className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-colors text-center"
                    >
                      Close Inspector
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 4. STICKY BOTTOM ACTION BAR */}
      <footer className="sticky bottom-0 left-0 right-0 z-30 bg-white dark:bg-[#1C1C1C] border-t border-gray-200/90 dark:border-[#2A2A2A] px-4 sm:px-8 py-3 flex items-center justify-between gap-3 shadow-md flex-shrink-0 transition-colors duration-300">
        <button 
          type="button" 
          onClick={() => setShowPdfSummary(true)} 
          className="text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-[#0052CC] dark:hover:text-[#60A5FA] transition-colors flex items-center gap-1.5"
        >
          <FileText className="w-3.5 h-3.5 text-gray-400" />
          <span className="underline sm:no-underline hover:underline">Draft Incident Report / Export Summary</span>
        </button>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <button 
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="px-5 sm:px-6 py-2 rounded-full bg-[#0052CC] hover:bg-[#0042A3] text-white text-xs font-semibold shadow-sm hover:shadow transition-all flex items-center gap-2"
          >
            <span>Submit a Report</span>
            <ArrowRight className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </footer>



      {/* SUBMIT REPORT MODAL */}
      {showSubmitModal && (
        <div 
          className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowSubmitModal(false)}
        >
          <div 
            className="bg-white dark:bg-[#1C1C1C] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-200/90 dark:border-[#2A2A2A] animate-in zoom-in-95 duration-200 relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button Top-Right */}
            <button 
              type="button"
              onClick={() => setShowSubmitModal(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-gray-100 dark:bg-[#2A2A2A] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 flex items-center justify-center transition-colors"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Centered Brand Logo */}
            <div className="flex justify-center mb-3 pt-1">
              <Link href="/" className="inline-flex items-center group">
                <img src="/Full Logo Light.png" alt="EcoPin" className="h-8 sm:h-9 w-auto object-contain dark:hidden" />
                <img src="/Full Logo Dark.png" alt="EcoPin" className="h-8 sm:h-9 w-auto object-contain hidden dark:block" />
              </Link>
            </div>

            {/* Modal Heading */}
            <h3 className="font-bold text-lg sm:text-xl text-gray-900 dark:text-white">
              Submit an Environmental Report
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
              Citizen incident reporting for Pasig City is available exclusively via the EcoPin Mobile App.
            </p>

            {/* Information Card */}
            <div className="my-5 p-4 bg-gray-50 dark:bg-[#242424] rounded-2xl border border-gray-200/80 dark:border-[#2A2A2A] text-left space-y-2.5">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#0052CC] dark:text-[#60A5FA] flex-shrink-0 mt-0.5" />
                <span className="text-xs text-gray-700 dark:text-gray-300">
                  <strong className="text-gray-900 dark:text-white">AI Image Validation:</strong> Real-time waste, pollution, and severity classification.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#0052CC] dark:text-[#60A5FA] flex-shrink-0 mt-0.5" />
                <span className="text-xs text-gray-700 dark:text-gray-300">
                  <strong className="text-gray-900 dark:text-white">City Task Force Dispatch:</strong> Reports route directly to municipal environmental officers.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#0052CC] dark:text-[#60A5FA] flex-shrink-0 mt-0.5" />
                <span className="text-xs text-gray-700 dark:text-gray-300">
                  <strong className="text-gray-900 dark:text-white">Public Transparency:</strong> Track resolution progress and verified cleanups live on this map.
                </span>
              </div>
            </div>

            {/* Action Buttons: Mobile App Details & Direct Download */}
            <div className="space-y-2">
              <Link
                href="/mobile"
                onClick={() => setShowSubmitModal(false)}
                className="w-full py-3 px-5 rounded-2xl bg-[#0052CC] hover:bg-[#0042A3] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all group cursor-pointer"
              >
                <Smartphone className="w-4 h-4 transition-transform group-hover:scale-110" />
                <span>Learn About Mobile App</span>
              </Link>
              <Link
                href="/downloads"
                onClick={() => setShowSubmitModal(false)}
                className="w-full py-2.5 px-4 rounded-xl border border-gray-200 dark:border-[#333] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#252525] font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Direct .APK Download</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* PDF SUMMARY MODAL */}
      {showPdfSummary && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-[#2A2A2A] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#2A2A2A]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0052CC] dark:text-[#60A5FA]" />
                <h3 className="font-bold text-base text-gray-900 dark:text-white">Public Transparency Report</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowPdfSummary(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-[#2A2A2A] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-600 dark:text-gray-300 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-gray-600 dark:text-gray-300">
              <div className="p-3 bg-gray-50 dark:bg-[#242424] rounded-2xl border border-gray-100 dark:border-[#2A2A2A] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Area Scope:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{locationFilter === 'all' ? 'Pasig City' : locationFilter}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Total Visible Reports:</span>
                  <span className="font-bold text-[#0052CC] dark:text-[#60A5FA]">{sortedReports.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Active Bookmarks:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{savedReportIds.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Report Date:</span>
                  <span className="font-bold text-gray-800 dark:text-gray-200">{new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                This public transparency extract summarizes citizen-reported environmental incidents and resolution statuses.
              </p>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    window.print()
                    setShowPdfSummary(false)
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#0052CC] text-white font-semibold text-xs hover:bg-[#0042A3] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfSummary(false)}
                  className="py-2 px-4 rounded-xl border border-gray-300 dark:border-[#333] text-gray-700 dark:text-gray-300 font-semibold text-xs hover:bg-gray-50 dark:hover:bg-[#2A2A2A] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {wipeState !== 'done' && (
        <LoadingScreen 
          mode="out" 
          onAnimationEnd={() => setWipeState('done')} 
        />
      )}
      {isExiting && (
        <LoadingScreen mode="in" />
      )}
    </div>
  )
}
