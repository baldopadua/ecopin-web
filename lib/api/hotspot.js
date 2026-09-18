// Hotspot Forecasting API Client
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3002';

/**
 * Generate hotspot forecast
 */
export const generateForecast = async (timeHorizon = 'weekly', boundingBox = null) => {
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(`${API_BASE}/api/spatial-forecast/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
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
  const token = localStorage.getItem('authToken');
  
  const params = new URLSearchParams();
  if (filters.timeHorizon) params.append('time_horizon', filters.timeHorizon);
  if (filters.clusterId) params.append('cluster_id', filters.clusterId);
  if (filters.startDate) params.append('start_date', filters.startDate);
  if (filters.endDate) params.append('end_date', filters.endDate);
  if (filters.isSignificant !== undefined) params.append('is_significant', filters.isSignificant);
  if (filters.limit) params.append('limit', filters.limit);
  
  const response = await fetch(`${API_BASE}/api/spatial-forecast/predictions?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
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
  const token = localStorage.getItem('authToken');
  
  const response = await fetch(`${API_BASE}/api/spatial-forecast/current/${horizon}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('getCurrentPredictions error:', response.status, response.statusText, errorText);
    throw new Error(`Failed to fetch current predictions (${response.status}): ${errorText}`);
  }
  
  return response.json();
};

/**
 * Get accuracy metrics
 */
export const getAccuracyMetrics = async (timeHorizon = null) => {
  const token = localStorage.getItem('authToken');
  
  const params = new URLSearchParams();
  if (timeHorizon) params.append('time_horizon', timeHorizon);
  
  const response = await fetch(`${API_BASE}/api/spatial-forecast/accuracy?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('getAccuracyMetrics error:', response.status, response.statusText, errorText);
    throw new Error(`Failed to fetch accuracy metrics (${response.status}): ${errorText}`);
  }
  
  return response.json();
};

/**
 * Get available prediction dates for the calendar
 */
export const getAvailablePredictionDates = async () => {
  const token = localStorage.getItem('authToken');
  const response = await fetch(`${API_BASE}/api/spatial-forecast/available-dates`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('getAvailablePredictionDates error:', response.status, response.statusText, errorText);
    throw new Error(`Failed to fetch available dates (${response.status}): ${errorText}`);
  }
  
  return response.json();
};
