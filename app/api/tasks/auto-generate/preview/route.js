import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { checkPreviewQuota } from '@/lib/server/preview-quota.mjs'
import { readBoundedJson } from '@/lib/server/bounded-json.mjs'
import { readWebSession, hasTrustedOrigin } from '@/lib/server/web-session.mjs'
import { reportDiagnostic } from '../../../../../lib/diagnostics.mjs';

async function authorizePreview(req) {
  const deny = (status, error) => NextResponse.json({ error }, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  })
  if (!hasTrustedOrigin(req)) return deny(403, 'Access denied')
  try {
    const session = await readWebSession(req)
    if (!session) return deny(401, 'Authentication required')
    if (session.kind !== 'full') return deny(401, 'Authentication required')
    const authorization = `Bearer ${session.accessToken}`
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
    return { id: user.id }
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

async function readPreviewConfig(req) {
  const invalid = (status, error) => ({ status, error })
  if (req.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return invalid(415, 'Content-Type must be application/json')
  }
  const deadline = AbortSignal.any([AbortSignal.timeout(2000), ...(req.signal ? [req.signal] : [])])
  let body
  try {
    body = await readBoundedJson(req.body, 4096, deadline)
  } catch (error) {
    if (deadline.aborted) return invalid(408, 'Request body timed out or was cancelled')
    if (error instanceof RangeError) return invalid(413, 'Request body exceeds 4096 bytes')
    return invalid(400, 'Invalid JSON body')
  }
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  if (!isObject(body) || Object.keys(body).some(key => key !== 'config')) {
    return invalid(400, 'Expected an object containing only config')
  }
  const config = Object.hasOwn(body, 'config') ? body.config : {}
  // Web preview policy: points/day, escalation points, detour limits, and upper bounds on route length/duration.
  const settings = {
    aging_factor: [1.5, 100],
    max_escalation_cap: [10, 1000],
    max_detour_minutes: [5, 1440],
    max_detour_time_per_task: [15, 1440],
    max_route_distance_km: [50, 500],
    max_route_duration_minutes: [480, 1440]
  }
  if (!isObject(config) || Object.keys(config).some(key => !Object.hasOwn(settings, key))) {
    return invalid(400, 'Config must be an object containing only supported settings')
  }
  const validated = {}
  for (const [key, [fallback, maximum]] of Object.entries(settings)) {
    const value = Object.hasOwn(config, key) ? config[key] : fallback
    if (!Number.isFinite(value) || value < 0 || value > maximum) {
      return invalid(400, `Invalid config.${key}: expected a number between 0 and ${maximum}`)
    }
    validated[key] = value
  }
  return { config: validated }
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

export function mapSeverityToBaseScore(report) {
  if (!report) return 1.0
  const level = (report.severity_level || '').toLowerCase().trim()
  if (level === 'critical' || level === 'high' || report.status === 'urgent') return 3.0
  if (level === 'medium') return 2.0
  if (level === 'low') return 1.0

  const score = Number(report.severity_score)
  if (Number.isFinite(score)) {
    if (score >= 2.5) return 3.0
    if (score >= 1.5) return 2.0
    if (score > 0) return 1.0
  }
  return 1.0
}

export function generateTasksNative(payload) {
  const {
    aging_factor = 1.5,
    max_escalation_cap = 10.0,
    max_detour_minutes = 5.0,
    max_detour_time_per_task = 15.0,
    max_route_distance_km = 50.0,
    max_route_duration_minutes = 480.0,
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

    // Base direct round-trip distance from depot/start_location to primary target
    const directDistanceKm = haversineDistance(start_location.lat, start_location.lon, target.lat, target.lon) * 2
    // If even the direct trip exceeds the route distance limit, skip or clamp
    if (max_route_distance_km != null && directDistanceKm > max_route_distance_km) {
      continue
    }

    const task = {
      primary_target_id: target.id,
      primary_target_is_cluster: target.is_cluster,
      primary_priority: target.priority_score,
      target_lat: target.lat,
      target_lon: target.lon,
      included_reports: target.is_cluster
        ? (target.report_ids || []).map(rid => ({
            report_id: rid,
            detour_time_minutes: 0.0,
            priority_score: target.priority_score
          }))
        : [],
      cumulative_detour_minutes: 0.0,
      estimated_distance_km: Math.round(directDistanceKm * 10) / 10
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

        const distVia = haversineDistance(start_location.lat, start_location.lon, report.lat, report.lon) +
          haversineDistance(report.lat, report.lon, target.lat, target.lon) +
          haversineDistance(target.lat, target.lon, start_location.lat, start_location.lon)

        const extraDistKm = Math.max(0, distVia - directDistanceKm)
        const projectedRouteDistance = directDistanceKm + (task.cumulative_detour_minutes > 0 ? (task.cumulative_detour_minutes / 60) * 30 : 0) + extraDistKm
        const projectedRouteDuration = (projectedRouteDistance / 30) * 60 + 30 // 30 min base service time

        if (detourMins <= max_detour_minutes &&
            task.cumulative_detour_minutes + detourMins <= max_detour_time_per_task &&
            (max_route_distance_km == null || projectedRouteDistance <= max_route_distance_km) &&
            (max_route_duration_minutes == null || projectedRouteDuration <= max_route_duration_minutes)) {
          task.included_reports.push({
            report_id: report.id,
            detour_time_minutes: detourMins,
            priority_score: report.priority_score
          })
          task.cumulative_detour_minutes += detourMins
          task.estimated_distance_km = Math.round((task.estimated_distance_km + extraDistKm) * 10) / 10
          report.assigned = true
        }
      }
    }

    tasks.push(task)
  }

  return tasks
}

export function validateAndSanitizeTasks(tasks, authorizedTargets, authorizedReportIds) {
  if (!Array.isArray(tasks) || tasks.length > 500) return null
  const sanitized = []

  for (const raw of tasks) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

    const primaryTargetId = raw.primary_target_id
    if (typeof primaryTargetId !== 'string' || !authorizedTargets.has(primaryTargetId)) {
      return null
    }

    const targetInfo = authorizedTargets.get(primaryTargetId)
    const isCluster = Boolean(raw.primary_target_is_cluster)
    if (isCluster !== targetInfo.is_cluster) {
      return null
    }

    const primaryPriority = Number(raw.primary_priority)
    if (!Number.isFinite(primaryPriority) || primaryPriority < 0) return null

    const targetLat = Number(raw.target_lat)
    const targetLon = Number(raw.target_lon)
    if (!Number.isFinite(targetLat) || targetLat < -90 || targetLat > 90) return null
    if (!Number.isFinite(targetLon) || targetLon < -180 || targetLon > 180) return null

    const detourMins = Number(raw.cumulative_detour_minutes ?? 0)
    if (!Number.isFinite(detourMins) || detourMins < 0) return null

    if (!Array.isArray(raw.included_reports)) return null

    const sanitizedIncluded = []
    for (const item of raw.included_reports) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const reportId = item.report_id
      if (typeof reportId !== 'string' || !authorizedReportIds.has(reportId)) return null

      const detour = Number(item.detour_time_minutes ?? 0)
      const priority = Number(item.priority_score ?? 0)
      if (!Number.isFinite(detour) || detour < 0) return null
      if (!Number.isFinite(priority) || priority < 0) return null

      sanitizedIncluded.push({
        report_id: reportId,
        detour_time_minutes: detour,
        priority_score: priority
      })
    }

    sanitized.push({
      primary_target_id: primaryTargetId,
      primary_target_is_cluster: isCluster,
      primary_priority: primaryPriority,
      target_lat: targetLat,
      target_lon: targetLon,
      included_reports: sanitizedIncluded,
      cumulative_detour_minutes: detourMins
    })
  }

  return sanitized
}

