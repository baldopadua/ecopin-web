/**
 * Workload-balanced round-robin crew assignment for auto-generated routes.
 *
 * @param {Array} tasks - Array of generated route tasks.
 * @param {Array} availableCrews - Array of field crews from /api/cleanup-tasks/available-crew.
 * @param {Array} existingTasks - Array of existing cleanup tasks to calculate active workloads.
 * @returns {Array} Tasks with auto-assigned crew IDs and titles.
 */
export function autoAssignCrewsToRoutes(tasks, availableCrews = [], existingTasks = []) {
  if (!Array.isArray(tasks) || tasks.length === 0) return []
  if (!Array.isArray(availableCrews) || availableCrews.length === 0) {
    return tasks.map((task, idx) => ({
      ...task,
      title: `Proposed Cleanup Task #${idx + 1} (${task.primary_target_is_cluster ? 'Cluster' : 'Report'})`,
      assigned_crew_ids: []
    }))
  }

  // Calculate existing active task counts per crew (field_crew_id or assigned_crew_ids)
  const crewWorkload = new Map()
  for (const crew of availableCrews) {
    crewWorkload.set(crew.id, 0)
  }

  for (const activeTask of existingTasks) {
    if (['completed', 'cancelled'].includes(activeTask.status)) continue
    if (activeTask.field_crew_id && crewWorkload.has(activeTask.field_crew_id)) {
      crewWorkload.set(activeTask.field_crew_id, crewWorkload.get(activeTask.field_crew_id) + 1)
    } else if (Array.isArray(activeTask.assigned_crew_ids)) {
      for (const crew of availableCrews) {
        const memberIds = (crew.members || []).map(m => m.id)
        if (activeTask.assigned_crew_ids.some(id => id === crew.id || memberIds.includes(id))) {
          crewWorkload.set(crew.id, crewWorkload.get(crew.id) + 1)
        }
      }
    }
  }

  // Sort crews primarily by available remaining capacity / lowest current workload,
  // and round-robin among eligible crews
  return tasks.map((task, idx) => {
    const sortedCrews = [...availableCrews].sort((a, b) => {
      const loadA = crewWorkload.get(a.id) || 0
      const loadB = crewWorkload.get(b.id) || 0
      const capA = a.max_tasks_per_shift || 10
      const capB = b.max_tasks_per_shift || 10
      // Check remaining capacity first
      const remA = capA - loadA
      const remB = capB - loadB
      if (remA !== remB) return remB - remA // higher remaining capacity first
      return loadA - loadB // otherwise lower load
    })

    const selectedCrew = sortedCrews[0]
    if (selectedCrew) {
      crewWorkload.set(selectedCrew.id, (crewWorkload.get(selectedCrew.id) || 0) + 1)
    }

    return {
      ...task,
      title: `Proposed Cleanup Task #${idx + 1} (${task.primary_target_is_cluster ? 'Cluster' : 'Report'})`,
      assigned_crew_ids: selectedCrew ? [selectedCrew.id] : []
    }
  })
}
