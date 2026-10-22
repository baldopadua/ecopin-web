'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { Search, X } from 'lucide-react'
import { MAP_LOCATIONS, findMapResults } from '@/lib/map-search.mjs'

export default function MapSearch({ reports, clusters }) {
  const map = useMap()
  const containerRef = useRef(null)
  useEffect(() => {
    L.DomEvent.disableClickPropagation(containerRef.current)
    L.DomEvent.disableScrollPropagation(containerRef.current)
  }, [])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const items = useMemo(() => [
    ...reports.filter(report => Number.isFinite(Number(report.parsedLat)) && Number.isFinite(Number(report.parsedLng)) && report.parsedLat != null && report.parsedLng != null).map(report => ({ ...report, kind: 'Report', title: report.title || `Report ${report.id}`, coords: [report.parsedLat, report.parsedLng] })),
    ...clusters.filter(cluster => cluster.coords).map(cluster => ({ ...cluster, kind: 'Cluster', title: cluster.title || `${cluster.issue_type || 'Environmental'} hotspot` })),
    ...MAP_LOCATIONS.map(location => ({ kind: 'Location', id: location.name, title: location.name, coords: [location.lat, location.lng] })),
  ], [reports, clusters])
  const results = useMemo(() => findMapResults(items, query).slice(0, 20), [items, query])
  const select = item => {
    map.flyTo(item.coords, item.kind === 'Report' ? 18 : 15)
    setQuery(item.title)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="absolute top-3 left-14 right-3 sm:right-auto sm:w-80 z-[1000] bg-surface-elevated text-text-primary border border-border rounded-lg shadow-md"
      onPointerDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}
      onWheel={event => event.stopPropagation()} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
      <form className="flex items-center gap-2 px-3" onSubmit={event => { event.preventDefault(); if (results[0]) select(results[0]) }}>
        <Search size={16} aria-hidden="true" />
        <input type="search" aria-label="Search reports, locations, and clusters" placeholder="Search reports, locations…" value={query}
          className="min-w-0 w-full py-3 bg-transparent text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true) }}
          onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') setOpen(false) }} />
        {query && <button type="button" aria-label="Clear map search" onClick={() => { setQuery(''); setOpen(false) }}><X size={16} /></button>}
      </form>
      {open && query.trim() && <div className="border-t border-border max-h-64 overflow-y-auto">
        <p role="status" className="px-3 py-2 text-xs text-text-secondary">{results.length ? `${results.length}${results.length === 20 ? '+' : ''} results` : 'No matching reports, locations, or clusters.'}</p>
        {results.map(item => <button key={`${item.kind}-${item.id}`} type="button" onClick={() => select(item)} className="block w-full text-left px-3 py-2 hover:bg-surface focus-visible:ring-2 focus-visible:ring-blue-500">
          <span className="block text-xs text-text-secondary">{item.kind}</span>
          <span className="block text-sm truncate">{item.title}</span>
        </button>)}
      </div>}
    </div>
  )
}
