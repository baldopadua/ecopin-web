import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function authorizePreview(req) {
  const deny = (status, error) => NextResponse.json({ error }, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  })
  const authorization = req.headers.get('authorization')
  if (!authorization || !/^Bearer [A-Za-z0-9._~+/-]+=*$/i.test(authorization)) {
    return deny(401, 'Authentication required')
  }

  try {
    // Trust the existing session service, never a decoded JWT or client role.
    const base = process.env.NEXT_PUBLIC_BACKEND_API_URL
    const url = new URL(`${base.replace(/\/$/, '')}/api/auth/me`)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      return deny(503, 'Unable to verify session')
    }
    const response = await fetch(url.href, {
      headers: { Authorization: authorization },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(5000)
    })
    if (response.status === 401) return deny(401, 'Authentication required')
    if (response.status === 403) return deny(403, 'Officer access required')
    if (!response.ok) return deny(503, 'Unable to verify session')

    const { user } = await response.json()
    if (!user || typeof user.id !== 'string' || !user.id.trim() || typeof user.role !== 'string') {
      return deny(503, 'Unable to verify session')
    }
    if (user.role !== 'officer') return deny(403, 'Officer access required')
    return null
  } catch {
    return deny(503, 'Unable to verify session')
  }
}

const parseLocation = (location, latitude, longitude) => {
  if (latitude && longitude) return { latitude, longitude }
  if (!location) return { latitude: null, longitude: null }
  try {
    if (typeof location === 'string' && location.startsWith('{')) {
      const geoJSON = JSON.parse(location)
      if (geoJSON.type === 'Point' && geoJSON.coordinates) {
        return { latitude: geoJSON.coordinates[1], longitude: geoJSON.coordinates[0] }
      }
    } else if (typeof location === 'string') {
      const buffer = Buffer.from(location, 'hex')
      if (buffer.length === 25) {
        const longitude = buffer.readDoubleLE(9)
        const latitude = buffer.readDoubleLE(17)
        return { latitude, longitude }
      }
    }
  } catch (e) {}
  return { latitude: null, longitude: null }
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371.0 // Radius of earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function calculateDetourTimeMinutes(start, end, waypoint, averageSpeedKmh = 30.0) {
  const distDirect = haversineDistance(start.lat, start.lon, end.lat, end.lon)
  const distVia = haversineDistance(start.lat, start.lon, waypoint.lat, waypoint.lon) +
    haversineDistance(waypoint.lat, waypoint.lon, end.lat, end.lon)
  const extraDistKm = Math.max(0, distVia - distDirect)
  return (extraDistKm / averageSpeedKmh) * 60.0
}

function calculatePriorityScore(baseSeverity, createdAtStr, agingFactor, maxEscalationCap) {
  const createdAt = createdAtStr ? new Date(createdAtStr) : new Date()
  const diffMs = Math.max(0, Date.now() - createdAt.getTime())
  const daysUnresolved = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const escalation = Math.min(daysUnresolved * agingFactor, maxEscalationCap)
  return (baseSeverity || 1.0) + escalation
}

function generateTasksNative(payload) {
  const {
    aging_factor = 1.5,
    max_escalation_cap = 10.0,
    max_detour_minutes = 5.0,
    max_detour_time_per_task = 15.0,
    start_location = { lat: 14.561433, lon: 121.075636 },
    clusters = [],
    individual_reports = []
  } = payload

  const allTargets = []

  for (const c of clusters) {
    const score = calculatePriorityScore(c.base_severity, c.created_at, aging_factor, max_escalation_cap)
    allTargets.push({
      ...c,
      priority_score: score,
      is_cluster: true
    })
  }

  const indReports = individual_reports.map(r => ({
    ...r,
    priority_score: calculatePriorityScore(r.base_severity, r.created_at, aging_factor, max_escalation_cap),
    is_cluster: false,
    assigned: false
  }))

  for (const r of indReports) {
    allTargets.push(r)
  }

  // Sort descending by priority score
  allTargets.sort((a, b) => b.priority_score - a.priority_score)

  const tasks = []

  for (const target of allTargets) {
    if (!target.is_cluster && target.assigned) continue

    const task = {
      primary_target_id: target.id,
      primary_target_is_cluster: target.is_cluster,
      primary_priority: target.priority_score,
      target_lat: target.lat,
      target_lon: target.lon,
      included_reports: [],
      cumulative_detour_minutes: 0.0
    }

    if (!target.is_cluster) {
      target.assigned = true
    }

    // Evaluate potential detour reports
    for (const report of indReports) {
      if (!report.assigned) {
        const detourMins = calculateDetourTimeMinutes(
          start_location,
          { lat: target.lat, lon: target.lon },
          { lat: report.lat, lon: report.lon }
        )

        if (detourMins <= max_detour_minutes) {
          if (task.cumulative_detour_minutes + detourMins <= max_detour_time_per_task) {
            task.included_reports.push({
              report_id: report.id,
              detour_time_minutes: detourMins,
              priority_score: report.priority_score
            })
            task.cumulative_detour_minutes += detourMins
            report.assigned = true
          }
        }
      }
    }

    tasks.push(task)
  }

  return tasks
}

