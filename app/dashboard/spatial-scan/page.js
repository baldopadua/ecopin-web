'use client';

import { useState, useEffect, useMemo } from 'react';
import { getCurrentPredictions, fetchPredictions, getAccuracyMetrics, getAvailablePredictionDates } from '../../../lib/api/hotspot';
import TacticalCanvas from '../../../components/map/TacticalCanvas';
import CommandHUD from '../../../components/ui/CommandHUD';
import DynamicFeed from '../../../components/ui/DynamicFeed';
import TimePlayer from '../../../components/ui/TimePlayer';
import { RequireRole } from '../../../components/auth/RequireRole';

function TacticalScanContent() {
  const [activeTab, setActiveTab] = useState('current'); // 'current' | 'historical'
  
  // HUD State
  const [reportsHeatmap, setReportsHeatmap] = useState(null);
  const [viewMode, setViewMode] = useState('clusters');
  const [accuracy, setAccuracy] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('');
  
  // Data State
  const [currentPredictions, setCurrentPredictions] = useState(null);
  const [historicalPredictions, setHistoricalPredictions] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Interaction State
  const [focusedItem, setFocusedItem] = useState(null);
  
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
      console.error('Failed to load raw reports for heatmap:', err);
    }
  };

  const loadAccuracy = async () => {
    try {
      const data = await getAccuracyMetrics('monthly');
      setAccuracy(data.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load accuracy metrics:', err);
    }
  };

  const loadCurrentPredictions = async () => {
    try {
      const data = await getCurrentPredictions('monthly');
      setCurrentPredictions(data.data);
    } catch (err) {
      console.error('Failed to load current predictions:', err);
    }
  };

  const loadAvailableDates = async () => {
    try {
      const data = await getAvailablePredictionDates();
      
      let dates = data.data || [];
      setAvailableDates(dates);

      if (dates.length > 0) {
        setSelectedDate(dates[dates.length - 1]); // default to latest
        loadHistoricalForDate(dates[dates.length - 1]);
      }
    } catch (err) {
      console.error('Failed to load available dates:', err);
    }
  };

  const loadHistoricalForDate = async (dateStr) => {
    try {
      const data = await fetchPredictions({ startDate: dateStr, endDate: dateStr });
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

      setHistoricalPredictions({
        region_analyses,
        geojson: { type: 'FeatureCollection', features }
      });
    } catch (err) {
      console.error('Failed to load historical data:', err);
    }
  };

  const handleDateChange = (newDate) => {
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

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
      
            {/* Main Map Area */}
      <div className="flex-1 relative h-full">
      {/* HUD Header */}
      <CommandHUD 
        accuracy={accuracy} 
        lastUpdated={lastUpdated} 
        viewMode={viewMode} 
        setViewMode={setViewMode} 
      />

      {/* Main Canvas Background */}
      <TacticalCanvas 
        predictions={currentDataWithHeatmap} 
        timeHorizon={activeTab === 'historical' ? 'historical' : 'monthly'} 
        viewMode={viewMode}
        focusedItem={focusedItem}
      />

      

      {/* Bottom Timeline Scrubber */}
      <TimePlayer 
        dates={availableDates}
        currentDate={activeTab === 'historical' ? selectedDate : null}
        onDateChange={handleDateChange}
        isProjective={activeTab === 'current'}
      />

      {/* Control Switcher (Live vs Historical) */}
      <div className="absolute top-24 left-8 z-[1000] flex flex-col gap-2 pointer-events-auto">
         <button 
           onClick={() => {
             setActiveTab('current');
             setFocusedItem(null);
           }}
           className={`px-6 py-3 font-bold font-mono tracking-widest uppercase border-2 flex items-center gap-3 transition-colors ${
             activeTab === 'current' ? 'bg-primary text-white border-primary' : 'bg-surface text-text-primary border-border hover:border-text-primary'
           }`}
         >
           <div className={`w-3 h-3 rounded-full ${activeTab === 'current' ? 'bg-white animate-pulse' : 'bg-text-muted'}`}></div>
           Live / Projected
         </button>
         <button 
           onClick={() => {
             setActiveTab('historical');
             if (availableDates.length > 0) handleDateChange(availableDates[availableDates.length - 1]);
           }}
           className={`px-6 py-3 font-bold font-mono tracking-widest uppercase border-2 flex items-center gap-3 transition-colors ${
             activeTab === 'historical' ? 'bg-text-primary text-background border-text-primary' : 'bg-surface text-text-primary border-border hover:border-text-primary'
           }`}
         >
           <div className={`w-3 h-3 rounded-full ${activeTab === 'historical' ? 'bg-background' : 'bg-text-muted'}`}></div>
           Retrospective
         </button>
      </div>
      </div>
      {/* Right Side Feed Panel */}
      <div className="w-96 h-full border-l border-border bg-surface relative z-[1001]">
        {/* Right Side Feed */}
      <DynamicFeed 
        items={feedItems}
        onClick={(item) => {
          setFocusedItem(item);
          setActiveTab('current'); // If click, snap to current
        }}
        className="w-full h-full pt-24 pb-8 px-4"
        />
      </div>
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
