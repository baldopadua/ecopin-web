export function normalizeGalleryText(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replaceAll('_', ' ').toLowerCase().replace(/\s+/g, ' ').trim()
}

export function publicReportSearchText(report) {
  return normalizeGalleryText([report.title, report.description, report.issue_type, report.street_address, report.barangay, report.city].filter(value => typeof value === 'string').join(' '))
}

export function matchesGallerySearch(text, query) {
  return normalizeGalleryText(query).split(' ').filter(Boolean).every(term => text.includes(term))
}
