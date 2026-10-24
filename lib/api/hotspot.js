import { rateLimitedFetch } from '../rateLimiter.js'
import { reportDiagnostic } from '../diagnostics.mjs';
import { supabase } from '../supabase.js';
import { manilaDayRange } from '../forecast-data.mjs';


// Hotspot Forecasting API Client
const getApiBase = () => process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:4002';

export async function getTodayReportLocations({ signal } = {}) {
  const { start, end } = manilaDayRange();
  const reports = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from('public_reports').select('id,title,issue_type,created_at,location_lat,location_lng')
      .gte('created_at', start).lte('created_at', end).order('created_at').order('id').range(offset, offset + 999).abortSignal(signal);
    if (error) throw new Error('Today’s observed report locations could not load.');
    reports.push(...data);
    if (data.length < 1000) return reports;
  }
}

/**
 * Generate hotspot forecast
 */
export const generateForecast = async (timeHorizon = '7d', boundingBox = null) => {


  const response = await rateLimitedFetch(`${getApiBase()}/api/spatial-forecast/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',

    },
    body: JSON.stringify({
      time_horizon: timeHorizon,
      horizon: timeHorizon,
      bounding_box: boundingBox,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate forecast');
  }

  return response.json();
};

/**
 * Fetch historical predictions
 */
export const fetchPredictions = async (filters = {}, options = {}) => {


  const params = new URLSearchParams();
  if (filters.timeHorizon) params.append('time_horizon', filters.timeHorizon);
  if (filters.clusterId) params.append('cluster_id', filters.clusterId);
  if (filters.startDate) params.append('start_date', filters.startDate);
  if (filters.endDate) params.append('end_date', filters.endDate);
  if (filters.isSignificant !== undefined) params.append('is_significant', filters.isSignificant);
  if (filters.limit) params.append('limit', filters.limit);

  const response = await rateLimitedFetch(`${getApiBase()}/api/spatial-forecast/predictions?${params}`, {
    signal: options.signal,
    headers: {

    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch predictions');
  }

  return response.json();
};

/**
 * Get current predictions for a time horizon
 */
export const getCurrentPredictions = async (horizon = '7d', options = {}) => {
  const params = new URLSearchParams({ horizon });
  if (options.refresh) params.set('refresh', '1');

  const response = await rateLimitedFetch(`${getApiBase()}/api/spatial-forecast/forecast/current?${params}`, {
    signal: options.signal,
    headers: {

    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    reportDiagnostic('error', 'forecast', 'getCurrentPredictions error:', response.status, response.statusText, errorText);
    throw new Error(`Failed to fetch current predictions (${response.status}): ${errorText}`);
  }

  return response.json();
};

/**
 * Get accuracy metrics
 */
export const getAccuracyMetrics = async (timeHorizon = null) => {


  const params = new URLSearchParams();
  if (timeHorizon) params.append('time_horizon', timeHorizon);

  const response = await rateLimitedFetch(`${getApiBase()}/api/spatial-forecast/accuracy?${params}`, {
    headers: {

    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    reportDiagnostic('error', 'forecast', 'getAccuracyMetrics error:', response.status, response.statusText, errorText);
    throw new Error(`Failed to fetch accuracy metrics (${response.status}): ${errorText}`);
  }

  return response.json();
};

/**
 * Get available prediction dates for the calendar
 */
export const getAvailablePredictionDates = async (horizon = '7d', options = {}) => {

  const response = await rateLimitedFetch(`${getApiBase()}/api/spatial-forecast/available-dates?horizon=${encodeURIComponent(horizon)}`, {
    signal: options.signal,
    headers: {

    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    reportDiagnostic('error', 'forecast', 'getAvailablePredictionDates error:', response.status, response.statusText, errorText);
    throw new Error(`Failed to fetch available dates (${response.status}): ${errorText}`);
  }

  return response.json();
};

export const getZoneTrend = async (zoneId, horizon = '7d', options = {}) => {
  const response = await rateLimitedFetch(`${getApiBase()}/api/spatial-forecast/zones/${encodeURIComponent(zoneId)}/trend?horizon=${encodeURIComponent(horizon)}`, { signal: options.signal });
  if (!response.ok) throw new Error('The zone trend could not load.');
  return response.json();
};
