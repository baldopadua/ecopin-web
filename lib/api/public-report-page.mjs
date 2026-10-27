export const PUBLIC_REPORT_FIELDS = 'id,title,description,issue_type,status,cluster_id,created_at,updated_at,stage,is_overdue,severity_score,severity_level,lifecycle_state,breached_at,validation_status,location,latitude,longitude,location_precision,street_address,barangay,city';

export async function fetchPublicReportById(db, id, signal) {
  signal?.throwIfAborted();
  if (typeof id !== 'string' || !id.trim()) return null;
  let query = db.from('public_reports').select(PUBLIC_REPORT_FIELDS).eq('id', id).neq('validation_status', 'manual_review').limit(1);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  signal?.throwIfAborted();
  const report = data?.[0];
  const validation = (report?.validation_status || '').toLowerCase().trim();
  if (validation === 'manual_review' || validation === 'pending' || validation === 'rejected') return null;
  const stage = (report?.stage || '').toLowerCase().trim();
  return report && (['approved', 'validated', 'verified'].includes(validation) || stage === 'verified') ? report : null;
}

export async function fetchPublicReportPage(db, {bounds, limit = 200, status = 'all', issueType = 'all', signal} = {}) {
  if (!bounds || !['south','north','west','east'].every(key => Number.isFinite(bounds[key])) ||
      bounds.south < -90 || bounds.north > 90 || bounds.south > bounds.north ||
      !Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new RangeError('A valid map viewport and a limit from 1 to 500 are required');
  }
  signal?.throwIfAborted();
  let query = db.from('public_reports').select(PUBLIC_REPORT_FIELDS)
    .neq('validation_status', 'manual_review')
    .gte('latitude', bounds.south).lte('latitude', bounds.north);
  if (Math.abs(bounds.east - bounds.west) < 360) {
    const wrap = longitude => longitude >= -180 && longitude <= 180
      ? longitude : ((longitude + 180) % 360 + 360) % 360 - 180;
    const west = wrap(bounds.west), east = wrap(bounds.east);
    query = west > east
      ? query.or(`longitude.gte.${west},longitude.lte.${east}`)
      : query.gte('longitude', west).lte('longitude', east);
  }
  if (status !== 'all') query = query.eq('status', status);
  if (issueType !== 'all') query = query.eq('issue_type', issueType);
  query = query.order('created_at', {ascending:false}).order('id', {ascending:false}).limit(limit + 1);
  if (signal) query = query.abortSignal(signal);
  const {data, error} = await query;
  if (error) throw error;
  signal?.throwIfAborted();
  return {reports:(data || []).slice(0,limit),hasMore:(data || []).length > limit};
}
