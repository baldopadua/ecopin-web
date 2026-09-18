'use client'
import React, { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMapEvents, Polyline } from 'react-leaflet'
import L from 'leaflet'
import wkx from 'wkx'
import { Buffer } from 'buffer'
import { fetchValidatedReports, fetchIssueTypes, fetchClusters, fetchReportEvidence } from '@/lib/api'
import { supabase } from '@/lib/supabase'

if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer
}

const PASIG_CENTER = [14.5802, 121.0850]
const DEFAULT_ZOOM = 14

const ImageWithLoader = ({ src, alt, className }) => {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className={`relative ${className} bg-gray-200 dark:bg-[#222]`}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#ccff00] border-t-black dark:border-t-white rounded-full animate-spin"></div>
        </div>
      )}
      <img 
        src={src} 
        alt={alt} 
        className={`w-full h-full object-cover ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`} 
        onLoad={() => setLoaded(true)} 
      />
    </div>
  )
}

// Redesigned Map Pin: Easier to see, still brutalist (a sharp square with a thick border and inner dot)
const createBrutalistIcon = (status, isSelected = false) => {
  let bgColor = '#000000'
  let borderColor = '#000000'
  
  if (status === 'resolved') bgColor = '#ccff00'
  else if (status === 'in_progress') bgColor = '#ffffff'
  else bgColor = '#ff0000' // unresolved / urgent

  if (isSelected) borderColor = '#3300ff'

  return L.divIcon({
    className: 'custom-brutalist-marker',
    html: `<div style="background-color: ${bgColor}; width: ${isSelected ? '32px' : '24px'}; height: ${isSelected ? '32px' : '24px'}; border: 3px solid ${borderColor}; box-shadow: 4px 4px 0px 0px #1a1a1a; display: flex; align-items: center; justify-content: center; transition: transform 0.1s ease-in-out;">
      <div style="width: ${isSelected ? '12px' : '8px'}; height: ${isSelected ? '12px' : '8px'}; background-color: #000; border-radius: 0%;"></div>
    </div>`,
    iconSize: [isSelected ? 32 : 24, isSelected ? 32 : 24],
    iconAnchor: [isSelected ? 16 : 12, isSelected ? 32 : 24],
  })
}

