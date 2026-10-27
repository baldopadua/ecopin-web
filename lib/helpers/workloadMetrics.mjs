/**
 * Computes workload distribution metrics for routes, ensuring robust calculation
 * of total duration, task count, distance, spread, team average, and dynamic chart scale.
 */
export const CREW_COLORS = ['#0052CC', '#60A5FA', '#EF4444', '#F9A825', '#8B5CF6']

export function calculateWorkloadMetrics(routes = []) {
  if (!routes || routes.length === 0) {
    return {
      metrics: [],
      maxVal: 0,
      minVal: 0,
      totalVal: 0,
      avgVal: 0,
      spread: 0,
      chartMax: 480,
      ticks: [480, 360, 240, 120]
    }
  }

  const metrics = routes.map((r, i) => {
    const dur = Number(r.total_duration_min) || 
      Number(r.durationMinutes) || 
      (Number(r.task_count) * 25) || 
      ((r.waypoints?.filter(w => w.cleanup_task_id || (w.waypoint_type && w.waypoint_type !== 'depot_start' && w.waypoint_type !== 'depot_end'))?.length || 0) * 25) || 
      0

    const tasks = Number(r.task_count) || 
      (r.stops?.length) || 
      (r.waypoints?.filter(w => w.cleanup_task_id || (w.waypoint_type && w.waypoint_type !== 'depot_start' && w.waypoint_type !== 'depot_end'))?.length) || 
      0

    const dist = Number(r.total_distance_meters) || 
      Number(r.distanceMeters) || 
      (r.waypoints?.reduce((sum, w) => sum + (Number(w.distance_from_previous_meters) || 0), 0)) || 
      0

    const crewName = r.field_crews?.name || r.crewName || `Crew ${i + 1}`
    const color = r.color || CREW_COLORS[i % CREW_COLORS.length]

    return { 
      dur, 
      tasks, 
      dist, 
      crewName, 
      color, 
      key: r.id || r.crewId || r.vehicle_id || `workload-${i}` 
    }
  })

  const durations = metrics.map(m => m.dur)
  const maxVal = Math.max(...durations, 0)
  const minVal = Math.min(...durations)
  const totalVal = durations.reduce((sum, d) => sum + d, 0)
  const avgVal = Math.round(totalVal / Math.max(1, metrics.length))
  const spread = maxVal - minVal

  // Determine an intelligent Y-axis ceiling based on operational shift benchmarks
  let chartMax = 480 // 8h standard shift
  if (maxVal <= 60) {
    chartMax = 60
  } else if (maxVal <= 120) {
    chartMax = 120
  } else if (maxVal <= 240) {
    chartMax = 240
  } else if (maxVal <= 360) {
    chartMax = 360
  } else if (maxVal <= 480) {
    chartMax = 480
  } else {
    chartMax = Math.ceil(maxVal / 60) * 60
  }

  const ticks = [
    chartMax, 
    Math.round(chartMax * 0.75), 
    Math.round(chartMax * 0.5), 
    Math.round(chartMax * 0.25)
  ]

  return {
    metrics,
    maxVal,
    minVal,
    totalVal,
    avgVal,
    spread,
    chartMax,
    ticks
  }
}
