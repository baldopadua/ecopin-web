export function exploreUrl(mode = 'map', searchParams = {}) {
  const query = searchParams instanceof URLSearchParams ? new URLSearchParams(searchParams) : new URLSearchParams()
  if (!(searchParams instanceof URLSearchParams)) {
    for (const [key, value] of Object.entries(searchParams)) {
      for (const item of Array.isArray(value) ? value : [value]) {
        if (item != null) query.append(key, String(item))
      }
    }
  }
  if (mode === 'gallery') query.set('view', 'gallery')
  else query.delete('view')
  return `/explore${query.size ? `?${query}` : ''}`
}
