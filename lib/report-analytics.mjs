// Group local creation dates into calendar weeks, including the week year.
export function creationWeekKey(date) {
  if (!Number.isFinite(date.getTime())) return null
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7))
  const year = day.getUTCFullYear()
  const firstDay = new Date(Date.UTC(year, 0, 1))
  const week = Math.ceil(((day - firstDay) / 86400000 + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}
