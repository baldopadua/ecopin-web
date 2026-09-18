'use client';

import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { generateForecast, getCurrentPredictions, fetchPredictions, getAccuracyMetrics, getAvailablePredictionDates } from '../../../lib/api/hotspot';
import HotspotForecastMap from '../../../components/map/HotspotForecastMap';
import { RequireRole } from '../../../components/auth/RequireRole';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import DataTable from '../../../components/ui/DataTable';

function SpatialAnalysisContent() {
  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'historical'
  
  // Current Analysis State
  const [timeHorizon, setTimeHorizon] = useState('monthly');
  const [predictions, setPredictions] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  
  // Historical Analysis State
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [historicalPredictions, setHistoricalPredictions] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  
  // Shared State
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  // Initial Load
  useEffect(() => {
    if (activeTab === 'current') {
      loadCurrentPredictions();
      loadAccuracy();
    } else {
      loadHistoricalData();
      loadAvailableDates();
    }
  }, [timeHorizon, activeTab]);

  const loadAvailableDates = async () => {
    try {
      const data = await getAvailablePredictionDates();
      // Convert YYYY-MM-DD strings to Date objects for the calendar highlighting
      const dates = (data.data || []).map(d => new Date(d));
      setAvailableDates(dates);
    } catch (err) {
      console.error('Failed to load available dates:', err);
    }
  };

  const loadCurrentPredictions = async () => {
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

  const loadHistoricalData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPredictions({ startDate, endDate });
      const rawRecords = data.data || [];
      
      const features = [];
      const region_analyses = {};
      
      rawRecords.forEach(record => {
        let issueBreakdown = {};
        if (record.issue_breakdown) {
          try {
            issueBreakdown = typeof record.issue_breakdown === 'string'
              ? JSON.parse(record.issue_breakdown)
              : record.issue_breakdown;
          } catch (e) { /* ignore parse errors */ }
        }

        region_analyses[record.region_id] = {
          ...record,
          is_hotspot: record.risk_score > 0,
          issue_breakdown: issueBreakdown,
        };

        if (record.risk_score > 0 && record.geojson_polygon) {
          let geometry = null;
          try {
            geometry = typeof record.geojson_polygon === 'string' 
              ? JSON.parse(record.geojson_polygon) 
              : record.geojson_polygon;
          } catch (e) { }

          if (geometry) {
            features.push({
              type: 'Feature',
              geometry,
              properties: {
                ...record,
                issue_breakdown: issueBreakdown,
                center_lat: record.region_center_lat,
                center_lng: record.region_center_lng,
              }
            });
          }
        }
      });

      setHistoricalPredictions({
        region_analyses,
        total_regions: rawRecords.length,
        hotspot_count: rawRecords.filter(a => a.risk_score > 0).length,
        geojson: {
          type: 'FeatureCollection',
          features
        }
      });
    } catch (err) {
      setError('Failed to load historical data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const handleGenerateForecast = async () => {
    try {
      setGenerating(true);
      setError(null);
      const data = await generateForecast(timeHorizon);
      setPredictions(data.data);
      await loadAccuracy();
    } catch (err) {
      setError(err.message || 'Failed to generate forecast');
    } finally {
      setGenerating(false);
    }
  };

  // Data processing based on active tab
  const currentData = activeTab === 'current' ? predictions : historicalPredictions;
  
  const hotspots = currentData?.region_analyses 
    ? (Array.isArray(currentData.region_analyses) 
        ? currentData.region_analyses.filter(a => a.is_hotspot)
        : Object.values(currentData.region_analyses).filter(a => a.is_hotspot))
        .sort((a, b) => b.risk_score - a.risk_score)
    : [];

  const stats = activeTab === 'current' ? [
    { title: 'Total Clusters', value: currentData?.hotspot_count || 0, color: 'error' },
    { title: 'Total Reports', value: currentData?.total_reports || 0, color: 'accent' },
    { title: 'Time Horizon', value: timeHorizon.charAt(0).toUpperCase() + timeHorizon.slice(1), color: 'info' },
    { title: 'Prediction Accuracy', value: accuracy?.averageAccuracy ? `${(accuracy.averageAccuracy * 100).toFixed(1)}%` : 'N/A', color: 'success' }
  ] : [
    { title: 'Total Regions Evaluated', value: currentData?.total_regions || 0, color: 'info' },
    { title: 'Historical Hotspots', value: hotspots.length || 0, color: 'error' },
  ];

  const columns = [
    { 
      key: 'rank', 
      label: 'Rank', 
      width: '8%',
      render: (value) => (
        <span style={{
          background: '#ef4444', color: '#fff', borderRadius: '50%',
          width: 24, height: 24, display: 'inline-flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 11, fontWeight: 700,
        }}>
          #{value || '?'}
        </span>
      )
    },
    { 
      key: 'risk_level', 
      label: 'Risk', 
      width: '12%',
      render: (value) => (
        <span className={`px-2 py-1 text-xs font-medium rounded ${
          value === 'high' 
            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            : value === 'medium'
            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        }`}>
          {value || 'unknown'}
        </span>
      )
    },
    { key: 'report_count', label: 'Reports', width: '10%' },
    { 
      key: 'risk_score', 
      label: 'Risk Score', 
      width: '12%',
      render: (value) => value ? `${(value * 100).toFixed(0)}%` : 'N/A'
    },
    { 
      key: 'region_radius_meters', 
      label: 'Cluster Radius', 
      width: '15%',
      render: (value) => value ? `${Math.round(value)} m` : 'N/A'
    },
    { 
      key: 'top_issue_type', 
      label: 'Top Issue', 
      width: '18%',
      render: (value) => (
        <span style={{ textTransform: 'capitalize' }}>
          {(value || 'N/A').replace(/_/g, ' ')}
        </span>
      )
    },
    ...(activeTab === 'current' ? [{
      key: 'region_center_lat',
      label: 'Location',
      width: '25%',
      render: (value, row) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
          {value?.toFixed(5)}, {row.region_center_lng?.toFixed(5)}
        </span>
      )
    }] : [{
      key: 'prediction_date', 
      label: 'Date Recorded', 
      width: '25%',
      render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
    }])
  ];

  return (
    <DashboardLayout
      title="Spatial Analysis"
      subtitle="Density-based clustering to identify critical environmental hotspots"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard/officer' },
        { label: 'Spatial Analysis' }
      ]}
      stats={stats}
      loading={loading}
    >
      {/* Tabs */}
      <div className="flex border-b border-border mb-8">
        <button
          onClick={() => setActiveTab('current')}
          className={`py-3 px-6 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'current' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
          }`}
        >
          Current Analysis
        </button>
        <button
          onClick={() => setActiveTab('historical')}
          className={`py-3 px-6 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'historical' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
          }`}
        >
          Historical Trends
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-8">
          {error}
        </div>
      )}

      {/* Controls based on active tab */}
      {activeTab === 'current' ? (
        <div className="card no-hover mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Time Horizon
              </label>
              <select
                value={timeHorizon}
                onChange={(e) => setTimeHorizon(e.target.value)}
                className="input py-2"
                disabled={loading || generating}
              >
                <option value="daily">Daily (24 hours)</option>
                <option value="weekly">Weekly (7 days)</option>
                <option value="monthly">Monthly (30 days)</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateForecast}
              disabled={generating || loading}
              className="btn-primary"
            >
              {generating ? 'Generating...' : 'Generate Forecast'}
            </button>
            <button
              onClick={loadCurrentPredictions}
              disabled={loading || generating}
              className="btn-secondary"
            >
              Refresh
            </button>
          </div>
        </div>
      ) : (
        <div className="card no-hover mb-8 flex flex-wrap items-end justify-between gap-4 relative z-50">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Start Date
              </label>
              <DatePicker
                selected={new Date(startDate + 'T12:00:00')}
                onChange={(date) => {
                  const tzDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                  setStartDate(tzDate.toISOString().split('T')[0]);
                }}
                className="input"
                highlightDates={availableDates}
                dateFormat="yyyy-MM-dd"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                End Date
              </label>
              <DatePicker
                selected={new Date(endDate + 'T12:00:00')}
                onChange={(date) => {
                  const tzDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                  setEndDate(tzDate.toISOString().split('T')[0]);
                }}
                className="input"
                highlightDates={availableDates}
                dateFormat="yyyy-MM-dd"
                minDate={new Date(startDate + 'T12:00:00')}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadHistoricalData}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Loading...' : 'Apply Filters'}
            </button>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="card no-hover mb-8">
        <h2 className="text-xl font-bold text-text-primary mb-6">
          {activeTab === 'current' ? 'Hotspot Map' : 'Historical Map View'}
        </h2>
        {loading && !currentData ? (
          <div className="flex items-center justify-center h-[500px] bg-surface-elevated rounded-xl border border-border">
            <p className="text-text-muted">Loading data...</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden border border-border h-[500px] z-0 relative">
            <HotspotForecastMap 
              predictions={currentData} 
              timeHorizon={activeTab === 'current' ? timeHorizon : 'historical'} 
            />
          </div>
        )}
      </div>

      {/* Hotspot List */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6 px-1">
          <h2 className="text-xl font-bold text-text-primary">
            {activeTab === 'current' ? 'Cluster Details' : 'Historical Hotspots'}
          </h2>
          {activeTab === 'current' && (
            <div className="text-sm text-text-muted bg-surface-elevated px-3 py-1.5 rounded-lg border border-border">
              Powered by DBSCAN · reports within 150 m are grouped into a cluster
            </div>
          )}
        </div>
        <DataTable
          columns={columns}
          data={hotspots}
          loading={loading}
          emptyMessage={activeTab === 'current' ? "No clusters identified. Try generating a new forecast." : "No hotspots recorded for this time range"}
        />
      </div>
    </DashboardLayout>
  );
}

export default function SpatialAnalysisPage() {
  return (
    <RequireRole allowedRoles={['admin', 'officer']}>
      <SpatialAnalysisContent />
    </RequireRole>
  );
}