function previewFailure(status, message, error) {
  const eventId = reportDiagnostic('error', 'dispatch', status, error)
  return NextResponse.json({ error: message, eventId }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req) {
  try {
    const authorization = await authorizePreview(req)
    if (authorization instanceof Response) return authorization
    const quota = await checkPreviewQuota(authorization.id, req.signal)
    if (req.signal?.aborted) return NextResponse.json({ error: 'Request cancelled' }, { status: 408, headers: { 'Cache-Control': 'no-store' } })
    if (quota.status !== 200) {
      return NextResponse.json({ error: quota.status === 429 ? 'Preview limit reached. Please try again later.' : 'Preview is temporarily unavailable' }, {
        status: quota.status, headers: { 'Cache-Control': 'no-store', ...(quota.retryAfter ? { 'Retry-After': String(quota.retryAfter) } : {}) }
      })
    }
    const input = await readPreviewConfig(req)
    if (input.error) {
      return NextResponse.json({ error: input.error }, { status: input.status, headers: { 'Cache-Control': 'no-store' } })
    }
    const { config } = input

    // Fetch depot from optimization_settings
    let depotLat = 14.561433
    let depotLon = 121.075636
    const depotDeadline = AbortSignal.any([AbortSignal.timeout(3000), ...(req.signal ? [req.signal] : [])])
    const { data: depotSetting } = await supabase
      .from('optimization_settings')
      .select('value')
      .eq('key', 'swmo_depot')
      .abortSignal(depotDeadline)
      .single()
    if (depotDeadline.aborted) return previewFailure(req.signal?.aborted ? 408 : 504, 'Settings request timed out or was cancelled')
    if (depotSetting?.value) {
      depotLat = depotSetting.value.latitude || depotLat
      depotLon = depotSetting.value.longitude || depotLon
    }

    const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_API_URL || '').replace(/\/$/, '')
    const authHeader = req.headers.get('authorization') || ''

    const [tasksRes, blocksRes] = await Promise.all([
      fetch(`${backendUrl}/api/cleanup-tasks`, {
        headers: { Authorization: authHeader },
        cache: 'no-store'
      }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${backendUrl}/api/optimization/blocks`, {
        headers: { Authorization: authHeader },
        cache: 'no-store'
      }).then(r => r.ok ? r.json() : []).catch(() => [])
    ])

    const activeTasks = Array.isArray(tasksRes) ? tasksRes.filter(t => !['completed', 'cancelled'].includes(t.status)) : []
    const claimedReportIds = new Set(activeTasks.flatMap(t => t.report_ids || []))
    const blockedClusterIds = new Set(Array.isArray(blocksRes) ? blocksRes.map(b => b.cluster_id).filter(Boolean) : [])
    const blockedReportIds = new Set(Array.isArray(blocksRes) ? blocksRes.map(b => b.report_id).filter(Boolean) : [])

    const reportDeadline = AbortSignal.any([AbortSignal.timeout(3000), ...(req.signal ? [req.signal] : [])])
    const { data, error } = await supabase
      .from('public_reports')
      .select('id,status,validation_status,created_at,latitude,longitude,location,cluster_id,severity_score,severity_level')
      .eq('status', 'unresolved')
      .eq('validation_status', 'approved')
      .abortSignal(reportDeadline)
      .range(0, 500)

    if (error || reportDeadline.aborted) {
      return previewFailure(req.signal?.aborted ? 408 : reportDeadline.aborted ? 504 : 500, 'Unable to fetch reports', error)
    }
    if (data.length > 500) {
      return NextResponse.json({ error: 'Too many eligible reports for preview. Use the dispatch planner.' }, { status: 422, headers: { 'Cache-Control': 'no-store' } })
    }

    const eligibleReports = data.filter(r =>
      r.status === 'unresolved' && 
      r.validation_status === 'approved' &&
      !claimedReportIds.has(r.id) &&
      !blockedReportIds.has(r.id) &&
      !(r.cluster_id && blockedClusterIds.has(r.cluster_id))
    )

    // Group reports by cluster_id if assigned to a cluster, otherwise treat as individual
    const clusterMap = new Map()
    const individualReports = []

    for (const report of eligibleReports) {
      const { latitude, longitude } = parseLocation(report.location, report.latitude, report.longitude)
      if (latitude === null || longitude === null) continue

      const baseSeverity = mapSeverityToBaseScore(report)

      if (report.cluster_id && typeof report.cluster_id === 'string' && report.cluster_id.trim()) {
        const clusterId = report.cluster_id.trim()
        if (!clusterMap.has(clusterId)) {
          clusterMap.set(clusterId, {
            id: clusterId,
            reports: [],
            created_at: report.created_at,
            max_severity: baseSeverity
          })
        }
        const cluster = clusterMap.get(clusterId)
        cluster.reports.push({ id: report.id, lat: latitude, lon: longitude })
        if (baseSeverity > cluster.max_severity) {
          cluster.max_severity = baseSeverity
        }
        if (report.created_at && (!cluster.created_at || new Date(report.created_at) < new Date(cluster.created_at))) {
          cluster.created_at = report.created_at
        }
      } else {
        individualReports.push({
          id: report.id,
          lat: latitude,
          lon: longitude,
          base_severity: baseSeverity,
          created_at: report.created_at
        })
      }
    }

    const clusterTargets = []
    for (const [clusterId, clusterData] of clusterMap.entries()) {
      const count = clusterData.reports.length
      const avgLat = clusterData.reports.reduce((sum, r) => sum + r.lat, 0) / count
      const avgLon = clusterData.reports.reduce((sum, r) => sum + r.lon, 0) / count
      clusterTargets.push({
        id: clusterId,
        lat: avgLat,
        lon: avgLon,
        base_severity: clusterData.max_severity,
        created_at: clusterData.created_at,
        report_ids: clusterData.reports.map(r => r.id)
      })
    }

    const mlPayload = {
      ...config,
      aging_factor: Number(config.aging_factor ?? 1.5),
      max_escalation_cap: Number(config.max_escalation_cap ?? 10.0),
      max_detour_minutes: Number(config.max_detour_minutes ?? 5.0),
      max_detour_time_per_task: Number(config.max_detour_time_per_task ?? 15.0),
      max_route_distance_km: config.max_route_distance_km != null ? Number(config.max_route_distance_km) : 50.0,
      max_route_duration_minutes: config.max_route_duration_minutes != null ? Number(config.max_route_duration_minutes) : 480.0,
      start_location: {
        lat: depotLat,
        lon: depotLon
      },
      clusters: clusterTargets,
      individual_reports: individualReports
    }

    // Build sets of authorized target IDs and report IDs for result validation
    const authorizedTargets = new Map()
    const authorizedReportIds = new Set()

    for (const c of clusterTargets) {
      authorizedTargets.set(c.id, { is_cluster: true })
      for (const rid of c.report_ids) {
        authorizedReportIds.add(rid)
      }
    }
    for (const r of individualReports) {
      authorizedTargets.set(r.id, { is_cluster: false })
      authorizedReportIds.add(r.id)
    }

    let mlData = null

    // Attempt external microservice if running
    try {
      const deadline = AbortSignal.any([AbortSignal.timeout(2000), ...(req.signal ? [req.signal] : [])])
      const mlResponse = await fetch('http://localhost:8000/generate_tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mlPayload),
        signal: deadline
      })
      if (mlResponse.ok) {
        mlData = await readBoundedJson(mlResponse.body, 512 * 1024, deadline)
      }
    } catch (_) {
      // Python microservice offline — fallback to embedded native solver
    }

    if (req.signal?.aborted) return NextResponse.json({ error: 'Request cancelled' }, { status: 408, headers: { 'Cache-Control': 'no-store' } })

    let validatedTasks = mlData?.tasks ? validateAndSanitizeTasks(mlData.tasks, authorizedTargets, authorizedReportIds) : null
    if (!validatedTasks) {
      const nativeTasks = generateTasksNative(mlPayload)
      validatedTasks = validateAndSanitizeTasks(nativeTasks, authorizedTargets, authorizedReportIds) || []
    }

    return NextResponse.json({ tasks: validatedTasks }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return previewFailure(500, 'Failed to generate routes', error)
  }
}