// Brutalist Cluster Icon
const createClusterIcon = (cluster) => {
  const severity = cluster.severity
  let bgColor = '#ffffff'
  
  if (severity === 'high') bgColor = '#ff0000'
  if (severity === 'medium') bgColor = '#ccff00'
  if (severity === 'low') bgColor = '#000000'

  const count = cluster.report_count

  return L.divIcon({
    className: 'custom-brutalist-cluster',
    html: `<div style="background-color: ${bgColor}; color: ${bgColor === '#000000' || bgColor === '#ff0000' ? '#ffffff' : '#000000'}; width: 44px; height: 44px; border: 4px solid #000000; box-shadow: 6px 6px 0px 0px #1a1a1a; display: flex; align-items: center; justify-content: center; font-weight: 900; font-family: monospace; font-size: 18px;">
      ${count}
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
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

function ZoomTracker({ setZoom }) {
  const map = useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  })
  return null
}

export default function PublicMap({ isDark }) {
  const [mounted, setMounted] = useState(false)
  const [reports, setReports] = useState([])
  const [filteredReports, setFilteredReports] = useState([])
  const [issueTypes, setIssueTypes] = useState([])
  
  // Clustering state
  const [clusters, setClusters] = useState([])
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [issueTypeFilter, setIssueTypeFilter] = useState('all')
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState(null)
  
  // Details Panel State
  const [detailedReport, setDetailedReport] = useState(null)
  const [detailedEvidence, setDetailedEvidence] = useState([])

  const handleViewDetails = async (report) => {
    setDetailedReport(report)
    setDetailedEvidence([])
    try {
      const evidence = await fetchReportEvidence(report.id)
      setDetailedEvidence(evidence || [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    import('@/lib/leaflet-fix')
    setMounted(true)

    Promise.all([
      fetchValidatedReports({ validationStatus: 'validated' }),
      fetchIssueTypes()
    ]).then(([reportsData, typesData]) => {
      setReports(reportsData || [])
      setFilteredReports(reportsData || [])
      setIssueTypes(typesData || [])
    })

    const subscription = supabase
      .channel('public-reports-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        fetchValidatedReports({ validationStatus: 'validated' }).then((reportsData) => {
          setReports(reportsData || [])
        })
      })
      .subscribe()

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let filtered = (reports || []).filter(r => r.validation_status !== 'rejected')
    if (statusFilter !== 'all') filtered = filtered.filter(r => r.status === statusFilter)
    if (issueTypeFilter !== 'all') filtered = filtered.filter(r => r.issue_type === issueTypeFilter)
    setFilteredReports(filtered)
  }, [statusFilter, issueTypeFilter, reports])

  // Compute clusters purely client-side from the filtered public reports
  // to avoid hitting the protected /api/clusters endpoint (which causes 401s for unauthenticated users)
  const filteredClusters = useMemo(() => {
    const map = {}
    filteredReports.forEach(report => {
      if (report.cluster_id) {
        if (!map[report.cluster_id]) {
          map[report.cluster_id] = {
            id: report.cluster_id,
            reports: [],
            severity: 'low',
            report_count: 0
          }
        }
        map[report.cluster_id].reports.push(report)
        map[report.cluster_id].report_count++
        
        // Severity logic
        if (report.status === 'urgent' || report.status === 'unresolved') {
           map[report.cluster_id].severity = 'high'
        } else if (map[report.cluster_id].severity !== 'high' && report.status === 'in_progress') {
           map[report.cluster_id].severity = 'medium'
        }
      }
    })
    
    return Object.values(map).filter(c => c.report_count >= 2).map(c => {
       let sumLat = 0, sumLng = 0;
       let validPoints = 0;
       c.reports.forEach(r => {
           let lat = r.latitude, lng = r.longitude;
           if (!lat || !lng) {
              const geom = parseGeometry(r.location);
              if (geom) { lat = geom[0]; lng = geom[1] }
           }
           if (lat && lng) {
              sumLat += lat; sumLng += lng; validPoints++;
           }
       })
       c.centerLat = validPoints > 0 ? sumLat / validPoints : null
       c.centerLng = validPoints > 0 ? sumLng / validPoints : null
       return c;
    })
  }, [filteredReports])

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

  if (!mounted) return <div className="h-full w-full bg-black flex items-center justify-center text-[#ccff00] font-black text-4xl uppercase glitch-text" data-text="LOADING MAP...">LOADING MAP...</div>

  const apiKey = process.env.NEXT_PUBLIC_CARTO_API_KEY ? `?key=${process.env.NEXT_PUBLIC_CARTO_API_KEY}` : '';
  const mapUrl = isDark
    ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${apiKey}`
    : `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png${apiKey}`;

  return (
    <>
      <style jsx global>{`
        .leaflet-container { 
          background-color: ${isDark ? '#000' : '#fff'}; 
          cursor: crosshair !important; 
        }
        .leaflet-grab { cursor: crosshair !important; }
        .leaflet-dragging .leaflet-grab { cursor: move !important; }
        .leaflet-interactive { cursor: pointer !important; }
        .leaflet-popup-content-wrapper {
          background-color: ${isDark ? '#000' : '#fff'} !important;
          color: ${isDark ? '#fff' : '#000'} !important;
          border: 4px solid ${isDark ? '#ccff00' : '#000'} !important;
          border-radius: 0 !important;
          box-shadow: 8px 8px 0px 0px ${isDark ? 'rgba(204,255,0,0.5)' : '#1a1a1a'} !important;
        }
        .leaflet-popup-tip { display: none !important; }
        .leaflet-popup-close-button {
          color: ${isDark ? '#ccff00' : '#000'} !important;
          font-weight: 900 !important;
          font-family: monospace !important;
          margin-top: 4px !important; margin-right: 4px !important;
        }
        .custom-brutalist-marker:hover div, .custom-brutalist-cluster:hover div {
          transform: translateY(-2px) translateX(-2px);
          box-shadow: 6px 6px 0px 0px #1a1a1a !important;
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="relative h-full w-full bg-white dark:bg-black font-sans">
        <MapContainer
          center={PASIG_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%', filter: 'contrast(1.1)' }}
        >
          <ZoomTracker setZoom={setZoom} />
          <TileLayer url={mapUrl} />

          {/* Render Cluster Markers (Zoom Out) */}
          {zoom <= 15 && filteredClusters.map((cluster) => {
            if (!cluster.centerLat || !cluster.centerLng) return null
            return (
              <Marker
                key={cluster.id}
                position={[cluster.centerLat, cluster.centerLng]}
                icon={createClusterIcon(cluster)}
              >
                <Popup>
                  <div className="p-3 max-w-[200px] font-sans">
                    <strong className="block text-xl font-black uppercase tracking-tight leading-tight mb-2 border-b-2 border-[#1a1a1a] dark:border-white pb-2">
                      CLUSTER #{cluster.id}
                    </strong>
                    <p className="text-sm font-medium mb-1">
                      {cluster.report_count} Reports
                    </p>
                    <p className="text-xs font-mono font-bold uppercase">
                      Severity: <span className={cluster.severity === 'high' ? 'text-red-500' : 'text-[#ccff00]'}>{cluster.severity}</span>
                    </p>
                  </div>
                </Popup>
              </Marker>
            )
          })}

          {/* Render Cluster Polygons (Zoom In) */}
          {zoom > 15 && filteredClusters.map((cluster) => {
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

            // Simple sorting to prevent massive crossing polygons
            const centerLat = polygonPoints.reduce((s, p) => s + p[0], 0) / polygonPoints.length
            const centerLng = polygonPoints.reduce((s, p) => s + p[1], 0) / polygonPoints.length
            const sortedPoints = [...polygonPoints].sort((a, b) => {
              return Math.atan2(a[1] - centerLng, a[0] - centerLat) - Math.atan2(b[1] - centerLng, b[0] - centerLat)
            })

            return (
              <Polygon
                key={`polygon-${cluster.id}`}
                positions={sortedPoints}
                color="#000"
                fillColor={cluster.severity === 'high' ? '#ff0000' : '#ccff00'}
                fillOpacity={0.4}
                weight={4}
                dashArray="8"
              />
            )
          })}

          {/* Render Individual Pins */}
          {processedReportsInfo.parsedReports.map((report) => {
            // Hide if it's in a valid cluster (>= 2 reports) and we're zoomed out
            const isInValidCluster = filteredClusters.some(c => c.id === report.cluster_id)
            if (isInValidCluster && zoom <= 15) return null

            let latitude = report.parsedLat
            let longitude = report.parsedLng
            let originalLat = latitude
            let originalLng = longitude
            let isSpiderfied = false

            if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
              const key = report.cluster_id ? `cluster_${report.cluster_id}` : `coord_${latitude.toFixed(4)},${longitude.toFixed(4)}`
              const overlappingIds = processedReportsInfo.coordsMap[key]

              if (overlappingIds && overlappingIds.length > 1 && zoom > 15) {
                const index = overlappingIds.indexOf(report.id)
                const total = overlappingIds.length
                
                const radius = 0.0004 * Math.pow(2, 17 - zoom)
                const angle = (index / total) * Math.PI * 2
                
                latitude += Math.sin(angle) * radius
                longitude += Math.cos(angle) * radius
                isSpiderfied = true
              }

              return (
                <React.Fragment key={report.id}>
                  {isSpiderfied && (
                    <Polyline 
                      positions={[[originalLat, originalLng], [latitude, longitude]]} 
                      color={isDark ? "#ccff00" : "#000000"} 
                      weight={2} 
                      opacity={0.8}
                      dashArray="4 4"
                    />
                  )}
                  <Marker
                    position={[latitude, longitude]}
                    icon={createBrutalistIcon(report.status, selectedReportId === report.id)}
                  eventHandlers={{ click: () => setSelectedReportId(report.id) }}
                >
                  <Popup>
                    <div className="p-3 max-w-[250px] font-sans">
                      <div className="inline-block bg-[#ccff00] text-black font-mono text-xs font-bold px-2 py-1 mb-2 border-2 border-[#1a1a1a]">
                        {report.issue_type?.replace(/_/g, ' ').toUpperCase()}
                      </div>
                      <strong className="block text-xl font-black uppercase tracking-tight leading-tight mb-2 border-b-2 border-[#1a1a1a] dark:border-white pb-2">
                        {report.title}
                      </strong>
                      <p className="text-sm font-medium mb-3 opacity-90">
                        {report.description?.substring(0, 100)}{report.description?.length > 100 ? '...' : ''}
                      </p>
                      
                      <div className="flex justify-between items-center mt-4 mb-4 font-mono text-xs font-bold">
                        <span className="uppercase">{report.status?.replace(/_/g, ' ')}</span>
                        <span>{new Date(report.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      <button 
                        onClick={() => handleViewDetails(report)}
                        className="w-full bg-black text-[#ccff00] dark:bg-[#ccff00] dark:text-black border-2 border-[#1a1a1a] font-black uppercase py-2 hover:bg-gray-800 dark:hover:bg-yellow-400 transition-colors"
                      >
                        SEE FULL DETAILS
                      </button>
                    </div>
                  </Popup>
                </Marker>
                </React.Fragment>
              )
            }
            return null
          })}
        </MapContainer>

        {/* Floating Filter Button (Mobile & Desktop) */}
        {!showFilterPanel && (
          <button
            onClick={() => setShowFilterPanel(true)}
            className="absolute top-6 right-6 z-[1001] bg-[#ccff00] text-black border-2 border-[#1a1a1a] px-6 py-3 font-black uppercase tracking-widest shadow-[8px_8px_0px_0px_#1a1a1a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#1a1a1a] transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            FILTERS
          </button>
        )}

        {/* Brutalist Filter Panel */}
        {showFilterPanel && (
          <div className="absolute top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-black border-l-0 sm:border-l-8 border-[#1a1a1a] dark:border-[#333333] z-[1002] flex flex-col transition-transform duration-300">
            <div className="p-6 border-b-8 border-[#1a1a1a] dark:border-[#333333] flex justify-between items-center bg-[#ccff00] text-black">
              <h3 className="font-black text-2xl uppercase tracking-tighter">Live Filters</h3>
              <button
                onClick={() => setShowFilterPanel(false)}
                className="w-10 h-10 border-2 border-[#1a1a1a] flex items-center justify-center hover:bg-black hover:text-[#ccff00] transition-colors font-black"
              >
                X
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto bg-white dark:bg-black text-black dark:text-white">
              <div className="mb-8">
                <label className="block font-mono text-sm font-bold uppercase mb-3">Status</label>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-white dark:bg-[#111] border-2 border-[#1a1a1a] dark:border-[#333333] p-4 font-black text-lg uppercase cursor-pointer appearance-none rounded-none focus:outline-none focus:bg-[#ccff00] focus:text-black transition-colors"
                >
                  <option value="all">ALL STATUSES</option>
                  <option value="unresolved">UNRESOLVED</option>
                  <option value="in_progress">IN PROGRESS</option>
                  <option value="resolved">RESOLVED</option>
                </select>
              </div>

              <div className="mb-8">
                <label className="block font-mono text-sm font-bold uppercase mb-3">Issue Category</label>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => setIssueTypeFilter('all')}
                    className={`p-3 border-2 border-[#1a1a1a] ${issueTypeFilter === 'all' ? 'bg-black text-white dark:bg-[#ccff00] dark:text-black' : 'bg-white text-black hover:bg-gray-200'} font-black uppercase text-left transition-colors`}
                  >
                    ALL CATEGORIES
                  </button>
                  {issueTypes.map(type => (
                    <button 
                      key={type}
                      onClick={() => setIssueTypeFilter(type)}
                      className={`p-3 border-2 border-[#1a1a1a] ${issueTypeFilter === type ? 'bg-black text-white dark:bg-[#ccff00] dark:text-black' : 'bg-white text-black hover:bg-gray-200'} font-black uppercase text-left transition-colors`}
                    >
                      {type.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t-8 border-[#1a1a1a] dark:border-[#333333] bg-gray-100 dark:bg-[#111]">
              <div className="font-mono text-xs font-bold text-gray-500 uppercase">
                SHOWING {filteredReports.length} / {reports?.length || 0} REPORTS
              </div>
            </div>
          </div>
        )}

        {/* Brutalist Details Panel (Left Side) */}
        {detailedReport && (
          <div className="animate-slide-in-left absolute top-0 left-0 h-full w-full sm:w-[450px] bg-white dark:bg-black border-r-0 sm:border-r-8 border-[#1a1a1a] dark:border-[#333333] z-[1002] flex flex-col">
            <div className="p-6 border-b-8 border-[#1a1a1a] dark:border-[#333333] flex justify-between items-center bg-black text-[#ccff00] dark:bg-[#ccff00] dark:text-black">
              <h3 className="font-black text-2xl uppercase tracking-tighter">REPORT DETAILS</h3>
              <button
                onClick={() => setDetailedReport(null)}
                className="w-10 h-10 border-2 border-[#ccff00] dark:border-[#1a1a1a] flex items-center justify-center hover:bg-[#ccff00] hover:text-black dark:hover:bg-black dark:hover:text-[#ccff00] transition-colors font-black"
              >
                X
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto bg-white dark:bg-black text-black dark:text-white">
              <div className="inline-block bg-[#ccff00] text-black font-mono text-xs font-bold px-2 py-1 mb-4 border-2 border-[#1a1a1a]">
                {detailedReport.issue_type?.replace(/_/g, ' ').toUpperCase()}
              </div>
              <h2 className="font-black text-3xl uppercase tracking-tighter mb-4 leading-none break-words">
                {detailedReport.title}
              </h2>
              
              <div className="font-mono text-sm font-bold border-l-2 border-[#1a1a1a] dark:border-[#333333] pl-4 mb-6">
                <p className="mb-1">STATUS: <span className="uppercase text-[#ff0000] dark:text-[#ccff00]">{detailedReport.status?.replace(/_/g, ' ')}</span></p>
                <p>DATE: {new Date(detailedReport.created_at).toLocaleDateString()}</p>
              </div>

              <div className="mb-8 border-2 border-[#1a1a1a] dark:border-[#333333] p-4 bg-gray-100 dark:bg-[#111]">
                <p className="font-medium text-lg leading-relaxed whitespace-pre-wrap">
                  {detailedReport.description || 'No description provided.'}
                </p>
              </div>

              {/* Citizen Photos */}
              <div className="mb-8">
                <h4 className="font-black text-xl uppercase border-b-2 border-[#1a1a1a] dark:border-[#333333] pb-2 mb-4">
                  CITIZEN EVIDENCE
                </h4>
                {detailedEvidence.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {detailedEvidence.map((img, i) => (
                      <div key={i} className="border-2 border-[#1a1a1a] dark:border-[#333333]">
                        <ImageWithLoader src={img.url} alt="Evidence" className="w-full h-32" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-sm text-gray-500 font-bold uppercase">No initial photos attached.</p>
                )}
              </div>

              {/* Staff Before / After */}
              {(detailedReport.before_photo_url || detailedReport.after_photo_url) && (
                <div className="mb-8">
                  <h4 className="font-black text-xl uppercase border-b-2 border-[#1a1a1a] dark:border-[#333333] pb-2 mb-4">
                    OFFICIAL RESOLUTION
                  </h4>
                  <div className="grid grid-cols-1 gap-6">
                    {detailedReport.before_photo_url && (
                      <div>
                        <span className="inline-block bg-black text-white dark:bg-white dark:text-black font-mono text-xs font-bold px-2 py-1 mb-2">BEFORE</span>
                        <div className="border-2 border-[#1a1a1a] dark:border-[#333333]">
                          <ImageWithLoader src={detailedReport.before_photo_url} alt="Before" className="w-full h-48" />
                        </div>
                      </div>
                    )}
                    {detailedReport.after_photo_url && (
                      <div>
                        <span className="inline-block bg-[#ccff00] text-black font-mono text-xs font-bold px-2 py-1 mb-2">AFTER</span>
                        <div className="border-2 border-[#1a1a1a] dark:border-[#333333]">
                          <ImageWithLoader src={detailedReport.after_photo_url} alt="After" className="w-full h-48" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
