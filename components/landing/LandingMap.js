'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { MapContainer, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { ArrowUpRight, LocateFixed, MapPin, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchPublicReportPage } from '@/lib/api/public-report-page.mjs'
import { fetchBatchReportEvidence } from '@/lib/api/reports'
import PhotoReportMarker from './PhotoReportMarker'
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
// Category imagery matches the existing full map when public evidence is unavailable.
const CATEGORY_IMAGES = {
  waste: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=120&q=70',
  flooding: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=120&q=70',
  pollution: 'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?auto=format&fit=crop&w=120&q=70',
  infrastructure: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=120&q=70',
  illegal_logging: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=120&q=70',
  others: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=120&q=70',
}

function ReportLayer({ location, issueType, retry, onState, isDark }) {
  const [reports, setReports] = useState([])
  const [revision, setRevision] = useState(0)
  const [evidence, setEvidence] = useState({})
  const evidenceCache = useRef({})
  const [zoom, setZoom] = useState(14)
  const [selectedId, setSelectedId] = useState(null)
  const map = useMapEvents({ moveend: () => setRevision(value => value + 1), zoomend: event => setZoom(event.target.getZoom()) })

  useEffect(() => {
    const target = LOCATIONS[location]
    map.setView(target.center, target.zoom)
  }, [location, map])

  useEffect(() => {
    const controller = new AbortController()
    onState({ loading: true, error: false, count: 0 })
    const timer = setTimeout(async () => {
      const bounds = map.getBounds()
      try {
        const page = await fetchPublicReportPage(supabase, {
          bounds: { south: bounds.getSouth(), north: bounds.getNorth(), west: bounds.getWest(), east: bounds.getEast() },
          issueType, limit: 100, signal: controller.signal,
        })
        if (controller.signal.aborted) return
        const visible = page.reports.filter(report =>
          ['approved', 'validated', 'verified'].includes((report.validation_status || '').toLowerCase().trim()) ||
          (report.stage || '').toLowerCase().trim() === 'verified'
        ).filter(report => Number.isFinite(report.latitude) && Number.isFinite(report.longitude))
        setReports(visible)
        onState({ loading: false, error: false, count: visible.length, hasMore: page.hasMore })
        const photoIds = visible.filter(report => report.location_precision === 'exact' && evidenceCache.current[report.id] === undefined).map(report => report.id)
        if (photoIds.length) {
          const photos = await fetchBatchReportEvidence(photoIds, controller.signal)
          if (!controller.signal.aborted) {
            const received = Object.fromEntries(photoIds.map(id => [id, photos[id] || []]))
            evidenceCache.current = { ...evidenceCache.current, ...received }
            setEvidence(evidenceCache.current)
          }
        }
      } catch {
        if (controller.signal.aborted) return
        setReports([])
        onState({ loading: false, error: true, count: 0 })
      }
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [map, revision, issueType, retry, onState])

  return layoutPublicPins(reports, zoom).map(pin => {
      const { report } = pin
      const photo = evidence[report.id]?.find(item => item.resource_type === 'image' || !item.resource_type)?.url
      const select = () => {
        setSelectedId(report.id)
        const nextZoom = pin.isCluster ? 15 : zoom
        const target = map.project(pin.position, nextZoom)
        // Keep the compact popup in the usable map area below the hero copy.
        const center = map.unproject(target.subtract([0, Math.max(0, map.getSize().y / 2 - 80)]), nextZoom)
        if (pin.isCluster) map.setView(center, nextZoom, { animate: true })
        else map.panTo(center, { animate: true, duration: .45 })
      }
      return <Fragment key={pin.key}>
        {pin.separated && <Polyline positions={[pin.original, pin.position]} color="#0052CC" weight={1.5} opacity={.6} dashArray="3 3" />}
        <PhotoReportMarker report={report} position={pin.position} image={photo || CATEGORY_IMAGES[report.issue_type] || CATEGORY_IMAGES.others} selected={selectedId === report.id} isCluster={pin.isCluster} isDark={isDark} onSelect={select}>
          <PublicReportPopup report={report} illustration={!photo} />
        </PhotoReportMarker>
      </Fragment>
    })
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
    <MapContainer center={LOCATIONS.pasig.center} zoom={14} scrollWheelZoom={false} zoomControl={false} className={styles.leafletMap}>
      <TileLayer key={isDark ? 'dark' : 'light'} url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" className={isDark ? styles.darkTiles : styles.lightTiles} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
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
