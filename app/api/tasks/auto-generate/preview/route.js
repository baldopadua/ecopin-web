import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

export async function POST(req) {
  try {
    const body = await req.json()
    const { config } = body

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
        .from('reports_view')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) {
        console.error('Supabase error:', error)
        return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
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

    // Separate into clusters and individual reports based on is_cluster
    // (Assuming is_cluster exists, otherwise all are individual)
    const clusters = eligibleReports.filter(r => r.is_cluster)
    const individual_reports = eligibleReports.filter(r => !r.is_cluster)

    // 2. Call the FastAPI ML Model
    const mlPayload = {
      aging_factor: config.aging_factor,
      max_escalation_cap: config.max_escalation_cap,
      max_detour_minutes: config.max_detour_minutes,
      max_detour_time_per_task: config.max_detour_time_per_task,
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

    // Default to localhost:8000 for the FastAPI server
    const mlResponse = await fetch('http://localhost:8000/generate_tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mlPayload)
    })

    if (!mlResponse.ok) {
      const err = await mlResponse.text()
      console.error('ML API Error:', err)
      return NextResponse.json({ error: 'ML Model Error' }, { status: 500 })
    }

    const mlData = await mlResponse.json()
    return NextResponse.json(mlData)

  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
