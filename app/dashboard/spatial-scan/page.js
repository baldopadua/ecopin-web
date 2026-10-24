'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import PageHeader from '@/components/layout/PageHeader';
import styles from '@/components/ui/SpatialScan.module.css';
import { getCurrentPredictions, fetchPredictions, getAvailablePredictionDates, getTodayReportLocations } from '../../../lib/api/hotspot';
import { normalizeForecast, forecastDate, observedReportPoints, labelForecastAreas, summarizeForecast, filterForecastAreas } from '../../../lib/forecast-data.mjs';
import { History, RefreshCw, MapPin } from 'lucide-react';
import ForecastOverview from '../../../components/ui/ForecastOverview';
import CommandHUD from '../../../components/ui/CommandHUD';
import DynamicFeed from '../../../components/ui/DynamicFeed';
import TimePlayer from '../../../components/ui/TimePlayer';
import ZoneTrendDrawer from '../../../components/ui/ZoneTrendDrawer';
import { filterAvailableSnapshotDates, extractForecastSteps, projectFeaturesToStep } from '../../../lib/helpers/forecastTimeline';
import { RequireRole } from '../../../components/auth/RequireRole';

const ForecastMap = dynamic(() => import('@/components/map/HotspotForecastMap'), { ssr: false });

function TacticalScanContent() {
  const [activeTab, setActiveTab] = useState('current');
  const [timeHorizon, setTimeHorizon] = useState('7d');
  const [viewMode, setViewMode] = useState('clusters');
  const [compactView, setCompactView] = useState('map');
  const [reportsHeatmap, setReportsHeatmap] = useState(null);
  const [observedError, setObservedError] = useState('');
  const [currentResult, setCurrentResult] = useState(null);
  const [historyResult, setHistoryResult] = useState(null);
  const [historyCache, setHistoryCache] = useState({});
  const [datesResult, setDatesResult] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [focusedItem, setFocusedItem] = useState(null);
  const [trendItem, setTrendItem] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [datesAttempt, setDatesAttempt] = useState(0);
  const [riskFilter, setRiskFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [futureStepIndex, setFutureStepIndex] = useState(0);
  const [lastValidHistoricalData, setLastValidHistoricalData] = useState(null);
  const refreshRef = useRef(false);
  const currentKey = `${timeHorizon}-${attempt}`;
  const historyKey = `${timeHorizon}-${selectedDate}-${attempt}`;
  const datesKey = `${timeHorizon}-${datesAttempt}`;
  const currentPredictions = currentResult?.key === currentKey ? currentResult.data : null;
  const cachedHistoryForSelected = selectedDate ? historyCache[`${timeHorizon}-${selectedDate}`] : null;
  const historicalPredictions = (historyResult?.key === historyKey ? historyResult.data : null) || cachedHistoryForSelected || lastValidHistoricalData || null;
  const availableDates = useMemo(() => datesResult?.key === datesKey ? datesResult.data || [] : [], [datesResult, datesKey]);
  const datesError = datesResult?.key === datesKey ? datesResult.error : '';

  useEffect(() => {
    const controller = new AbortController();
    const shouldRefresh = refreshRef.current;
    refreshRef.current = false;
    getCurrentPredictions(timeHorizon, { signal: controller.signal, refresh: shouldRefresh }).then(response => {
      if (!controller.signal.aborted) {
        const data = response.data ?? response;
        setCurrentResult({ key: currentKey, data: normalizeForecast(data), error: data.status === 'setup_required'
          ? 'Forecasting setup is incomplete. Ask an administrator to finish setup.'
          : data.status === 'unavailable' ? 'The latest forecast could not load.' : '' });
      }
    }).catch(error => {
      if (!controller.signal.aborted && error.name !== 'AbortError') setCurrentResult({ key: currentKey, data: null, error: 'The latest forecast could not load.' });
    });
    return () => controller.abort();
  }, [timeHorizon, currentKey]);

  useEffect(() => {
    const controller = new AbortController();
    getAvailablePredictionDates(timeHorizon, { signal: controller.signal }).then(response => {
      if (controller.signal.aborted) return;
      const dates = filterAvailableSnapshotDates(response.data || []);
      setDatesResult({ key: datesKey, data: dates, error: '' });
      setSelectedDate(previous => dates.includes(previous) ? previous : dates.at(-1) || null);
    }).catch(error => { if (!controller.signal.aborted && error.name !== 'AbortError') setDatesResult({ key: datesKey, data: [], error: 'Historical dates could not load.' }); });
    return () => controller.abort();
  }, [timeHorizon, datesKey]);

  useEffect(() => {
    if (activeTab !== 'historical' || !selectedDate) return;
    const cacheKey = `${timeHorizon}-${selectedDate}`;
    const controller = new AbortController();

    if (historyCache[cacheKey]) {
      const cached = historyCache[cacheKey];
      Promise.resolve(cached).then(data => {
        if (!controller.signal.aborted) {
          setLastValidHistoricalData(data);
          setHistoryResult({ key: historyKey, data, error: '' });
        }
      });
    } else {
      fetchPredictions({ startDate: selectedDate, endDate: selectedDate, timeHorizon }, { signal: controller.signal }).then(response => {
        if (!controller.signal.aborted) {
          const normalized = normalizeForecast(response.data ?? response);
          setHistoryCache(prev => ({ ...prev, [cacheKey]: normalized }));
          setLastValidHistoricalData(normalized);
          setHistoryResult({ key: historyKey, data: normalized, error: '' });
        }
      }).catch(error => { if (!controller.signal.aborted && error.name !== 'AbortError') setHistoryResult({ key: historyKey, data: null, error: 'The forecast for this date could not load.' }); });
    }

    // Prefetch next and previous snapshot dates for butter-smooth playback
    if (availableDates.length > 1) {
      const idx = availableDates.indexOf(selectedDate);
      const nextDates = [];
      if (idx !== -1) {
        const nextDate = availableDates[(idx + 1) % availableDates.length];
        const nextNextDate = availableDates[(idx + 2) % availableDates.length];
        if (nextDate) nextDates.push(nextDate);
        if (nextNextDate) nextDates.push(nextNextDate);
      }
      for (const d of nextDates) {
        const nextKey = `${timeHorizon}-${d}`;
        if (!historyCache[nextKey]) {
          fetchPredictions({ startDate: d, endDate: d, timeHorizon }, { signal: controller.signal })
            .then(res => {
              if (!controller.signal.aborted) {
                const normalized = normalizeForecast(res.data ?? res);
                setHistoryCache(prev => ({ ...prev, [nextKey]: normalized }));
              }
            })
            .catch(() => {});
        }
      }
    }

    return () => controller.abort();
  }, [activeTab, selectedDate, timeHorizon, historyKey, historyCache, availableDates]);

  useEffect(() => {
    const controller = new AbortController();
    getTodayReportLocations({ signal: controller.signal }).then(reports => {
      if (!controller.signal.aborted) { setReportsHeatmap(observedReportPoints(reports)); setObservedError(''); }
    }).catch(() => { if (!controller.signal.aborted) setObservedError('Today’s observed report locations could not load.'); });
    return () => controller.abort();
  }, [attempt]);

  const currentData = activeTab === 'current' ? currentPredictions : historicalPredictions;
  const isHistoricalMissing = activeTab === 'historical' && !!selectedDate && !historyCache[`${timeHorizon}-${selectedDate}`] && historyResult?.key !== historyKey;
  const loading = activeTab === 'current' ? currentResult?.key !== currentKey : isHistoricalMissing;
  const error = activeTab === 'current' ? currentResult?.key === currentKey && currentResult.error : historyResult?.key === historyKey && historyResult.error;
  const observed = viewMode === 'heatmap';
  const rawAreas = useMemo(() => labelForecastAreas(currentData?.geojson?.features || []), [currentData]);

  // Extract distinct future steps across all areas (Full horizon + Week 1, Week 2, etc.)
  const futureSteps = useMemo(() => extractForecastSteps(rawAreas), [rawAreas]);
  const activeStep = activeTab === 'current' && futureSteps.length > 0 ? futureSteps[Math.min(futureStepIndex, futureSteps.length - 1)] : null;

  // Project areas to the currently selected future week when scrubbing beyond Full horizon
  const allAreas = useMemo(() => {
    if (activeTab === 'current' && activeStep?.date) {
      return projectFeaturesToStep(rawAreas, activeStep.date);
    }
    return rawAreas;
  }, [rawAreas, activeTab, activeStep]);

  const summary = useMemo(() => summarizeForecast(allAreas), [allAreas]);
  const filteredAreas = useMemo(() => filterForecastAreas(allAreas, riskFilter, query), [allAreas, riskFilter, query]);
  const feedItems = observed ? reportsHeatmap?.features || [] : filteredAreas;
  const feedLoading = observed ? !reportsHeatmap && !observedError : loading;
  const feedError = observed ? observedError : error;
  const mapData = useMemo(() => observed ? { geojson: { type: 'FeatureCollection', features: [] }, heatmap_geojson: reportsHeatmap }
    : { ...currentData, geojson: { type: 'FeatureCollection', features: filteredAreas } }, [currentData, reportsHeatmap, filteredAreas, observed]);
  const hasMapData = observed ? reportsHeatmap?.features?.length > 0 : filteredAreas.length > 0;
  const selectZone = useCallback(feature => {
    setFocusedItem(feature);
    if (feature.properties.zone_id) { setTrendItem(feature); setViewMode('clusters'); }
    else setCompactView('map');
  }, []);

  const closeTrend = useCallback(() => setTrendItem(null), []);
  const changeHorizon = value => { setTimeHorizon(value); setFocusedItem(null); setTrendItem(null); setFutureStepIndex(0); };
  const handleDateChange = useCallback(value => { setActiveTab('historical'); setSelectedDate(value); setFocusedItem(null); setTrendItem(null); }, []);
  const clearFilters = () => { setQuery(''); setRiskFilter('all'); setFocusedItem(null); };
  const filterAreas = value => { setRiskFilter(value); setFocusedItem(null); };

  // Subtle transition indicator: only when actively fetching a date that is not yet in cache
  const isTransitioning = !observed && loading && hasMapData;

  // Overview and issued badge loading: only flash loading if there is NO map data yet
  const overviewLoading = loading && !hasMapData;

  return <div className={`workspace-page ${styles.page}`} data-history={activeTab === 'historical'}>
    <PageHeader title="Hotspot forecast" className={styles.pageHeader} subtitle="See where report activity may build up. Plan your next inspection."
      breadcrumbs={[{ label: 'Officer', href: '/dashboard/officer' }, { label: 'Spatial scan' }]}>
      <div className={styles.headingActions}>
        <span className={styles.issued}>{observed ? 'Today · Manila time' : currentData?.prediction_date ? `${activeTab === 'historical' ? 'Snapshot from' : 'Issued'} ${forecastDate(currentData.prediction_date)}` : (loading && !hasMapData) ? 'Loading forecast…' : selectedDate ? `Snapshot from ${forecastDate(selectedDate)}` : 'Forecast unavailable'}</span>
        {activeTab === 'historical' ? (
          <button type="button" aria-label="Return to latest forecast" onClick={() => { setActiveTab('current'); setFocusedItem(null); }}>
            <History size={16} aria-hidden="true" /><span>Back to Latest Forecast</span>
          </button>
        ) : (
          <button type="button" aria-label="Past forecast snapshots" aria-pressed={false} disabled={!availableDates.length || observed}
            onClick={() => { setActiveTab('historical'); setFocusedItem(null); }}>
            <History size={16} aria-hidden="true" /><span>Past Snapshots</span>
          </button>
        )}
        <button type="button" aria-label="Refresh forecast" disabled={feedLoading} onClick={() => { refreshRef.current = true; setAttempt(value => value + 1); setDatesAttempt(value => value + 1); }}><RefreshCw size={16} className={feedLoading ? styles.refreshing : ''} aria-hidden="true" /></button>
      </div>
    </PageHeader>
    <CommandHUD viewMode={viewMode} setViewMode={value => { setViewMode(value); setCompactView('map'); setFocusedItem(null); }} timeHorizon={timeHorizon} setTimeHorizon={changeHorizon} activeTab={activeTab} selectedDate={selectedDate} />
    {activeTab === 'historical' && !observed && (
      <div className={styles.notice} style={{ color: 'var(--text-primary)', borderColor: 'var(--workspace-link)', background: 'var(--forecast-soft)' }} role="status">
        <span><strong>Historical Snapshot Mode:</strong> Viewing the {parseInt(timeHorizon, 10)}-day forecast archive originally generated on {selectedDate ? new Date(selectedDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'selected date'}.</span>
        <button type="button" style={{ marginLeft: 'auto' }} onClick={() => { setActiveTab('current'); setFocusedItem(null); }}>Return to Live Forecast</button>
      </div>
    )}
    {datesError && !observed && <div className={styles.notice} role="alert">{datesError}<button type="button" onClick={() => setDatesAttempt(value => value + 1)}>Retry dates</button></div>}
    {currentData?.status === 'setup_required' && !observed && <div className={styles.notice} role="status">Forecasting setup is incomplete. Ask an administrator to finish setup.</div>}
    {currentData?.stale && !observed && activeTab === 'current' && <div className={styles.notice} role="status">Showing the last available forecast. A fresh forecast is temporarily unavailable.</div>}
    <ForecastOverview summary={summary} horizon={timeHorizon} loading={overviewLoading} unavailable={!!error || !allAreas.length} filter={riskFilter} onFilterChange={filterAreas}
      observed={observed} actualCount={reportsHeatmap?.features?.length ?? null} observedError={observedError}
      isHistorical={activeTab === 'historical'} snapshotDate={selectedDate} />
    <div className={`${styles.switcher} ${styles.compactViews}`} role="group" aria-label="Workspace view">
      <button type="button" aria-pressed={compactView === 'map'} onClick={() => setCompactView('map')}>Map</button>
      <button type="button" aria-label="Hotspots" aria-pressed={compactView === 'hotspots'} onClick={() => setCompactView('hotspots')}>{observed ? 'Reports' : 'Areas'}</button>
    </div>
    <div className={styles.workspace} data-view={compactView}>
      <section className={styles.mapPanel} aria-label="Spatial forecast map">
        <div className={styles.mapHeading}>
          <div>
            <MapPin size={16} aria-hidden="true" />
            <h2>{observed ? 'Today’s reported locations' : activeTab === 'historical' ? `Archived footprint · ${selectedDate ? forecastDate(selectedDate) : 'Past date'}` : (activeStep?.date ? `Projected map · ${activeStep.label}` : 'Where to look next')}</h2>
          </div>
          <span>{observed ? 'Actual reports' : activeTab === 'historical' ? `${filteredAreas.length} flagged areas` : `${filteredAreas.length} of ${allAreas.length} areas`}</span>
        </div>
        <div className={styles.map}>
          {hasMapData ? (
            <>
              <ForecastMap predictions={mapData} timeHorizon={timeHorizon} viewModeOverride={viewMode} focusedItem={focusedItem} onZoneSelect={selectZone} hideUI />
              {isTransitioning && (
                <div className={styles.transitionBadge} role="status" aria-live="polite">
                  <span className={styles.transitionBadgePulse} aria-hidden="true" />
                  <span>Updating timeline snapshot…</span>
                </div>
              )}
            </>
          ) : (
            <div className={styles.mapState} role="status">
              <MapPin size={28} strokeWidth={1.5} aria-hidden="true" />
              <p>
                {observed
                  ? observedError
                    ? 'Observed reports unavailable'
                    : !reportsHeatmap
                    ? 'Loading today’s reports…'
                    : 'No observed report locations are available for today.'
                  : loading
                  ? 'Loading forecast…'
                  : error
                  ? 'Forecast map unavailable'
                  : allAreas.length
                  ? 'No areas match your filters.'
                  : 'No zones are available for this forecast.'}
              </p>
              {feedError && (
                <button type="button" className={styles.secondary} onClick={() => setAttempt(value => value + 1)}>
                  {observed ? 'Retry actuals' : 'Retry forecast'}
                </button>
              )}
              {!feedError && !loading && !observed && allAreas.length > 0 && !filteredAreas.length && (
                <button type="button" className={styles.clearFilter} onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
        {!observed && <div className={styles.legend} aria-label="Risk level legend"><span><i className={styles.high} />High risk</span><span><i className={styles.medium} />Medium risk</span><span><i className={styles.low} />Low risk</span></div>}
        <p className={styles.mapNote}>{observed ? 'Reports submitted today, from midnight in Manila. Select a report in the list to locate it.'
          : activeTab === 'historical' ? `Historical archive: Displaying the AI prediction footprint originally generated on ${selectedDate ? forecastDate(selectedDate) : 'the selected date'}.`
          : activeStep?.date ? `Displaying projected hotspot intensity for ${activeStep.label}. Scrub the future timeline below to step forward/backward.`
          : `${forecastDate(currentData?.forecast_date_start)} – ${forecastDate(currentData?.forecast_date_end)} · Select an area to explore its forecast.`}</p>
      </section>
      <DynamicFeed key={`${activeTab}-${timeHorizon}-${observed}`} items={feedLoading && !hasMapData || feedError ? [] : feedItems} selectedItem={focusedItem} loading={feedLoading && !hasMapData} error={feedError}
        onRetry={() => setAttempt(value => value + 1)} onClick={selectZone} observed={observed} totalAreas={allAreas.length} filter={riskFilter} query={query} onFilterChange={filterAreas} onQueryChange={setQuery} onClearFilters={clearFilters} />
    </div>
    {!observed && (
      activeTab === 'historical' ? (
        <div className={styles.historyBar}>
          <button type="button" className={styles.clearFilter} onClick={() => { setActiveTab('current'); setFocusedItem(null); }}>Latest forecast</button>
          <TimePlayer dates={availableDates} currentDate={selectedDate} onDateChange={handleDateChange} isProjective={false} />
        </div>
      ) : (
        futureSteps.length > 1 && (
          <div className={styles.historyBar}>
            <TimePlayer isProjective={true} steps={futureSteps} currentStepIndex={futureStepIndex} onStepChange={setFutureStepIndex} />
          </div>
        )
      )
    )}
    {trendItem && <ZoneTrendDrawer key={`${trendItem.properties.zone_id}-${timeHorizon}-${selectedDate}`} feature={trendItem} horizon={timeHorizon} snapshot={activeTab === 'historical'} onClose={closeTrend} />}
  </div>;
}

export default function SpatialAnalysisPage() {
  return <RequireRole allowedRoles={['admin', 'officer']}><TacticalScanContent /></RequireRole>;
}
