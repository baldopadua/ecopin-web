'use client'

import { useEffect, useMemo, useRef, useState, useDeferredValue } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { Search, X, ChevronDown } from 'lucide-react'
import {
  MAP_LOCATIONS,
  PASIG_LANDMARKS_AND_ADDRESSES,
  findMapResults,
  formatClusterPoi,
  searchAddressGeocode
} from '@/lib/map-search.mjs'
import { formatReportAddress } from '@/lib/format-location.mjs'
import { getReportStatusHex } from '@/lib/helpers/statusHelpers'

export default function MapSearch({
  reports = [],
  clusters = [],
  tasks = [],
  onSelectReport,
  onSelectCluster,
  onSelectTask,
  onSelectLocation,
  selectedReportId,
}) {
  const map = useMap()
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return
    L.DomEvent.disableClickPropagation(containerRef.current)
    L.DomEvent.disableScrollPropagation(containerRef.current)
  }, [])

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'hotspots' | 'reports' | 'locations' | 'tasks'
  const [geocodedLocations, setGeocodedLocations] = useState([])
  const deferredQuery = useDeferredValue(query)

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Dynamic forward address search via Photon with debounce
  useEffect(() => {
    const trimmed = deferredQuery.trim()
    if (trimmed.length < 3) return

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const results = await searchAddressGeocode(trimmed, { signal: controller.signal, limit: 5 })
        if (!controller.signal.aborted) {
          setGeocodedLocations(results)
        }
      } catch {
        // Silently preserve current items on error
      }
    }, 280)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [deferredQuery])

  // Standardize clusters for Points of Interest display & search
  const formattedClusters = useMemo(() => {
    return (clusters || [])
      .map(c => formatClusterPoi(c, MAP_LOCATIONS))
      .filter(Boolean)
  }, [clusters])

  // Standardize reports for display & search
  const formattedReports = useMemo(() => {
    return (reports || [])
      .filter(r => {
        const lat = Number(r.parsedLat != null ? r.parsedLat : r.latitude)
        const lng = Number(r.parsedLng != null ? r.parsedLng : r.longitude)
        return Number.isFinite(lat) && Number.isFinite(lng)
      })
      .map(r => {
        const lat = Number(r.parsedLat != null ? r.parsedLat : r.latitude)
        const lng = Number(r.parsedLng != null ? r.parsedLng : r.longitude)
        const address = formatReportAddress(r, { short: true })
        const rawIssue = (r.issue_type || 'Incident').replace(/_/g, ' ')
        const issueFormatted = rawIssue.charAt(0).toUpperCase() + rawIssue.slice(1)
        const title = r.title || `${issueFormatted} Report #${(r.id || '').slice(0, 6)}`
        return {
          ...r,
          id: r.id,
          kind: 'Report',
          title,
          subtitle: address,
          status: r.status,
          issue_type: r.issue_type,
          coords: [lat, lng],
          raw: r,
        }
      })
  }, [reports])

  // Standardize curated landmarks, barangays, and thoroughfares
  const formattedLocations = useMemo(() => {
    return PASIG_LANDMARKS_AND_ADDRESSES.map(loc => ({
      id: `loc-${loc.name}`,
      kind: 'Location',
      name: loc.name,
      title: loc.name,
      subtitle: loc.address || (loc.category ? `${loc.category} Landmark • Pasig City` : 'Pasig area landmark'),
      category: loc.category || 'Landmark',
      address: loc.address,
      keywords: loc.keywords,
      coords: [loc.lat, loc.lng],
      lat: loc.lat,
      lng: loc.lng,
      raw: loc,
    }))
  }, [])

  // Standardize cleanup tasks (for officer map view)
  const formattedTasks = useMemo(() => {
    return (tasks || [])
      .filter(t => {
        const lat = Number(t.parsedLat != null ? t.parsedLat : (t.coords ? t.coords[0] : t.latitude))
        const lng = Number(t.parsedLng != null ? t.parsedLng : (t.coords ? t.coords[1] : t.longitude))
        return Number.isFinite(lat) && Number.isFinite(lng)
      })
      .map(t => {
        const lat = Number(t.parsedLat != null ? t.parsedLat : (t.coords ? t.coords[0] : t.latitude))
        const lng = Number(t.parsedLng != null ? t.parsedLng : (t.coords ? t.coords[1] : t.longitude))
        return {
          ...t,
          id: t.id,
          kind: 'Task',
          title: t.title || t.name || `Task #${(t.id || '').slice(0, 6)}`,
          subtitle: t.assigned_crew ? `Crew: ${t.assigned_crew}` : `Status: ${t.status || 'Pending'}`,
          status: t.status,
          coords: [lat, lng],
          raw: t,
        }
      })
  }, [tasks])

  // Combined searchable item pool
  const allItems = useMemo(() => [
    ...formattedClusters,
    ...formattedReports,
    ...formattedLocations,
    ...formattedTasks,
  ], [formattedClusters, formattedReports, formattedLocations, formattedTasks])

  // Real-time search results matching query across all fields + dynamic geocoding
  const searchResults = useMemo(() => {
    const trimmed = deferredQuery.trim()
    if (!trimmed) return []
    const localMatches = findMapResults(allItems, trimmed)

    if (trimmed.length < 3 || geocodedLocations.length === 0) return localMatches

    // Merge geocoded results while avoiding duplicates with existing landmarks
    const merged = [...localMatches]
    for (const geo of geocodedLocations) {
      const alreadyExists = merged.some(m =>
        m.title.toLowerCase() === geo.title.toLowerCase() ||
        (m.coords && Math.abs(m.coords[0] - geo.coords[0]) < 0.0005 && Math.abs(m.coords[1] - geo.coords[1]) < 0.0005)
      )
      if (!alreadyExists) {
        merged.push(geo)
      }
    }
    return merged
  }, [allItems, deferredQuery, geocodedLocations])

  // Filtered by selected tab
  const displayedItems = useMemo(() => {
    const isSearching = Boolean(deferredQuery.trim())
    const sourceList = isSearching ? searchResults : allItems

    if (activeTab === 'hotspots') {
      return sourceList.filter(item => item.kind === 'Hotspot')
    }
    if (activeTab === 'reports') {
      return sourceList.filter(item => item.kind === 'Report')
    }
    if (activeTab === 'locations') {
      return sourceList.filter(item => item.kind === 'Location')
    }
    if (activeTab === 'tasks') {
      return sourceList.filter(item => item.kind === 'Task')
    }

    // Default 'all'
    if (isSearching) {
      return sourceList.slice(0, 30)
    }

    // When empty query on 'all', prioritize active hotspots + prominent civic landmarks
    return [
      ...formattedClusters.slice(0, 8),
      ...formattedLocations.slice(0, 6),
    ]
  }, [activeTab, deferredQuery, searchResults, allItems, formattedClusters, formattedLocations])

  // Counts for tabs
  const tabCounts = useMemo(() => {
    const pool = deferredQuery.trim() ? searchResults : allItems
    return {
      all: pool.length,
      hotspots: pool.filter(i => i.kind === 'Hotspot').length,
      reports: pool.filter(i => i.kind === 'Report').length,
      locations: pool.filter(i => i.kind === 'Location').length,
      tasks: pool.filter(i => i.kind === 'Task').length,
    }
  }, [deferredQuery, searchResults, allItems])

  // Handle selection of any result item
  const handleSelect = (item) => {
    if (!item || !item.coords) return

    if (item.kind === 'Report') {
      map.flyTo(item.coords, 18, { duration: 0.6 })
      if (onSelectReport) {
        onSelectReport(item.raw || item)
      }
    } else if (item.kind === 'Hotspot') {
      map.flyTo(item.coords, 16, { duration: 0.6 })
      if (onSelectCluster) {
        onSelectCluster(item.raw || item)
      }
    } else if (item.kind === 'Location') {
      map.flyTo(item.coords, 17, { duration: 0.8 })
      if (onSelectLocation) {
        onSelectLocation(item.raw || item)
      }
    } else if (item.kind === 'Task') {
      map.flyTo(item.coords, 18, { duration: 0.6 })
      if (onSelectTask) {
        onSelectTask(item.raw || item)
      }
    }

    setQuery(item.title)
    setActiveTab('all')
    setOpen(false)
  }

  // Handle Enter key on form submission
  const handleSubmit = (e) => {
    e.preventDefault()
    if (displayedItems.length > 0) {
      handleSelect(displayedItems[0])
    }
  }

  const TABS = [
    { id: 'all', label: 'All', count: tabCounts.all },
    { id: 'hotspots', label: 'Hotspots', count: tabCounts.hotspots },
    { id: 'reports', label: 'Reports', count: tabCounts.reports },
    { id: 'locations', label: 'Landmarks', fullLabel: 'Landmarks and addresses', count: tabCounts.locations },
    ...(tabCounts.tasks > 0 ? [{ id: 'tasks', label: 'Tasks', count: tabCounts.tasks }] : []),
  ]
  const heading = deferredQuery.trim()
    ? `Results for “${deferredQuery}”`
    : { hotspots: 'Active clusters and hotspots', reports: 'Recent reports', locations: 'Pasig landmarks and addresses', tasks: 'Cleanup tasks' }[activeTab] || 'Points of interest and hotspots'

  return (
    <div
      ref={containerRef}
      className="absolute top-3 left-14 right-3 sm:right-auto sm:w-[460px] md:w-[480px] z-[1000] font-sans pointer-events-auto"
      onPointerDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}
      onWheel={e => e.stopPropagation()}
    >
      {/* One quiet search bar: 44px, 12px corners, 1px border */}
      <form onSubmit={handleSubmit} role="search" className="flex items-center gap-1 pl-3 pr-1 min-h-[44px] bg-surface text-text-primary border border-border rounded-xl shadow-[0_4px_16px_#00000010] focus-within:border-[#0052cc]">
        <Search size={16} className="text-text-secondary shrink-0" aria-hidden="true" />
        <input
          type="search"
          aria-label="Search landmarks, addresses, reports, or hotspots"
          placeholder="Search landmarks, addresses, reports"
          value={query}
          className="flex-1 min-w-0 h-11 px-2 bg-transparent text-sm text-text-primary placeholder:text-text-secondary outline-none focus-visible:!outline-none [&::-webkit-search-cancel-button]:hidden"
          onFocus={() => setOpen(true)}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onKeyDown={e => {
            e.stopPropagation()
            if (e.key === 'Escape') setOpen(false)
          }}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear map search"
            onClick={() => {
              setQuery('')
              setActiveTab('all')
              setOpen(true)
            }}
            className="grid h-11 w-11 place-items-center rounded-lg text-text-secondary hover:text-text-primary shrink-0"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Hide map results' : 'Browse map results'}
          onClick={() => setOpen(prev => !prev)}
          className="grid h-11 w-11 place-items-center rounded-lg text-text-secondary hover:text-text-primary shrink-0"
        >
          <ChevronDown size={16} aria-hidden="true" className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </button>
      </form>

      {open && (
        <div className="mt-2 bg-surface text-text-primary border border-border rounded-2xl shadow-[0_8px_32px_#17212e1f] overflow-hidden max-h-[460px] flex flex-col">
          {/* Category filter: the same pill segmented control as the Explore status filter */}
          <div className="p-3 border-b border-border shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <div role="group" aria-label="Result category" className="inline-flex gap-0.5 p-0.5 border border-border rounded-full">
              {TABS.map(tab => {
                const isSelected = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={isSelected}
                    title={tab.fullLabel || tab.label}
                    onClick={() => setActiveTab(prev => prev === tab.id ? 'all' : tab.id)}
                    className={`min-h-[40px] px-3 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                      isSelected ? 'bg-[#0052cc] text-white' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {tab.label} <span className={isSelected ? 'text-white/80' : 'text-text-muted'}>{tab.count}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="px-4 py-2 flex items-center justify-between gap-3 text-[13px] text-text-secondary border-b border-border shrink-0">
            <span className="truncate">{heading}</span>
            <span className="shrink-0">
              {displayedItems.length} {displayedItems.length === 1 ? 'result' : 'results'}
              {activeTab !== 'all' && (
                <button type="button" onClick={() => setActiveTab('all')} className="ml-3 text-workspace-link hover:underline underline-offset-4">Clear filter</button>
              )}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {displayedItems.length === 0 ? (
              <div className="px-4 py-8">
                <p className="text-sm font-medium text-text-primary">No matching results</p>
                <p className="text-sm text-text-secondary mt-1 max-w-[320px]">
                  {deferredQuery.trim()
                    ? `Nothing matches “${deferredQuery}”. Try a landmark, street address or barangay.`
                    : 'Nothing is available in this category yet.'}
                </p>
                {activeTab !== 'all' && (
                  <button type="button" onClick={() => setActiveTab('all')} className="mt-3 min-h-[44px] text-sm font-medium text-workspace-link hover:underline underline-offset-4">Show all results</button>
                )}
              </div>
            ) : (
              <ul>
                {displayedItems.map(item => {
                  const isSelected = selectedReportId === item.id
                  const cleanTitle = typeof item.title === 'string' ? item.title.replace(/^\[DEMO\] /, '') : item.title
                  const displayTitle = item.kind === 'Hotspot' && item.nearbyLandmark && !cleanTitle.includes(item.nearbyLandmark)
                    ? `${cleanTitle} · ${item.nearbyLandmark}`
                    : cleanTitle
                  const statusText = (item.status || '').replace(/_/g, ' ')
                  let meta = null
                  if (item.kind === 'Hotspot') meta = `${item.report_count} ${item.report_count === 1 ? 'report' : 'reports'}`
                  else if (item.kind === 'Location') meta = item.category || (item.isGeocoded ? 'Address' : 'Landmark')
                  else if (statusText) meta = statusText

                  return (
                    <li key={`${item.kind}-${item.id}`} className="border-b border-border last:border-b-0">
                      <button
                        type="button"
                        onClick={() => handleSelect(item)}
                        aria-current={isSelected ? 'true' : undefined}
                        className={`w-full min-h-[56px] px-4 py-3 text-left flex items-start justify-between gap-4 transition-colors ${
                          isSelected ? 'bg-surface-elevated' : 'hover:bg-surface-elevated'
                        }`}
                      >
                        <span className="min-w-0">
                          <span className={`block text-sm font-medium leading-snug ${isSelected ? 'text-workspace-link' : 'text-text-primary'}`}>{displayTitle}</span>
                          {item.subtitle && <span className="block mt-0.5 text-[13px] text-text-secondary truncate">{item.subtitle}</span>}
                        </span>
                        {meta && (
                          <span className={`shrink-0 inline-flex items-center gap-2 text-[13px] text-text-secondary ${item.kind === 'Report' || item.kind === 'Task' ? 'capitalize' : ''}`}>
                            {item.kind === 'Report' && item.status && <i aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: getReportStatusHex(item.status) }} />}
                            {meta}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