export async function POST(req) {
  const denied = await authorizePreview(req)
  if (denied) return denied

  try {
    const body = await req.json()
    const { config = {} } = body

    // Fetch depot from optimization_settings
    let depotLat = 14.561433
    let depotLon = 121.075636
    const { data: depotSetting } = await supabase
      .from('optimization_settings')
      .select('value')
      .eq('key', 'swmo_depot')
      .single()
    if (depotSetting?.value) {
      depotLat = depotSetting.value.latitude || depotLat
      depotLon = depotSetting.value.longitude || depotLon
    }

    // 1. Fetch unresolved/approved reports from Supabase
    let allData = []
    let page = 0
    const pageSize = 1000

    while (true) {
      const { data, error } = await supabase
        .from('public_reports')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) {
        console.error('Supabase error:', error)
        return NextResponse.json({ error: 'Failed to fetch reports: ' + error.message }, { status: 500 })
      }

      allData = [...allData, ...data]
      if (data.length < pageSize) break
      page++
    }

    const eligibleReports = allData.filter(r => 
      r.status === 'unresolved' && 
      r.validation_status === 'approved' &&
      !(r.on_private_property && r.property_owner_consent_status === 'denied')
    )

    const clusters = eligibleReports.filter(r => r.is_cluster)
    const individual_reports = eligibleReports.filter(r => !r.is_cluster)

    const mlPayload = {
      aging_factor: Number(config.aging_factor ?? 1.5),
      max_escalation_cap: Number(config.max_escalation_cap ?? 10.0),
      max_detour_minutes: Number(config.max_detour_minutes ?? 5.0),
      max_detour_time_per_task: Number(config.max_detour_time_per_task ?? 15.0),
      start_location: {
        lat: depotLat,
        lon: depotLon
      },
      clusters: clusters.map(c => {
        const { latitude, longitude } = parseLocation(c.location, c.latitude, c.longitude)
        return {
          id: c.id,
          lat: latitude,
          lon: longitude,
          base_severity: c.severity === 'high' ? 3.0 : c.severity === 'medium' ? 2.0 : 1.0,
          created_at: c.created_at
        }
      }).filter(c => c.lat !== null && c.lon !== null),
      individual_reports: individual_reports.map(r => {
        const { latitude, longitude } = parseLocation(r.location, r.latitude, r.longitude)
        return {
          id: r.id,
          lat: latitude,
          lon: longitude,
          base_severity: r.severity === 'high' ? 3.0 : r.severity === 'medium' ? 2.0 : 1.0,
          created_at: r.created_at
        }
      }).filter(r => r.lat !== null && r.lon !== null)
    }

    let mlData = null

    // Attempt external microservice if running
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2000)
      const mlResponse = await fetch('http://localhost:8000/generate_tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mlPayload),
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      if (mlResponse.ok) {
        mlData = await mlResponse.json()
      }
    } catch (_) {
      // Python microservice offline — fallback to embedded native solver
    }

    if (!mlData || !Array.isArray(mlData.tasks)) {
      mlData = { tasks: generateTasksNative(mlPayload) }
    }

    return NextResponse.json(mlData, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate routes' }, { status: 500 })
  }
}
