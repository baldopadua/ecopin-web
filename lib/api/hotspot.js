import { rateLimitedFetch } from '../rateLimiter.js'
import { reportDiagnostic } from '../diagnostics.mjs';


// Hotspot Forecasting API Client
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3002';

/**
 * Generate hotspot forecast
 */
export const generateForecast = async (timeHorizon = 'weekly', boundingBox = null) => {


  const response = await rateLimitedFetch(`${API_BASE}/api/spatial-forecast/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',

    },
    body: JSON.stringify({
      time_horizon: timeHorizon,
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
export const fetchPredictions = async (filters = {}) => {


  const params = new URLSearchParams();
  if (filters.timeHorizon) params.append('time_horizon', filters.timeHorizon);
  if (filters.clusterId) params.append('cluster_id', filters.clusterId);
  if (filters.startDate) params.append('start_date', filters.startDate);
  if (filters.endDate) params.append('end_date', filters.endDate);
  if (filters.isSignificant !== undefined) params.append('is_significant', filters.isSignificant);
  if (filters.limit) params.append('limit', filters.limit);

  const response = await rateLimitedFetch(`${API_BASE}/api/spatial-forecast/predictions?${params}`, {
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
export const getCurrentPredictions = async (horizon = 'weekly') => {


  const response = await rateLimitedFetch(`${API_BASE}/api/spatial-forecast/current/${horizon}`, {
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

  const response = await rateLimitedFetch(`${API_BASE}/api/spatial-forecast/accuracy?${params}`, {
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
export const getAvailablePredictionDates = async () => {

  const response = await rateLimitedFetch(`${API_BASE}/api/spatial-forecast/available-dates`, {
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

