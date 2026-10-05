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

// Redesigned Bubble Pin: Friendly, rounded, thick borders
const createBubbleIcon = (status, isSelected = false) => {
  let bgColor = '#FF3B30' // red for urgent/unresolved
  
  if (status === 'resolved') bgColor = '#34C759' // green
  else if (status === 'in_progress') bgColor = '#FFCC00' // yellow
  
  const size = isSelected ? 36 : 28;

  return L.divIcon({
    className: 'custom-bubble-marker',
    html: `<div style="background-color: ${bgColor}; width: ${size}px; height: ${size}px; border: 4px solid #000; border-radius: 50%; box-shadow: 4px 4px 0px 0px rgba(0,0,0,1); display: flex; align-items: center; justify-content: center; transition: all 0.2s ease-in-out;">
      <div style="width: ${isSelected ? '12px' : '8px'}; height: ${isSelected ? '12px' : '8px'}; background-color: rgba(255,255,255,0.9); border-radius: 50%;"></div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

// Bubble Cluster Icon
const createClusterIcon = (cluster) => {
  const severity = cluster.severity
  let bgColor = '#0052CC' // default blue
  
  if (severity === 'high') bgColor = '#FF3B30'
  if (severity === 'medium') bgColor = '#FFCC00'

  const count = cluster.report_count

  return L.divIcon({
    className: 'custom-bubble-cluster',
    html: `<div style="background-color: ${bgColor}; color: ${bgColor === '#FFCC00' ? '#000' : '#FFF'}; width: 48px; height: 48px; border: 4px solid #000; border-radius: 50%; box-shadow: 4px 4px 0px 0px rgba(0,0,0,1); display: flex; align-items: center; justify-content: center; font-weight: 900; font-family: inherit; font-size: 18px; transition: all 0.2s ease-in-out;">
      ${count}
    </div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
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
      fetchValidatedReports({ validationStatus: 'approved' }),
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

  if (!mounted) return (
    <div className="h-full w-full flex items-center justify-center bg-white dark:bg-black transition-colors duration-300">
      <img src="/Solo Logo Light.png" alt="Loading..." className="h-24 w-auto object-contain animate-pulse dark:hidden" />
      <img src="/Solo Logo Dark.png" alt="Loading..." className="h-24 w-auto object-contain animate-pulse hidden dark:block" />
    </div>
  );

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
          background-color: ${isDark ? '#1C1C1C' : '#fff'} !important;
          color: ${isDark ? '#fff' : '#000'} !important;
          border: 4px solid ${isDark ? '#333' : '#000'} !important;
          border-radius: 24px !important;
          box-shadow: 6px 6px 0px 0px #000 !important;
        }
        .leaflet-popup-tip { display: none !important; }
        .leaflet-popup-close-button {
          color: ${isDark ? '#fff' : '#000'} !important;
          font-weight: 900 !important;
          margin-top: 12px !important; margin-right: 12px !important;
          background: ${isDark ? '#333' : '#F4F0EA'} !important;
          border-radius: 50% !important;
          width: 24px !important;
          height: 24px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: 2px solid ${isDark ? '#555' : '#000'} !important;
        }
        .leaflet-popup-close-button span {
          position: relative;
          top: -1px;
        }
        .custom-bubble-marker:hover div, .custom-bubble-cluster:hover div {
          transform: translateY(-4px);
          box-shadow: 8px 8px 0px 0px #000 !important;
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
                    <strong className="block text-xl font-black uppercase tracking-tight leading-tight mb-2 pb-2 border-b-2 border-gray-200 dark:border-gray-700">
                      CLUSTER #{cluster.id}
                    </strong>
                    <p className="text-sm font-medium mb-1">
                      {cluster.report_count} Reports
                    </p>
                    <p className="text-xs font-bold uppercase">
                      Severity: <span className={cluster.severity === 'high' ? 'text-red-500' : 'text-yellow-500'}>{cluster.severity}</span>
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
                    icon={createBubbleIcon(report.status, selectedReportId === report.id)}
                  eventHandlers={{ click: () => setSelectedReportId(report.id) }}
                >
                  <Popup>
                    <div className="p-2 max-w-[250px] font-sans">
                      <div className="inline-block bg-[#0052CC] text-white text-xs font-bold px-3 py-1 mb-2 rounded-full border-2 border-black">
                        {report.issue_type?.replace(/_/g, ' ').toUpperCase()}
                      </div>
                      <strong className="block text-xl font-black uppercase tracking-tight leading-tight mb-2 pb-2 border-b-2 border-gray-200 dark:border-gray-700">
                        {report.title}
                      </strong>
                      <p className="text-sm font-medium mb-3 opacity-90 text-gray-700 dark:text-gray-300">
                        {report.description?.substring(0, 100)}{report.description?.length > 100 ? '...' : ''}
                      </p>
                      
                      <div className="flex justify-between items-center mt-4 mb-4 text-xs font-bold text-gray-500 dark:text-gray-400">
                        <span className="uppercase">{report.status?.replace(/_/g, ' ')}</span>
                        <span>{new Date(report.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      <button 
                        onClick={() => handleViewDetails(report)}
                        className="w-full bg-[#0052CC] text-white border-4 border-black rounded-full font-black uppercase py-2 hover:bg-black transition-colors drop-shadow-[4px_4px_0_black]"
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

        {/* Floating Filter Button (Bottom Right) */}
        {!showFilterPanel && (
          <button
            onClick={() => setShowFilterPanel(true)}
            className="absolute bottom-8 right-6 md:bottom-12 md:right-12 z-[1001] bg-[#0052CC] text-white p-4 rounded-full drop-shadow-[4px_4px_0_black] hover:-translate-y-1 hover:drop-shadow-[6px_6px_0_black] transition-all flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        )}

        {/* Bottom Sheet Filter Panel */}
        {showFilterPanel && (
          <>
            {/* Backdrop for mobile */}
            <div className="absolute inset-0 bg-black/50 z-[1001] md:hidden" onClick={() => setShowFilterPanel(false)} />
            
            <div className="absolute bottom-0 right-0 md:bottom-12 md:right-12 w-full md:w-[400px] bg-white dark:bg-[#1C1C1C] rounded-t-[32px] md:rounded-[32px] border-t-4 md:border-4 border-black dark:border-[#333] z-[1002] flex flex-col transition-transform duration-300 animate-[slideUp_0.3s_ease-out] md:drop-shadow-[8px_8px_0_black]">
              {/* Handle */}
              <div className="w-full flex justify-center pt-4 pb-2 md:hidden">
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>

              <div className="px-6 pb-2 pt-2 md:pt-6 flex justify-between items-center">
                <h3 className="font-black text-2xl">Filters</h3>
                <button onClick={() => setShowFilterPanel(false)} className="md:hidden text-sm font-bold uppercase text-gray-500">Close</button>
              </div>
              
              <div className="px-6 py-4 flex-1 overflow-y-auto text-black dark:text-white max-h-[60vh] md:max-h-[500px]">
                {/* Status */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-400 mb-3">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'unresolved', label: 'Unresolved' },
                      { id: 'in_progress', label: 'In Progress' },
                      { id: 'resolved', label: 'Resolved' }
                    ].map(status => (
                      <button
                        key={status.id}
                        onClick={() => setStatusFilter(status.id)}
                        className={`px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-colors ${statusFilter === status.id ? 'bg-[#0052CC] text-white' : 'bg-gray-100 dark:bg-[#333] text-black dark:text-white'}`}
                      >
                        {statusFilter === status.id && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Issue Type */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-400 mb-3">Issue Type</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setIssueTypeFilter('all')}
                      className={`px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-colors ${issueTypeFilter === 'all' ? 'bg-[#0052CC] text-white' : 'bg-gray-100 dark:bg-[#333] text-black dark:text-white'}`}
                    >
                      {issueTypeFilter === 'all' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      All
                    </button>
                    {issueTypes.map(type => (
                      <button
                        key={type}
                        onClick={() => setIssueTypeFilter(type)}
                        className={`px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-colors ${issueTypeFilter === type ? 'bg-[#0052CC] text-white' : 'bg-gray-100 dark:bg-[#333] text-black dark:text-white'}`}
                      >
                        {issueTypeFilter === type && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t dark:border-[#333]">
                <button
                  onClick={() => setShowFilterPanel(false)}
                  className="w-full bg-[#0052CC] text-white py-4 rounded-full font-bold text-lg hover:bg-blue-700 transition-colors drop-shadow-[0_4px_14px_rgba(0,82,204,0.39)] hover:drop-shadow-[0_6px_20px_rgba(0,82,204,0.23)]"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </>
        )}

        {/* Bubble Details Panel (Left Side) */}
        {detailedReport && (
          <div className="animate-slide-in-left absolute top-0 left-0 h-full w-full sm:w-[450px] bg-[#F4F0EA] dark:bg-[#1C1C1C] border-r-0 sm:border-r-4 border-black dark:border-[#333] z-[1002] flex flex-col">
            <div className="p-6 border-b-4 border-black dark:border-[#333] flex justify-between items-center bg-white dark:bg-black text-black dark:text-white">
              <h3 className="font-black text-2xl uppercase tracking-tighter">REPORT DETAILS</h3>
              <button
                onClick={() => setDetailedReport(null)}
                className="w-10 h-10 border-4 border-black dark:border-white rounded-full flex items-center justify-center hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors font-black"
              >
                X
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto text-black dark:text-white">
              <div className="inline-block bg-[#0052CC] text-white text-xs font-bold px-3 py-1 mb-4 rounded-full border-2 border-black">
                {detailedReport.issue_type?.replace(/_/g, ' ').toUpperCase()}
              </div>
              <h2 className="font-black text-3xl uppercase tracking-tighter mb-4 leading-none break-words">
                {detailedReport.title}
              </h2>
              
              <div className="text-sm font-bold border-l-4 border-[#0052CC] pl-4 mb-6">
                <p className="mb-1">STATUS: <span className="uppercase text-[#FF3B30] dark:text-[#FFCC00]">{detailedReport.status?.replace(/_/g, ' ')}</span></p>
                <p className="mb-1">DATE: {new Date(detailedReport.created_at).toLocaleDateString()}</p>
                
                {detailedReport.deadline_at && (
                  <div className="mt-3 p-3 border-4 border-black dark:border-[#333] rounded-2xl bg-white dark:bg-black">
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Target Resolution</p>
                    <p className={`text-sm ${detailedReport.is_overdue ? 'text-[#FF3B30] animate-pulse' : 'text-[#34C759]'}`}>
                      {new Date(detailedReport.deadline_at).toLocaleDateString()} at {new Date(detailedReport.deadline_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      {detailedReport.is_overdue && ' (OVERDUE - ESCALATED)'}
                    </p>
                  </div>
                )}
              </div>

              <div className="mb-8 border-4 border-black dark:border-[#333] rounded-3xl p-5 bg-white dark:bg-black drop-shadow-[4px_4px_0_black]">
                <p className="font-medium text-lg leading-relaxed whitespace-pre-wrap">
                  {detailedReport.description || 'No description provided.'}
                </p>
              </div>

              {/* Citizen Photos */}
              <div className="mb-8">
                <h4 className="font-black text-xl uppercase mb-4">
                  CITIZEN EVIDENCE
                </h4>
                {detailedEvidence.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {detailedEvidence.map((img, i) => (
                      <div key={i} className="border-4 border-black dark:border-[#333] rounded-2xl overflow-hidden drop-shadow-[4px_4px_0_black]">
                        <ImageWithLoader src={img.url} alt="Evidence" className="w-full h-32" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 font-bold uppercase">No initial photos attached.</p>
                )}
              </div>

              {/* Staff Before / After */}
              {(detailedReport.before_photo_url || detailedReport.after_photo_url) && (
                <div className="mb-8">
                  <h4 className="font-black text-xl uppercase mb-4">
                    OFFICIAL RESOLUTION
                  </h4>
                  <div className="grid grid-cols-1 gap-6">
                    {detailedReport.before_photo_url && (
                      <div>
                        <span className="inline-block bg-black text-white dark:bg-white dark:text-black text-xs font-bold px-3 py-1 mb-2 rounded-full border-2 border-black">BEFORE</span>
                        <div className="border-4 border-black dark:border-[#333] rounded-2xl overflow-hidden drop-shadow-[4px_4px_0_black]">
                          <ImageWithLoader src={detailedReport.before_photo_url} alt="Before" className="w-full h-48" />
                        </div>
                      </div>
                    )}
                    {detailedReport.after_photo_url && (
                      <div>
                        <span className="inline-block bg-[#34C759] text-white text-xs font-bold px-3 py-1 mb-2 rounded-full border-2 border-black">AFTER</span>
                        <div className="border-4 border-black dark:border-[#333] rounded-2xl overflow-hidden drop-shadow-[4px_4px_0_black]">
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


