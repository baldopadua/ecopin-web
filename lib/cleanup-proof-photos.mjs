// Cleanup proof photos are reviewed one by one: each Before/After photo has its own hidden areas.
export const MAX_PROOF_PHOTOS = 5

// Photos the source holds for a slot. A source without lists exposes only its first photo.
export function photoCount(source, slot) {
  const list = source?.[`${slot}_urls`]
  const count = Array.isArray(list) ? list.length : source?.[`${slot}_url`] ? 1 : 0
  return Math.min(count, MAX_PROOF_PHOTOS)
}

// Per-photo hidden areas from a stored review. Single-photo reviews are stored as a flat list;
// a shape that does not match the current photos starts empty rather than hiding the wrong areas.
export function redactionsPerPhoto(stored, count) {
  const empty = () => Array.from({ length: count }, () => [])
  if (!Array.isArray(stored) || stored.length === 0) return empty()
  const nested = stored.every(Array.isArray) ? stored : count === 1 ? [stored] : null
  return nested && nested.length === count ? nested : empty()
}

export function reviewState(source) {
  const counts = { before: photoCount(source, 'before'), after: photoCount(source, 'after') }
  const stored = source?.existing_redactions
  return {
    counts,
    regions: { before: redactionsPerPhoto(stored?.before, counts.before), after: redactionsPerPhoto(stored?.after, counts.after) },
    ready: { before: Array(counts.before).fill(false), after: Array(counts.after).fill(false) },
  }
}

export const allPhotosReady = (ready) => ['before', 'after'].every(slot => ready[slot].length > 0 && ready[slot].every(Boolean))

// Public delivery: indexed endpoints, or the first photo for a response that predates the lists.
export function publicPhotoUrls(proof, slot) {
  const list = proof?.[`${slot}_urls`]
  if (Array.isArray(list) && list.length) return list.slice(0, MAX_PROOF_PHOTOS)
  return proof?.[`${slot}_url`] ? [proof[`${slot}_url`]] : []
}
