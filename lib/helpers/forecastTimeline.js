/**
 * Filter available prediction snapshot dates so timeline slider and playback
 * only step across dates with actual snapshot records.
 *
 * Skips falsy, invalid date strings, and dateless days, deduplicates,
 * and sorts chronologically.
 *
 * @param {Array<string|object>} dates
 * @returns {Array<string>}
 */
export function filterAvailableSnapshotDates(dates) {
  if (!Array.isArray(dates)) return [];
  const valid = dates
    .filter(date => {
      if (!date) return false;
      const str = typeof date === 'string' ? date.trim() : (date?.prediction_date || date?.date || '');
      if (!str) return false;
      const d = new Date(str);
      return !isNaN(d.getTime());
    })
    .map(date => (typeof date === 'string' ? date.trim() : (date?.prediction_date || date?.date)));

  return Array.from(new Set(valid)).sort((a, b) => new Date(a) - new Date(b));
}

/**
 * Calculates the next snapshot date during historical playback,
 * skipping dateless days and looping to the earliest snapshot date.
 *
 * @param {Array<string>} dates
 * @param {string|null} currentDate
 * @returns {string|null}
 */
export function getNextSnapshotDate(dates, currentDate) {
  const validDates = filterAvailableSnapshotDates(dates);
  if (validDates.length === 0) return null;
  const current = validDates.indexOf(currentDate);
  const nextIndex = current >= 0 && current < validDates.length - 1 ? current + 1 : 0;
  return validDates[nextIndex];
}
