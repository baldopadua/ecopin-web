'use client';

import { useState, useEffect } from 'react';
import { getCurrentPredictions, generateForecast, getAccuracyMetrics } from '../../../lib/api/hotspot';
import HotspotForecastMap from '../../../components/map/HotspotForecastMap';
import { RequireRole } from '../../../components/auth/RequireRole';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import DataTable from '../../../components/ui/DataTable';

function ForecastContent() {
  const [timeHorizon, setTimeHorizon] = useState('weekly');
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [accuracy, setAccuracy] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPredictions();
    loadAccuracy();
  }, [timeHorizon]);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCurrentPredictions(timeHorizon);
      setPredictions(data.data);
    } catch (err) {
      setError('Failed to load predictions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAccuracy = async () => {
    try {
      const data = await getAccuracyMetrics(timeHorizon);
      setAccuracy(data.data);
    } catch (err) {
      console.error('Failed to load accuracy metrics:', err);
    }
  };

  const handleGenerateForecast = async () => {
    try {
      setGenerating(true);
      setError(null);
      const data = await generateForecast(timeHorizon);
      setPredictions(data.data);
    } catch (err) {
      setError('Failed to generate forecast');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const hotspots = predictions?.region_analyses 
    ? Object.values(predictions.region_analyses).filter(a => a.is_hotspot)
    : [];

  const stats = [
    { title: 'Total Regions', value: predictions?.total_regions || 0, color: 'info' },
    { title: 'Hotspots Identified', value: predictions?.hotspot_count || 0, color: 'error' },
    { title: 'Total Reports', value: predictions?.total_reports || 0, color: 'accent' },
    { title: 'Prediction Accuracy', value: accuracy?.averageAccuracy ? `${(accuracy.averageAccuracy * 100).toFixed(1)}%` : 'N/A', color: 'success' }
  ];

  const columns = [
    { key: 'region_id', label: 'Region ID', width: '20%' },
    { 
      key: 'risk_level', 
      label: 'Risk Level', 
      width: '15%',
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-medium rounded ${
          value === 'high' 
            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            : value === 'medium'
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        }`}>
          {value}
        </span>
      )
    },
    { 
      key: 'risk_score', 
      label: 'Risk Score', 
      width: '15%',
      render: (value) => `${(value * 100).toFixed(1)}%`
    },
    { key: 'report_count', label: 'Report Count', width: '15%' },
    { 
      key: 'gi_star', 
      label: 'Gi* Statistic', 
      width: '15%',
      render: (value) => value?.toFixed(4) || 'N/A'
    },
    { 
      key: 'p_value', 
      label: 'P-Value', 
      width: '20%',
      render: (value) => value?.toFixed(6) || 'N/A'
    }
  ];

  return (
    <DashboardLayout
      title="Hotspot Forecast"
      subtitle="Spatial forecasting for environmental report hotspots"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard/officer' },
        { label: 'Forecast' }
      ]}
      stats={stats}
      loading={loading}
    >
      <div className="card no-hover mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Time Horizon
          </label>
          <select
            value={timeHorizon}
            onChange={(e) => setTimeHorizon(e.target.value)}
            className="input-field"
          >
            <option value="daily">Daily (24 hours)</option>
            <option value="weekly">Weekly (7 days)</option>
            <option value="monthly">Monthly (30 days)</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGenerateForecast}
            disabled={generating}
            className="btn-primary"
          >
            {generating ? 'Generating...' : 'Generate Forecast'}
          </button>
          <button
            onClick={loadPredictions}
            disabled={loading}
            className="btn-secondary"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-8">
          {error}
        </div>
      )}

      {/* Map */}
      <div className="card no-hover mb-8">
        <h2 className="text-xl font-bold text-text-primary mb-6">Hotspot Map</h2>
        {loading ? (
          <div className="flex items-center justify-center h-[500px] bg-surface-alt rounded-xl border border-border">
            <p className="text-text-muted">Loading predictions...</p>
          </div>
        ) : predictions ? (
          <div className="rounded-xl overflow-hidden border border-border h-[500px] z-0 relative">
            <HotspotForecastMap predictions={predictions} timeHorizon={timeHorizon} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-[500px] bg-surface-alt rounded-xl border border-border">
            <p className="text-text-muted">No predictions available</p>
          </div>
        )}
      </div>

      {/* Hotspot List */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-text-primary mb-6 px-1">Hotspot Details</h2>
        <DataTable
          columns={columns}
          data={hotspots}
          loading={loading}
          emptyMessage="No hotspots identified for this time horizon"
        />
      </div>
    </DashboardLayout>
  );
}

export default function ForecastPage() {
  return (
    <RequireRole allowedRoles={['admin', 'officer']}>
      <ForecastContent />
    </RequireRole>
  );
}
