'use client'

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { ArrowUpRight, LocateFixed, MapPin, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchPublicReportPage } from '@/lib/api/public-report-page.mjs'
import PublicReportPopup from './PublicReportPopup'
import PublicSelect from '@/components/ui/PublicSelect'
import { layoutPublicPins } from './public-pin-layout.mjs'
import styles from './LandingPage.module.css'

const LOCATIONS = {
  pasig: { label: 'All of Pasig', center: [14.5802, 121.085], zoom: 14 },
  ortigas: { label: 'Ortigas Center', center: [14.5862, 121.061], zoom: 15 },
  rosario: { label: 'Rosario', center: [14.5875, 121.092], zoom: 15 },
  maybunga: { label: 'Maybunga', center: [14.5775, 121.0965], zoom: 15 },
  kapasigan: { label: 'Kapasigan', center: [14.5595, 121.0805], zoom: 15 },
}
const TYPES = { all: 'All concerns', waste: 'Waste', flooding: 'Flooding', pollution: 'Pollution', infrastructure: 'Infrastructure', illegal_logging: 'Illegal logging', others: 'Other concerns' }

// Wide enough to cover every barangay; the landing loads all reviewed pins once
// instead of refetching per viewport, so panning never waits on the network.
const PASIG_BOUNDS = { south: 14.5, north: 14.65, west: 121.02, east: 121.15 }

function ReportLayer({ location, issueType, retry, onState, isDark }) {
  const [reports, setReports] = useState([])
  const reportsRef = useRef(reports)
  const [zoom, setZoom] = useState(14)
  const [selectedId, setSelectedId] = useState(null)
  const map = useMapEvents({
    moveend: () => onState(state => state.loading || state.error ? state : { ...state, count: countInView(reportsRef.current) }),
    zoomend: event => setZoom(event.target.getZoom()),
  })
  // The status line still describes "this view", counted locally from the loaded set.
  const countInView = useCallback(list => {
    const bounds = map.getBounds()
    return list.filter(report => bounds.contains([report.latitude, report.longitude])).length
  }, [map])

  useEffect(() => {
    const target = LOCATIONS[location]
    map.setView(target.center, target.zoom)
  }, [location, map])

  useEffect(() => {
    const controller = new AbortController()
    onState({ loading: true, error: false, count: 0 })
    fetchPublicReportPage(supabase, { bounds: PASIG_BOUNDS, issueType, limit: 500, signal: controller.signal }).then(page => {
      if (controller.signal.aborted) return
      const visible = page.reports.filter(report => {
        const val = (report.validation_status || '').toLowerCase().trim()
        if (val === 'manual_review' || val === 'pending' || val === 'rejected') return false
        return ['approved', 'validated', 'verified'].includes(val) || (report.stage || '').toLowerCase().trim() === 'verified'
      }).filter(report => Number.isFinite(report.latitude) && Number.isFinite(report.longitude))
      reportsRef.current = visible
      setReports(visible)
      onState({ loading: false, error: false, count: countInView(visible), hasMore: page.hasMore })
    }).catch(() => {
      if (controller.signal.aborted) return
      reportsRef.current = []
      setReports([])
      onState({ loading: false, error: true, count: 0 })
    })
    return () => controller.abort()
  }, [map, issueType, retry, onState, countInView])

  const pins = useMemo(() => layoutPublicPins(reports, zoom), [reports, zoom])
  const selected = pins.find(pin => !pin.isCluster && pin.report.id === selectedId)
  const blue = isDark ? '#82b6ff' : '#0052CC'
  const edge = isDark ? '#121212' : '#FFFFFF'

  return <>
    {pins.map(pin => {
      const { report } = pin
      const isSelected = pin === selected
      const select = () => {
        setSelectedId(pin.isCluster ? null : report.id)
        const nextZoom = pin.isCluster ? 15 : zoom
        const target = map.project(pin.position, nextZoom)
        // Keep the compact popup in the usable map area below the hero copy.
        const center = map.unproject(target.subtract([0, Math.max(0, map.getSize().y / 2 - 80)]), nextZoom)
        if (pin.isCluster) map.setView(center, nextZoom, { animate: true })
        else map.panTo(center, { animate: true, duration: .45 })
      }
      return <Fragment key={pin.key}>
        {pin.separated && <Polyline positions={[pin.original, pin.position]} color={blue} weight={1} opacity={.5} dashArray="2 3" interactive={false} />}
        <CircleMarker center={pin.position} radius={isSelected ? 7 : pin.isCluster ? 6 : 4.5} pathOptions={{ color: isSelected || pin.isCluster ? blue : edge, weight: isSelected ? 3 : pin.isCluster ? 2.5 : 1.5, fillColor: pin.isCluster ? edge : blue, fillOpacity: 1 }} eventHandlers={{ click: select }} bubblingMouseEvents={false} />
      </Fragment>
    })}
    {selected && <Popup position={selected.position} offset={[0, -6]} closeButton autoPan={false} eventHandlers={{ remove: () => setSelectedId(null) }}>
      <PublicReportPopup report={selected.report} compact />
    </Popup>}
  </>
}

