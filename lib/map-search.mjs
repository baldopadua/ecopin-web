import { normalizeGalleryText, matchesGallerySearch } from './public-gallery.mjs'

export const MAP_LOCATIONS = [
  { name: 'Pasig City (All)', lat: 14.5802, lng: 121.0850 },
  { name: 'Ortigas Center', lat: 14.5862, lng: 121.0610 },
  { name: 'San Antonio', lat: 14.5815, lng: 121.0645 },
  { name: 'Kapasigan Plaza', lat: 14.5595, lng: 121.0805 },
  { name: 'Ugong North', lat: 14.5910, lng: 121.0760 },
  { name: 'Rosario / Tramo', lat: 14.5875, lng: 121.0920 },
  { name: 'Maybunga Riverbank', lat: 14.5775, lng: 121.0965 },
]

export function findMapResults(items, query) {
  if (!query.trim()) return []
  return items.filter(item => matchesGallerySearch(normalizeGalleryText([item.id, item.title, item.description, item.issue_type, item.address, item.nearby_landmark].filter(value => typeof value === 'string' || typeof value === 'number').join(' ')), query))
}
