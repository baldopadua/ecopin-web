/**
 * Canonical 1-5 citizen satisfaction (CSAT) scale. Mirror: ecopin_app/lib/core/utils/csat_rating_scale.dart.
 * Color runs red -> green so high ratings are never shown with a negative hue.
 */
export const CSAT_SCALE = [
  { rating: 1, emoji: '😢', label: 'Very Dissatisfied', color: '#EF4444' },
  { rating: 2, emoji: '😕', label: 'Dissatisfied', color: '#F59E0B' },
  { rating: 3, emoji: '😐', label: 'Neutral', color: '#9CA3AF' },
  { rating: 4, emoji: '😊', label: 'Satisfied', color: '#3B82F6' },
  { rating: 5, emoji: '😄', label: 'Very Satisfied', color: '#10B981' },
]

export function getCsatEntry(rating) {
  const n = Math.round(Number(rating))
  if (rating == null || rating === '' || !Number.isFinite(n)) return null
  return CSAT_SCALE[Math.min(5, Math.max(1, n)) - 1]
}