function MapControls({ onReset }) {
  const map = useMap()
  return <div className={styles.mapControls}>
    <button aria-label="Zoom in on map" onClick={() => map.zoomIn()}>+</button>
    <button aria-label="Zoom out on map" onClick={() => map.zoomOut()}>−</button>
    <button aria-label="Return map to Pasig City" onClick={() => { onReset(); map.setView(LOCATIONS.pasig.center, LOCATIONS.pasig.zoom) }}><LocateFixed size={18} /></button>
  </div>
}

export default function LandingMap({ isDark }) {
  const [location, setLocation] = useState('pasig')
  const [issueType, setIssueType] = useState('all')
  const [retry, setRetry] = useState(0)
  const [state, setState] = useState({ loading: true, error: false, count: 0 })

  return <div className={styles.mapPreview} role="region" aria-label="Interactive public reports map">
    <div className={styles.mapToolbar}>
      <MapPin size={20} className={styles.toolbarPin} />
      <PublicSelect id="preview-neighborhood" label="Neighborhood" value={location} onChange={setLocation} options={Object.entries(LOCATIONS).map(([value, place]) => ({ value, label: place.label }))} className={styles.toolbarSelect} />
      <PublicSelect id="preview-concern" label="Concern type" value={issueType} onChange={setIssueType} options={Object.entries(TYPES).map(([value, label]) => ({ value, label }))} className={styles.toolbarSelect} />
      <Link href="/explore" aria-label="Open the full public map"><ArrowUpRight size={22} /></Link>
    </div>
    <MapContainer center={LOCATIONS.pasig.center} zoom={14} preferCanvas scrollWheelZoom={false} zoomControl={false} className={styles.leafletMap}>
      <TileLayer key={isDark ? 'dark' : 'light'} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" className={isDark ? styles.darkTiles : styles.lightTiles} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
      <ReportLayer location={location} issueType={issueType} retry={retry} onState={setState} isDark={isDark} />
      <MapControls onReset={() => setLocation('pasig')} />
    </MapContainer>
    <div className={styles.mapFade} aria-hidden="true" />
    <div className={styles.mapCaption}><span className={styles.greenDot} /><span>Pasig City, through your eyes</span><small>Drag to explore · Tap a pin</small></div>
    <div className={styles.mapStatus} role="status">
      {state.loading ? 'Finding public reports…' : state.error ? <><span>Reports couldn’t load.</span><button onClick={() => setRetry(value => value + 1)}><RefreshCw size={14} /> Try again</button></> : state.count ? `${state.count}${state.hasMore ? '+' : ''} reviewed ${state.count === 1 ? 'report' : 'reports'} in this view` : 'No reviewed reports in this view. Try another area.'}
    </div>
    <Link className={styles.fullMapLink} href="/explore">Open full map <ArrowUpRight size={16} /></Link>
  </div>
}
