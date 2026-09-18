'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// ─────────────────────────────────────────────────────────────────────────────
// Heatmap Layer
// Renders raw report coordinates as a smooth density heatmap using leaflet.heat
// ─────────────────────────────────────────────────────────────────────────────
function HeatmapLayer({ heatmapData }) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!heatmapData) return;

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    const heatPoints = (heatmapData.features || [])
      .filter(f => f.geometry?.coordinates && f.properties?.intensity)
      .map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0], f.properties.intensity]);

    if (heatPoints.length > 0) {
      // @ts-ignore
      const heatLayer = L.heatLayer(heatPoints, {
        radius: 30,
        blur: 20,
        maxZoom: 18,
        max: 1.0,
        gradient: { 0.0: '#00bfff', 0.3: '#00ff88', 0.55: '#ffdd00', 0.75: '#ff8800', 1.0: '#ff2200' },
      }).addTo(map);
      heatLayerRef.current = heatLayer;
    }

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
        heatLayerRef.current = null;
      }
    };
  }, [heatmapData, map]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cluster Label Markers
// Renders numbered rank badges at each cluster centroid
// ─────────────────────────────────────────────────────────────────────────────
function ClusterLabelMarkers({ features }) {
  const map = useMap();
  const markersRef = useRef([]);

  useEffect(() => {
    // Remove old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (!features || features.length === 0) return;

    features.forEach(feature => {
      const { rank, risk_level, report_count } = feature.properties || {};
      const lat = feature.properties?.center_lat;
      const lng = feature.properties?.center_lng;
      if (!lat || !lng) return;

      const bgColor = risk_level === 'high'
        ? '#ef4444'
        : risk_level === 'medium'
        ? '#f97316'
        : '#22c55e';

      const icon = L.divIcon({
        html: `
          <div style="
            background: ${bgColor};
            color: white;
            font-weight: 700;
            font-size: 12px;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.35);
            font-family: sans-serif;
          ">#${rank || '?'}</div>
        `,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([lat, lng], { icon, interactive: false }).addTo(map);
      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach(m => map.removeLayer(m));
      markersRef.current = [];
    };
  }, [features, map]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Map auto-fit
// ─────────────────────────────────────────────────────────────────────────────
function MapBoundsFitter({ geojsonData, heatmapData }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current) return;

    // Prefer cluster bounds; fall back to heatmap bounds
    const source = geojsonData?.features?.length > 0 ? geojsonData : heatmapData;
    if (!source?.features?.length) return;

    try {
      const bounds = L.geoJSON(source).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [60, 60] });
        fitted.current = true;
      }
    } catch (e) {
      console.error('fitBounds error', e);
    }
  }, [geojsonData, heatmapData, map]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Map Component
// ─────────────────────────────────────────────────────────────────────────────
export default function HotspotForecastMap({ predictions, timeHorizon }) {
  const [geojsonData, setGeoJsonData] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [viewMode, setViewMode] = useState('both');
  const [mapKey, setMapKey] = useState(0);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    setIsDark(html.classList.contains('dark'));
    const observer = new MutationObserver(() => {
      setIsDark(html.classList.contains('dark'));
    });
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!predictions) return;

    if (predictions.geojson) {
      setGeoJsonData(predictions.geojson);
    }
    if (predictions.heatmap_geojson) {
      setHeatmapData(predictions.heatmap_geojson);
    }
    // Force re-mount map when data changes to avoid stale layers
    setMapKey(k => k + 1);
  }, [predictions]);

  // ── Style for cluster polygons ──────────────────────────────────────────────
  const getFeatureStyle = (feature) => {
    const risk = feature.properties?.risk_level || 'low';
    const score = feature.properties?.risk_score || 0;

    const fill = { high: '#ef4444', medium: '#f97316', low: '#22c55e' }[risk] || '#22c55e';
    const stroke = { high: '#b91c1c', medium: '#c2410c', low: '#15803d' }[risk] || '#15803d';

    return {
      fillColor: fill,
      color: stroke,
      weight: 2,
      opacity: 0.9,
      fillOpacity: 0.25 + score * 0.3,
      dashArray: null,
    };
  };

  // ── Popup content ───────────────────────────────────────────────────────────
  const onEachFeature = (feature, layer) => {
    const p = feature.properties || {};
    const breakdown = p.issue_breakdown || {};
    const breakdownHtml = Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `
        <div style="display:flex;justify-content:space-between;gap:12px;padding:2px 0">
          <span style="text-transform:capitalize">${type.replace(/_/g, ' ')}</span>
          <strong>${count}</strong>
        </div>`)
      .join('') || '<div style="color:#aaa">No breakdown available</div>';

    const riskColor = { high: '#ef4444', medium: '#f97316', low: '#22c55e' }[p.risk_level] || '#22c55e';

    layer.bindPopup(`
      <div style="font-family:system-ui,sans-serif;min-width:220px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <div style="
            background:${riskColor};color:#fff;font-weight:700;font-size:13px;
            width:28px;height:28px;border-radius:50%;display:flex;align-items:center;
            justify-content:center;flex-shrink:0
          ">#${p.rank || '?'}</div>
          <div>
            <div style="font-weight:700;font-size:14px">Cluster #${p.rank || '?'}</div>
            <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.04em">${p.risk_level || 'unknown'} risk</div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:10px">
          <tr><td style="color:#666;padding:3px 0">Reports</td><td style="text-align:right;font-weight:600">${p.report_count ?? 'N/A'}</td></tr>
          <tr><td style="color:#666;padding:3px 0">Risk Score</td><td style="text-align:right;font-weight:600">${p.risk_score != null ? (p.risk_score * 100).toFixed(0) + '%' : 'N/A'}</td></tr>
          <tr><td style="color:#666;padding:3px 0">Top Issue</td><td style="text-align:right;font-weight:600;text-transform:capitalize">${(p.top_issue_type || 'N/A').replace(/_/g, ' ')}</td></tr>
          <tr><td style="color:#666;padding:3px 0">Center</td><td style="text-align:right;font-size:11px;font-family:monospace">${p.center_lat?.toFixed(5)}, ${p.center_lng?.toFixed(5)}</td></tr>
        </table>

        <div style="font-size:12px;font-weight:600;color:#555;margin-bottom:4px">Issue Breakdown</div>
        <div style="font-size:12px;border-top:1px solid #eee;padding-top:6px">${breakdownHtml}</div>
      </div>
    `, { maxWidth: 280 });

    layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.55, weight: 3 }));
    layer.on('mouseout', () => layer.setStyle(getFeatureStyle(feature)));
  };

  const clusterFeatures = geojsonData?.features || [];
  const heatmapFeatures = heatmapData?.features || [];
  const hasData = clusterFeatures.length > 0 || heatmapFeatures.length > 0;

  // Force viewMode to clusters if no heatmap data is available
  useEffect(() => {
    if (heatmapFeatures.length === 0 && viewMode !== 'clusters') {
      setViewMode('clusters');
    }
  }, [heatmapFeatures.length, viewMode]);

  const showClusters = viewMode === 'clusters' || viewMode === 'both';
  const showHeatmap = viewMode === 'heatmap' || viewMode === 'both';

  const ViewToggle = ({ id, label, active, onClick, disabled }) => (
    <button
      id={id}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 14px',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: 600,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        backgroundColor: active ? 'var(--primary)' : 'transparent',
        color: active ? '#fff' : 'var(--text-secondary)',
        opacity: disabled ? 0.5 : 1
      }}
    >
      {label}
    </button>
  );

  if (!hasData) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 12, color: '#6b7280',
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
        </svg>
        <p style={{ margin: 0, fontSize: 14 }}>
          {timeHorizon === 'historical' 
            ? 'No historical data available for this range. Try selecting different dates.' 
            : <span>No hotspot data yet. Click <strong>Generate Forecast</strong> to analyse clusters.</span>}
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* View mode toggle */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 400,
        background: 'var(--surface-elevated)', borderRadius: '8px', padding: '6px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '6px',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <ViewToggle id="view-heatmap" label="Heatmap" active={viewMode === 'heatmap'} onClick={() => setViewMode('heatmap')} disabled={heatmapFeatures.length === 0} />
          <ViewToggle id="view-clusters" label="Clusters" active={viewMode === 'clusters'} onClick={() => setViewMode('clusters')} />
          <ViewToggle id="view-both" label="Both" active={viewMode === 'both'} onClick={() => setViewMode('both')} disabled={heatmapFeatures.length === 0} />
        </div>
        {heatmapFeatures.length === 0 && (
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '200px', alignSelf: 'center' }}>
            *Generate Forecast* for raw Heatmap
          </div>
        )}
      </div>

      {/* Cluster count badge */}
      {clusterFeatures.length > 0 && (
        <div style={{
          position: 'absolute', top: 12, left: 12, zIndex: 1000,
          background: 'white', borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,.15)',
          padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#374151',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            background: '#ef4444', color: 'white', borderRadius: '50%',
            width: 22, height: 22, display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 12, fontWeight: 700,
          }}>
            {clusterFeatures.length}
          </span>
          {clusterFeatures.length === 1 ? 'Hotspot Cluster' : 'Hotspot Clusters'}
        </div>
      )}

      <MapContainer
        key={mapKey}
        center={[14.5995, 120.9842]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className={isDark ? 'dark-mode-tiles' : ''}
        />

        <MapBoundsFitter geojsonData={geojsonData} heatmapData={heatmapData} />

        {/* Heatmap layer */}
        {showHeatmap && heatmapData && <HeatmapLayer heatmapData={heatmapData} />}

        {/* Cluster polygon layer */}
        {showClusters && geojsonData && geojsonData.features.length > 0 && (
          <GeoJSON
            key={JSON.stringify(geojsonData).slice(0, 40)}
            data={geojsonData}
            style={getFeatureStyle}
            onEachFeature={onEachFeature}
          />
        )}

        {/* Cluster rank labels */}
        {showClusters && clusterFeatures.length > 0 && (
          <ClusterLabelMarkers features={clusterFeatures} />
        )}
      </MapContainer>
    </div>
  );
}
