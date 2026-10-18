'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import PageHeader from '@/components/layout/PageHeader';
import styles from '@/components/ui/SpatialScan.module.css';
import { getCurrentPredictions, fetchPredictions, getAccuracyMetrics, getAvailablePredictionDates } from '../../../lib/api/hotspot';
import { fetchFilteredReports } from '../../../lib/api/reports';
const ForecastMap = dynamic(() => import('@/components/map/HotspotForecastMap'), { ssr: false });
import CommandHUD from '../../../components/ui/CommandHUD';
import DynamicFeed from '../../../components/ui/DynamicFeed';
import TimePlayer from '../../../components/ui/TimePlayer';
import { filterAvailableSnapshotDates } from '../../../lib/helpers/forecastTimeline';
import { RequireRole } from '../../../components/auth/RequireRole';
import { reportDiagnostic } from '../../../lib/diagnostics.mjs';

function TacticalScanContent() {
  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'historical'
  
  // HUD State
  const [reportsHeatmap, setReportsHeatmap] = useState(null);
  const [viewMode, setViewMode] = useState('clusters');
  const [compactView, setCompactView] = useState('map');
  const [accuracy, setAccuracy] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('');
  
  // Data State
  const [currentPredictions, setCurrentPredictions] = useState(null);
  const [historicalPredictions, setHistoricalPredictions] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Interaction State
  const [focusedItem, setFocusedItem] = useState(null);
  const [currentLoading, setCurrentLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentError, setCurrentError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [datesError, setDatesError] = useState('');
  const historyRequest = useRef(0);
  
  // Load Initial Data
  useEffect(() => {
    loadAccuracy();
    loadCurrentPredictions();
    loadAvailableDates();
    loadReportsHeatmap();
  }, []);

  
  const loadReportsHeatmap = async () => {
    try {
      const reports = await fetchFilteredReports({ limit: 1000 });
      const heatFeatures = reports
        .filter(r => r.location_lat && r.location_lng)
        .map(r => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [r.location_lng, r.location_lat] },
          properties: { intensity: 1.0 }
        }));
      setReportsHeatmap({ type: 'FeatureCollection', features: heatFeatures });
    } catch (err) {
      reportDiagnostic('error', 'forecast', 'Failed to load raw reports for heatmap:', err);
    }
  };

  const loadAccuracy = async () => {
    try {
      const data = await getAccuracyMetrics();
      setAccuracy(data.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      reportDiagnostic('error', 'forecast', 'Failed to load accuracy metrics:', err);
    }
  };

  const loadCurrentPredictions = async () => {
    setCurrentLoading(true);
    setCurrentError('');
    try {
      const data = await getCurrentPredictions('monthly');
      setCurrentPredictions(data.data);
    } catch (err) {
      reportDiagnostic('error', 'forecast', 'Failed to load current predictions:', err);
      setCurrentError('The latest forecast could not load.');
    } finally {
      setCurrentLoading(false);
    }
  };

  const historicalCache = useRef(new Map());

  const parsePredictionRecords = (rawRecords) => {
    const features = [];
    const region_analyses = {};
    
    rawRecords.forEach(record => {
      let issueBreakdown = {};
      if (record.issue_breakdown) {
        try {
          issueBreakdown = typeof record.issue_breakdown === 'string'
            ? JSON.parse(record.issue_breakdown)
            : record.issue_breakdown;
        } catch (e) { }
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

    return {
      region_analyses,
      geojson: { type: 'FeatureCollection', features }
    };
  };

  const fetchHistoricalData = async (dateStr) => {
    if (historicalCache.current.has(dateStr)) {
      return historicalCache.current.get(dateStr);
    }
    const data = await fetchPredictions({ startDate: dateStr, endDate: dateStr });
    const rawRecords = data?.data || [];
    const processed = parsePredictionRecords(rawRecords);
    if (processed.geojson.features.length > 0) {
      historicalCache.current.set(dateStr, processed);
    }
    return processed;
  };

  const loadAvailableDates = async () => {
    setDatesError('');
    try {
      const data = await getAvailablePredictionDates();
      const validDates = filterAvailableSnapshotDates(data?.data);

      setAvailableDates(validDates);

      if (validDates.length > 0) {
        const latestDate = validDates[validDates.length - 1];
        setSelectedDate(latestDate);
        loadHistoricalForDate(latestDate);

        // Prefetch remaining dates in the background so playback is completely seamless
        validDates.forEach(date => {
          if (date !== latestDate) {
            fetchHistoricalData(date).catch(() => {});
          }
        });
      }
    } catch (err) {
      reportDiagnostic('error', 'forecast', 'Failed to load available dates:', err);
      setDatesError('Historical dates could not load.');
    }
  };

  const loadHistoricalForDate = async (dateStr) => {
    if (!dateStr) return;

    // Instant switch if cached in memory
    if (historicalCache.current.has(dateStr)) {
      const cached = historicalCache.current.get(dateStr);
      setHistoricalPredictions(cached);
      setHistoryError('');
      setHistoryLoading(false);
      return;
    }

    const request = ++historyRequest.current;
    if (!historicalPredictions) {
      setHistoryLoading(true);
    }
    setHistoryError('');
    try {
      const processed = await fetchHistoricalData(dateStr);
      if (request !== historyRequest.current) return;
      if (processed.geojson.features.length === 0) {
        setAvailableDates(prev => prev.filter(d => d !== dateStr));
      }
      setHistoricalPredictions(processed);
    } catch (err) {
      reportDiagnostic('error', 'forecast', 'Failed to load historical data:', err);
      if (request === historyRequest.current) setHistoryError('The forecast for this date could not load.');
    } finally {
      if (request === historyRequest.current) setHistoryLoading(false);
    }
  };

  const handleDateChange = (newDate) => {
    if (!newDate) return;
    setActiveTab('historical');
    setSelectedDate(newDate);
    setFocusedItem(null);
    loadHistoricalForDate(newDate);
  };

  // Processing data for feed and canvas
  const currentData = activeTab === 'current' ? currentPredictions : historicalPredictions;
  
  
  const currentDataWithHeatmap = useMemo(() => {
    if (!currentData) return null;
    if (currentData.heatmap_geojson) return currentData;
    
    // Return reports heatmap if available, else fallback to cluster centroids
    if (reportsHeatmap) return { ...currentData, heatmap_geojson: reportsHeatmap };
    const features = currentData.geojson?.features || [];
    const heatmapFeatures = features
      .filter(f => f.properties?.center_lat && f.properties?.center_lng && f.properties?.risk_score)
      .map(f => ({
         type: 'Feature',
         geometry: {
           type: 'Point',
           coordinates: [f.properties.center_lng, f.properties.center_lat]
         },
         properties: {
           intensity: f.properties.risk_score
         }
      }));
      
    return {
      ...currentData,
      heatmap_geojson: { type: 'FeatureCollection', features: heatmapFeatures }
    };
  }, [currentData, reportsHeatmap]);

  const feedItems = useMemo(() => {
    if (!currentData?.geojson?.features) return [];
    return currentData.geojson.features
      .filter(f => f.properties?.risk_score > 0)
      .sort((a, b) => b.properties.risk_score - a.properties.risk_score);
  }, [currentData]);

  const isInitialLoading = activeTab === 'current'
    ? (currentLoading && !currentPredictions)
    : (historyLoading && !historicalPredictions);
  const loading = activeTab === 'current' ? currentLoading : historyLoading;
  const error = activeTab === 'current' ? currentError : historyError;
  const retry = () => activeTab === 'current' ? loadCurrentPredictions() : selectedDate && loadHistoricalForDate(selectedDate);
  const hasMapData = viewMode === 'heatmap'
    ? currentDataWithHeatmap?.heatmap_geojson?.features?.length > 0
    : currentDataWithHeatmap?.geojson?.features?.length > 0;
  const heatmapNote = currentData?.heatmap_geojson
    ? 'Heatmap intensity comes from the selected forecast.'
    : reportsHeatmap
      ? 'Heatmap shows report locations, which are not filtered by the selected forecast date.'
      : 'Report locations are unavailable. Heatmap intensity uses forecast risk scores at area centers.';

  return (
    <div className={styles.page}>
      <PageHeader title="Spatial scan" className={styles.pageHeader}
        breadcrumbs={[{ label: 'Officer', href: '/dashboard/officer' }, { label: 'Spatial scan' }]} />
      <div className={styles.toolbar}>
        <div className={styles.switcher} role="group" aria-label="Forecast period">
          <button type="button" aria-pressed={activeTab === 'current'} onClick={() => { setActiveTab('current'); setFocusedItem(null); }}>Latest forecast</button>
          <button type="button" aria-pressed={activeTab === 'historical'} disabled={!availableDates.length}
            onClick={() => { setActiveTab('historical'); setFocusedItem(null); if ((!selectedDate || !availableDates.includes(selectedDate)) && availableDates.length) handleDateChange(availableDates[availableDates.length - 1]); }}>Historical snapshots</button>
        </div>
        <CommandHUD accuracy={accuracy} lastUpdated={lastUpdated} viewMode={viewMode} setViewMode={setViewMode} />
      </div>
      {datesError && <div className={styles.notice} role="alert">{datesError}<button type="button" onClick={loadAvailableDates}>Retry dates</button></div>}
      <div className={`${styles.switcher} ${styles.compactViews}`} role="group" aria-label="Workspace view">
        <button type="button" aria-pressed={compactView === 'map'} onClick={() => setCompactView('map')}>Map</button>
        <button type="button" aria-pressed={compactView === 'hotspots'} onClick={() => setCompactView('hotspots')}>Hotspots</button>
      </div>
      <div className={styles.workspace} data-view={compactView}>
        <section className={styles.mapPanel} aria-label="Spatial forecast map">
          <div className={styles.map}>
            {isInitialLoading || (error && !currentDataWithHeatmap) ? (
              <div className={styles.mapState} role="status">
                <p>{isInitialLoading ? 'Loading forecast…' : error ? 'Forecast map unavailable' : viewMode === 'heatmap' ? 'No heatmap locations are available for this view.' : 'No risk areas are available for this forecast.'}</p>
              </div>
            ) : (
              <ForecastMap
                predictions={currentDataWithHeatmap}
                timeHorizon={activeTab === 'historical' ? 'historical' : 'monthly'}
                viewModeOverride={viewMode}
                focusedItem={focusedItem}
                hideUI={true}
              />
            )}
          </div>
          {viewMode === 'clusters' && <div className={styles.legend} aria-label="Risk level legend">
            <span><i className={styles.high} />High risk</span><span><i className={styles.medium} />Medium risk</span><span><i className={styles.low} />Low risk</span>
          </div>}
          <p className={styles.mapNote}>{viewMode === 'heatmap'
            ? heatmapNote
            : 'Polygons show forecast risk areas. Select a hotspot in the list to center the map.'}</p>
        </section>
        <DynamicFeed items={feedItems} selectedItem={focusedItem} loading={isInitialLoading} error={error} onRetry={retry}
          onClick={setFocusedItem} />
      </div>
      <TimePlayer key={activeTab} dates={availableDates} currentDate={activeTab === 'historical' ? selectedDate : null}
        onDateChange={handleDateChange} isProjective={activeTab === 'current'} />
    </div>
  );
}

export default function SpatialAnalysisPage() {
  return (
    <RequireRole allowedRoles={['admin', 'officer']}>
      <TacticalScanContent />
    </RequireRole>
  );
}
