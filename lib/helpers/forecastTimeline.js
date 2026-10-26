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

/**
 * Extract distinct future forecast steps (full horizon + weekly intervals) from features.
 *
 * @param {Array<object>} features
 * @returns {Array<{ index: number, date: string|null, label: string, shortLabel: string }>}
 */
export function extractForecastSteps(features) {
  if (!Array.isArray(features) || features.length === 0) return [];
  const dateSet = new Set();
  for (const f of features) {
    const points = f?.properties?.forecast_points || [];
    for (const pt of points) {
      if (pt?.week_start) {
        dateSet.add(pt.week_start);
      }
    }
  }

  const sortedDates = Array.from(dateSet).sort((a, b) => new Date(a) - new Date(b));
  if (sortedDates.length === 0) return [];

  return [
    {
      index: 0,
      date: null,
      label: 'Full horizon',
      shortLabel: 'All',
    },
    ...sortedDates.map((date, idx) => {
      const formatted = new Date(date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
      return {
        index: idx + 1,
        date,
        label: `Week ${idx + 1} (${formatted})`,
        shortLabel: `+${(idx + 1) * 7}d`,
      };
    }),
  ];
}

/**
 * Adjust feature properties to reflect the projected predictions for a specific future week/step.
 *
 * @param {Array<object>} features
 * @param {string} stepDate
 * @returns {Array<object>}
 */
export function projectFeaturesToStep(features, stepDate) {
  if (!Array.isArray(features) || !stepDate) return features || [];
  return features.map(feature => {
    const points = feature?.properties?.forecast_points || [];
    const match = points.find(p => p.week_start === stepDate);
    if (!match) return feature;

    const predicted = Number(match.predicted_count ?? feature.properties.predicted_count);
    const lower = Number(match.lower_bound ?? 0);
    const upper = Number(match.upper_bound ?? predicted);
    const velocity = Number(feature?.properties?.growth_velocity_percent ?? 0);

    // Weekly step risk assessment scaled from the horizon thresholds (15/mo ≈ 3.5/wk, 5/mo ≈ 1.2/wk)
    let projectedRisk = feature.properties.risk_level;
    if (predicted >= 4 || upper >= 8 || (velocity > 40 && predicted >= 1)) {
      projectedRisk = 'high';
    } else if (predicted >= 1.5 || upper >= 4) {
      projectedRisk = 'medium';
    } else {
      projectedRisk = 'low';
    }

    return {
      ...feature,
      properties: {
        ...feature.properties,
        predicted_count: predicted,
        predicted_lower_bound: lower,
        predicted_upper_bound: upper,
        predicted_lower: lower,
        predicted_upper: upper,
        risk_level: projectedRisk,
        is_future_step: true,
        future_step_date: stepDate,
      },
    };
  });
}
