'use client'

import { useEffect, useMemo, useRef, useState, useDeferredValue } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import {
  Search,
  X,
  Compass,
  MapPin,
  AlertTriangle,
  ClipboardList,
  Layers,
  ChevronRight,
  ChevronDown,
  Flame,
  Building2,
  SlidersHorizontal
} from 'lucide-react'
import {
  MAP_LOCATIONS,
  PASIG_LANDMARKS_AND_ADDRESSES,
  findMapResults,
  formatClusterPoi,
  searchAddressGeocode
} from '@/lib/map-search.mjs'
import { formatReportAddress } from '@/lib/format-location.mjs'

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

  return (
    <div
      ref={containerRef}
      className="absolute top-3 left-14 right-3 sm:right-auto sm:w-[460px] md:w-[480px] z-[1000] font-sans pointer-events-auto"
      onPointerDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}
      onWheel={e => e.stopPropagation()}
    >
      {/* Search Input Bar with Categories filter pill */}
      <div className="flex items-center gap-1.5 p-1.5 bg-surface-elevated/95 dark:bg-[#1C1C1C]/95 backdrop-blur-md text-text-primary border border-border shadow-lg rounded-2xl transition-all hover:shadow-xl">
        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2 px-2.5 min-w-0">
          <Search size={16} className="text-text-secondary shrink-0" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search landmarks, addresses, reports, or hotspots"
            placeholder="Search landmarks, addresses, reports, hotspots…"
            value={query}
            className="w-full py-1.5 bg-transparent text-xs sm:text-sm text-text-primary placeholder:text-text-muted outline-none"
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
              className="p-1 rounded-full text-text-muted hover:text-text-primary hover:bg-surface transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          )}
        </form>

        {/* Categories & Filter Dropdown Toggle Pill */}
        <div
          className={`flex items-center rounded-xl border text-[11px] font-semibold transition-all shrink-0 ${
            open
              ? 'bg-[#0052cc] text-white border-[#0052cc] shadow-sm'
              : activeTab !== 'all'
              ? 'bg-[#0052cc]/10 border-[#0052cc]/40 text-[#0052cc] dark:text-[#60A5FA]'
              : 'bg-surface border-border text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setOpen(prev => !prev)
            }}
            className={`flex items-center gap-1.5 py-1.5 rounded-xl transition-all outline-none ${
              activeTab !== 'all' ? 'pl-2.5 pr-1.5' : 'px-3'
            }`}
            title={
              activeTab !== 'all'
                ? `Filtered by ${
                    activeTab === 'hotspots'
                      ? 'Hotspots'
                      : activeTab === 'reports'
                      ? 'Reports'
                      : activeTab === 'locations'
                      ? 'Landmarks'
                      : 'Tasks'
                  } — Click to browse categories`
                : 'Browse map categories and filter options'
            }
            aria-expanded={open}
            aria-label={
              activeTab === 'all'
                ? 'Filter categories'
                : `Filtered by ${
                    activeTab === 'hotspots'
                      ? 'Hotspots'
                      : activeTab === 'reports'
                      ? 'Reports'
                      : activeTab === 'locations'
                      ? 'Landmarks'
                      : 'Tasks'
                  }`
            }
          >
            {activeTab === 'hotspots' ? (
              <Flame size={13} className={open ? 'text-white' : 'text-amber-500'} />
            ) : activeTab === 'reports' ? (
              <MapPin size={13} className={open ? 'text-white' : 'text-blue-500'} />
            ) : activeTab === 'locations' ? (
              <Building2 size={13} className={open ? 'text-white' : 'text-purple-500'} />
            ) : activeTab === 'tasks' ? (
              <ClipboardList size={13} className={open ? 'text-white' : 'text-emerald-500'} />
            ) : (
              <SlidersHorizontal size={13} className={open ? 'text-white' : 'text-text-muted'} />
            )}

            <span>
              {activeTab === 'all'
                ? 'Categories'
                : activeTab === 'hotspots'
                ? 'Hotspots'
                : activeTab === 'reports'
                ? 'Reports'
                : activeTab === 'locations'
                ? 'Landmarks'
                : 'Tasks'}
            </span>

            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                open
                  ? 'bg-white/25 text-white'
                  : activeTab === 'hotspots'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : activeTab === 'reports'
                  ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                  : activeTab === 'locations'
                  ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                  : activeTab === 'tasks'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'bg-surface-elevated text-text-muted border border-border/50'
              }`}
            >
              {activeTab === 'all' ? tabCounts.all : tabCounts[activeTab]}
            </span>

            <ChevronDown
              size={12}
              className={`transition-transform duration-150 ${open ? 'rotate-180 text-white' : 'text-text-muted'}`}
              aria-hidden="true"
            />
          </button>

          {/* Instant deselect button: reverts back to Categories label */}
          {activeTab !== 'all' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setActiveTab('all')
              }}
              title="Deselect category and revert to Categories"
              aria-label="Deselect category"
              className={`p-1 mr-1 rounded-full transition-colors ${
                open
                  ? 'hover:bg-white/20 text-white/80 hover:text-white'
                  : 'hover:bg-[#0052cc]/15 text-[#0052cc] dark:text-[#60A5FA]'
              }`}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown Results & Filter Panel */}
      {open && (
        <div className="mt-2 bg-surface-elevated dark:bg-[#1C1C1C] text-text-primary border border-border shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[460px] flex flex-col">
          {/* Category Filter Chips (Segmented Bar with Zero Scrollbar) */}
          <div
            className="flex items-center gap-1.5 p-2 border-b border-border bg-surface/60 overflow-x-auto text-xs shrink-0 no-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {[
              { id: 'all', label: 'All', count: tabCounts.all },
              { id: 'hotspots', label: 'Hotspots', count: tabCounts.hotspots, icon: Flame, iconTone: 'text-amber-500' },
              { id: 'reports', label: 'Reports', count: tabCounts.reports, icon: MapPin, iconTone: 'text-blue-500' },
              { id: 'locations', label: 'Landmarks', fullLabel: 'Landmarks & Addresses', count: tabCounts.locations, icon: Building2, iconTone: 'text-purple-500' },
              ...(tabCounts.tasks > 0 ? [{ id: 'tasks', label: 'Tasks', count: tabCounts.tasks, icon: ClipboardList, iconTone: 'text-emerald-500' }] : []),
            ].map(tab => {
              const Icon = tab.icon
              const isSelected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  title={isSelected ? `Deselect ${tab.label} (revert to Categories)` : (tab.fullLabel || tab.label)}
                  onClick={() => {
                    // Toggle off if already selected, reverting back to 'all' (none selected)
                    setActiveTab(prev => prev === tab.id ? 'all' : tab.id)
                  }}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl font-medium text-[11px] sm:text-xs transition-all whitespace-nowrap shrink-0 border ${
                    isSelected
                      ? 'bg-[#0052cc] text-white border-[#0052cc] shadow-sm font-semibold'
                      : 'bg-surface/80 border-border/70 text-text-secondary hover:bg-surface hover:text-text-primary hover:border-border'
                  }`}
                >
                  {Icon && (
                    <Icon
                      size={12}
                      className={isSelected ? 'text-white' : tab.iconTone || 'text-text-muted'}
                    />
                  )}
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-surface-elevated text-text-muted'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Section Summary Header with Quick Reset */}
          <div className="px-3.5 py-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-text-muted border-b border-border/50 bg-surface/20 shrink-0">
            <span>
              {deferredQuery.trim()
                ? `Results for "${deferredQuery}"`
                : activeTab === 'hotspots'
                ? 'Active Clusters & Hotspots'
                : activeTab === 'reports'
                ? 'Recent Reports'
                : activeTab === 'locations'
                ? 'Pasig Landmarks & Addresses'
                : activeTab === 'tasks'
                ? 'Cleanup Tasks'
                : 'Points of interest & Hotspots'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-text-muted">
                {displayedItems.length} total
              </span>
              {activeTab !== 'all' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className="text-[10px] text-workspace-link hover:underline normal-case font-medium flex items-center gap-1"
                >
                  <X size={10} />
                  <span>Clear filter</span>
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Items List with Custom Scrollbar */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
            {displayedItems.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <AlertTriangle size={24} className="mx-auto mb-2 text-text-muted" />
                <p className="text-xs font-semibold text-text-primary">No matching results found</p>
                <p className="text-[11px] text-text-muted mt-1 max-w-[260px] mx-auto">
                  {deferredQuery.trim()
                    ? `No items match "${deferredQuery}". Try searching by landmark, street address, or barangay.`
                    : 'No items available in this category.'}
                </p>
                {activeTab !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white bg-[#0052cc] hover:bg-[#003d99] transition-colors"
                  >
                    View All Categories
                  </button>
                )}
              </div>
            ) : (
              displayedItems.map(item => {
                const isSelected = selectedReportId === item.id
                const hasDemoPrefix = typeof item.title === 'string' && item.title.startsWith('[DEMO] ')
                const cleanTitle = hasDemoPrefix ? item.title.replace('[DEMO] ', '') : item.title
                const displayTitle = item.kind === 'Hotspot' && item.nearbyLandmark && !cleanTitle.includes(item.nearbyLandmark)
                  ? `${cleanTitle} • ${item.nearbyLandmark}`
                  : cleanTitle

                return (
                  <button
                    key={`${item.kind}-${item.id}`}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 group border ${
                      isSelected
                        ? 'bg-[#0052cc]/10 border-[#0052cc]/40 text-[#0052cc] dark:text-[#60A5FA]'
                        : 'border-transparent hover:bg-surface hover:border-border text-text-primary'
                    }`}
                  >
                    {/* Kind Icon Badge */}
                    <div className={`p-2 rounded-xl mt-0.5 shrink-0 transition-colors ${
                      item.kind === 'Hotspot'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white'
                        : item.kind === 'Report'
                        ? 'bg-[#0052cc]/15 text-[#0052cc] dark:text-[#60A5FA] group-hover:bg-[#0052cc] group-hover:text-white'
                        : item.kind === 'Task'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white'
                        : 'bg-purple-500/15 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500 group-hover:text-white'
                    }`}>
                      {item.kind === 'Hotspot' && <Flame size={14} />}
                      {item.kind === 'Report' && <MapPin size={14} />}
                      {item.kind === 'Location' && (item.category === 'Address' || item.category === 'Thoroughfare' ? <MapPin size={14} /> : <Building2 size={14} />)}
                      {item.kind === 'Task' && <ClipboardList size={14} />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-semibold text-xs truncate group-hover:text-[#0052cc] dark:group-hover:text-[#60A5FA] transition-colors">
                          {displayTitle}
                        </span>

                        {/* Badges */}
                        {item.kind === 'Hotspot' && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20 shrink-0">
                            {item.report_count} {item.report_count === 1 ? 'report' : 'reports'}
                          </span>
                        )}
                        {item.kind === 'Report' && item.status && (
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold capitalize shrink-0 ${
                            item.status === 'resolved'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : item.status === 'in_progress'
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                              : 'bg-red-500/15 text-red-700 dark:text-red-300'
                          }`}>
                            {item.status.replace(/_/g, ' ')}
                          </span>
                        )}
                        {item.kind === 'Task' && item.status && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold capitalize bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shrink-0">
                            {item.status.replace(/_/g, ' ')}
                          </span>
                        )}
                        {item.kind === 'Location' && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-surface text-text-muted shrink-0">
                            {item.category || (item.isGeocoded ? 'Address' : 'Landmark')}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-text-secondary truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>

                    <ChevronRight size={14} className="text-text-muted mt-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
