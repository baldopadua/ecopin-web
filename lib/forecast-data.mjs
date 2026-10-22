const polygon = geometry => ['Polygon', 'MultiPolygon'].includes(geometry?.type) && Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0;

// Never reconstruct a forecast boundary from a centroid or reuse legacy clusters.
export function normalizeForecast(payload) {
  if (!payload) return null;
  const records = Array.isArray(payload) ? payload : null;
  const features = records ? records.filter(record => record?.zone_id).map(record => {
    let geometry = record.geojson_polygon;
    if (typeof geometry === 'string') {
      try { geometry = JSON.parse(geometry); } catch { geometry = null; }
    }
    return { type: 'Feature', geometry, properties: record };
  }) : payload.geojson?.features || [];
  const valid = features.filter(feature => feature?.properties?.zone_id && polygon(feature.geometry)).map(feature => ({
    ...feature,
    properties: { ...feature.properties,
      center_lat: feature.properties.center_lat ?? feature.properties.region_center_lat,
      center_lng: feature.properties.center_lng ?? feature.properties.region_center_lng },
  }));
  const metadata = records ? records[0] || {} : payload;
  return { ...metadata,
    region_analyses: Object.fromEntries(valid.map(feature => [feature.properties.zone_id, feature.properties])),
    geojson: { type: 'FeatureCollection', features: valid },
    heatmap_geojson: records ? null : payload.heatmap_geojson || null,
  };
}

export function buildTrendSeries(zone) {
  const point = (row, value) => ({ date: row.week_start, time: Date.parse(row.week_start), value: Number(value) });
  const actual = (zone.historical_points || []).map(row => point(row, row.actual_count)).filter(row => Number.isFinite(row.time) && Number.isFinite(row.value)).slice(-13);
  const projected = (zone.forecast_points || []).map(row => ({ ...point(row, row.predicted_count), lower: Number(row.lower_bound), upper: Number(row.upper_bound) }))
    .filter(row => [row.time, row.value, row.lower, row.upper].every(Number.isFinite));
  return { actual, projected };
}

export const forecastDate = value => value ? new Date(value).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }) : 'Unavailable';

export function manilaDayRange(now = new Date()) {
  const date = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  return { start: new Date(`${date}T00:00:00+08:00`).toISOString(), end: now.toISOString() };
}

export function observedReportPoints(reports, now = new Date()) {
  const { start, end } = manilaDayRange(now);
  return { type: 'FeatureCollection', features: reports.filter(report => {
    const stamp = Date.parse(report.created_at);
    return stamp >= Date.parse(start) && stamp <= Date.parse(end) && Number.isFinite(report.location_lat) && Math.abs(report.location_lat) <= 90
      && Number.isFinite(report.location_lng) && Math.abs(report.location_lng) <= 180;
  }).map(report => ({ type: 'Feature', id: report.id, geometry: { type: 'Point', coordinates: [report.location_lng, report.location_lat] },
    properties: { intensity: 1, title: report.title, issue_type: report.issue_type, created_at: report.created_at, center_lat: report.location_lat, center_lng: report.location_lng } })) };
}

export function labelForecastAreas(features) {
  const ids = features.map(feature => String(feature.properties.zone_id)).sort();
  const numbers = new Map(ids.map((id, index) => [id, String(index + 1).padStart(2, '0')]));
  return features.map(feature => ({ ...feature, properties: { ...feature.properties,
    display_name: !feature.properties.zone_name || /^Pasig study grid /i.test(feature.properties.zone_name)
      ? `Area ${numbers.get(String(feature.properties.zone_id))}` : feature.properties.zone_name,
  } }));
}

export function filterForecastAreas(features, risk = 'all', query = '') {
  const search = query.trim().toLocaleLowerCase();
  return features.filter(({ properties: zone }) => (risk === 'all' || (risk === 'rising' ? zone.growth_velocity_percent > 0 : zone.risk_level === risk))
    && `${zone.display_name} ${zone.zone_name} ${zone.zone_id}`.toLocaleLowerCase().includes(search))
    .sort((a, b) => (b.properties.risk_score || 0) - (a.properties.risk_score || 0) || (b.properties.predicted_count || 0) - (a.properties.predicted_count || 0));
}

export function summarizeForecast(features) {
  const sumSeries = (key, valueKey) => {
    const counts = new Map();
    for (const { properties } of features) for (const point of properties[key] || []) {
      if (Number.isFinite(Date.parse(point.week_start)) && Number.isFinite(point[valueKey])) counts.set(point.week_start, (counts.get(point.week_start) || 0) + point[valueKey]);
    }
    return [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
  };
  return { total: features.reduce((sum, feature) => sum + (feature.properties.predicted_count || 0), 0),
    high: features.filter(feature => feature.properties.risk_level === 'high').length,
    rising: features.filter(feature => feature.properties.growth_velocity_percent > 0).length,
    areas: features.length, actual: sumSeries('historical_points', 'actual_count').slice(-13), projected: sumSeries('forecast_points', 'predicted_count') };
}
