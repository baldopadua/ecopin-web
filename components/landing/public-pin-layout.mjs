// Mirrors PublicMap's cluster IDs, rounded-coordinate groups and zoom-dependent
// radial separation. Stable ID order keeps pins in place when query rows reorder.
export function layoutPublicPins(reports, zoom) {
  const groups = new Map()
  for (const report of reports) {
    if (!Number.isFinite(report.latitude) || !Number.isFinite(report.longitude)) continue
    const key = report.cluster_id ? `cluster_${report.cluster_id}` : `coord_${report.latitude.toFixed(4)},${report.longitude.toFixed(4)}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(report)
  }
  return [...groups.entries()].flatMap(([key, members]) => {
    members.sort((a, b) => String(a.id).localeCompare(String(b.id)))
    if (members.length > 1 && zoom <= 14) {
      const center = [members.reduce((sum, report) => sum + report.latitude, 0) / members.length, members.reduce((sum, report) => sum + report.longitude, 0) / members.length]
      return [{ key, report: members[0], position: center, members, isCluster: true }]
    }
    return members.map((report, index) => {
      const original = [report.latitude, report.longitude]
      const radius = members.length > 1 && zoom > 14 ? 0.00035 * Math.pow(2, 16 - zoom) : 0
      const angle = index / members.length * Math.PI * 2
      return { key: report.id, report, members: [report], original, position: [report.latitude + Math.sin(angle) * radius, report.longitude + Math.cos(angle) * radius], isCluster: false, separated: radius > 0 }
    })
  })
}
