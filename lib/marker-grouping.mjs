// Web-Mercator pixel position of a coordinate at a zoom level (256px tiles).
export function mercatorPixel(lat, lng, zoom) {
  const scale = 256 * 2 ** zoom
  const sin = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999)
  return { x: ((lng + 180) / 360) * scale, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale }
}

// Groups items whose pins would land in the same screen-pixel cell. Items with no finite position, and
// items in `keepSingle`, always stay single so a selected or searched report is never hidden in a group.
// Returns [{ key, items, lat, lng }]; groups of one are plain pins.
export function groupNearbyMarkers(items, { zoom, cellSize = 56, getPosition, getId, keepSingle = new Set() }) {
  const cells = new Map()
  const groups = []
  for (const item of items) {
    const [lat, lng] = getPosition(item)
    const id = getId(item)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || keepSingle.has(id)) {
      groups.push({ key: `single:${id}`, items: [item], lat, lng })
      continue
    }
    const { x, y } = mercatorPixel(lat, lng, zoom)
    const cell = `${Math.floor(x / cellSize)}:${Math.floor(y / cellSize)}`
    let group = cells.get(cell)
    if (!group) {
      group = { key: `cell:${cell}`, items: [], sumLat: 0, sumLng: 0 }
      cells.set(cell, group)
      groups.push(group)
    }
    group.items.push(item)
    group.sumLat += lat
    group.sumLng += lng
  }
  return groups.map(group => group.sumLat === undefined ? group : {
    key: group.items.length === 1 ? `single:${getId(group.items[0])}` : group.key,
    items: group.items,
    lat: group.sumLat / group.items.length,
    lng: group.sumLng / group.items.length,
  })
}
