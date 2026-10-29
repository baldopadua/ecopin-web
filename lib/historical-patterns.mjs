export const PATTERN_LABELS = {
  chronic:'Chronic corridor candidate', transient_spike:'Observed transient spike', recent_spike:'Recent activity spike',
  recent_concentration:'Recent concentration', intermittent:'Intermittent activity', historical_only:'Historical concentration', mixed_membership:'Mixed historical groups',
};
export const patternLabel = key => PATTERN_LABELS[key] || 'Unclassified';
export const patternColor = key => ({ chronic:'#a84722', transient_spike:'#6653ad', recent_spike:'#bd6500', recent_concentration:'#2377a0', historical_only:'#687378', intermittent:'#47836c' }[key] || '#687378');
export function readPatternResponse(payload) {
  const r = payload?.data;
  if (r?.schema_version !== 'historical-dbscan-v1' || !Number.isFinite(Date.parse(r.generated_at)) || !Array.isArray(r.barangays) || r.barangays.length !== 30
    || !Array.isArray(r.patterns) || !r.quality || !r.params || !['7d','30d','90d'].every(k => r.windows?.[k]?.geojson?.type === 'FeatureCollection'
      && Array.isArray(r.windows[k].geojson.features) && r.forecasts?.[k]?.barangays
      && r.barangays.every(b => r.forecasts[k].barangays[b.psgc_code]?.historical_points?.length === 52))) throw new Error('Historical analysis returned incomplete data.');
  return r;
}
