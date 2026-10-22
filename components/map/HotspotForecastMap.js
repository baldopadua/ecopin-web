'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertCircle } from 'lucide-react';
import { reportDiagnostic } from '../../lib/diagnostics.mjs';

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

// These templates interpolate data only into HTML text, never attributes or styles.
const escapePopupText = (value) => {
  if (typeof value !== 'string' && !Number.isFinite(value)) return 'N/A';
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
};
const riskLevel = value => ['high', 'medium', 'low'].includes(value) ? value : 'unknown';
const coordinateText = (value, limit) => Number.isFinite(value) && Math.abs(value) <= limit ? value.toFixed(5) : 'N/A';

if (typeof window !== 'undefined') {
  window.L = L;
  require('leaflet.heat');
}

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

    const render = () => {
      const container = map.getContainer();
      if (!heatPoints.length || !container.clientWidth || !container.clientHeight) return;
      map.invalidateSize({ pan: false });
      if (heatLayerRef.current) return;
      const heatLayer = L.heatLayer(heatPoints, {
        radius: 30,
        blur: 20,
        maxZoom: 18,
        max: 1.0,
        gradient: { 0.0: '#00bfff', 0.3: '#00ff88', 0.55: '#ffdd00', 0.75: '#ff8800', 1.0: '#ff2200' },
      }).addTo(map);
      heatLayerRef.current = heatLayer;
    };
    // Compact view can mount Leaflet inside a hidden panel with a zero-size canvas.
    const observer = new ResizeObserver(render);
    observer.observe(map.getContainer());
    render();

    return () => {
      observer.disconnect();
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
      if (!Number.isFinite(rank)) return;
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
          ">#${escapePopupText(rank || '?')}</div>
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
        map.fitBounds(bounds, { padding: [60, 60], animate: false });
        fitted.current = true;
      }
    } catch (e) {
      reportDiagnostic('error', 'forecast', 'fitBounds error', e);
    }
  }, [geojsonData, heatmapData, map]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Map Focus Manager
// ─────────────────────────────────────────────────────────────────────────────
function MapFocusManager({ focusedItem }) {
  const map = useMap();

  useEffect(() => {
     if (focusedItem?.properties?.center_lat && focusedItem?.properties?.center_lng) {
        map.flyTo([focusedItem.properties.center_lat, focusedItem.properties.center_lng], 16, { animate: true, duration: 1.5 });
     }
  }, [focusedItem, map]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Map Component
// ─────────────────────────────────────────────────────────────────────────────
export default function HotspotForecastMap({ predictions, timeHorizon, viewModeOverride, focusedItem, onZoneSelect, hideUI }) {
  const geojsonData = predictions?.geojson || null;
  const heatmapData = predictions?.heatmap_geojson || null;
  const [userViewMode, setViewMode] = useState('both');
  const mapKey = 0;
  const [isDark, setIsDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(html.classList.contains('dark'));
    });
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const sanitizedGeoJson = useMemo(() => {
    if (!geojsonData?.features || !Array.isArray(geojsonData.features)) {
      return { type: 'FeatureCollection', features: [] };
    }

    const validFeatures = geojsonData.features
      .map(feature => {
        if (!feature || typeof feature !== 'object') return null;
        let geometry = feature.geometry;

        const hasCoords = geometry && Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0;
        if (!hasCoords && !feature.properties?.zone_id) {
          const lat = feature.properties?.center_lat;
          const lng = feature.properties?.center_lng;
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            const radiusDeg = (feature.properties?.region_radius_meters || 100) / 111000.0;
            const ring = [];
            const numPts = 32;
            for (let i = 0; i < numPts; i++) {
              const angle = (i / numPts) * 2 * Math.PI;
              ring.push([
                lng + radiusDeg * Math.cos(angle),
                lat + radiusDeg * Math.sin(angle),
              ]);
            }
            ring.push(ring[0]);
            geometry = { type: 'Polygon', coordinates: [ring] };
          }
        }

        if (!geometry || !Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
          return null;
        }

        if (geometry.type === 'Polygon') {
          const ring = geometry.coordinates[0];
          if (!Array.isArray(ring) || ring.length < 3 || ring.some(pt => !Array.isArray(pt) || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1]))) {
            return null;
          }
        }

        return {
          type: 'Feature',
          ...feature,
          geometry,
        };
      })
      .filter(Boolean);

    return {
      type: 'FeatureCollection',
      features: validFeatures,
    };
  }, [geojsonData]);

  // ── Style for cluster polygons ──────────────────────────────────────────────
  const getFeatureStyle = (feature) => {
    const risk = riskLevel(feature.properties?.risk_level);
    const fill = { high: '#EF4444', medium: '#F59E0B', low: '#10B981' }[risk] || '#10B981';
    const stroke = { high: '#b91c1c', medium: '#c2410c', low: '#15803d' }[risk] || '#15803d';

    const isFocused = focusedItem?.properties?.region_id && focusedItem.properties.region_id === feature.properties?.region_id;

    return {
      fillColor: fill,
      color: isFocused ? '#0052cc' : stroke,
      weight: isFocused ? 4 : 2,
      opacity: isFocused ? 1 : 0.9,
      fillOpacity: isFocused ? 0.6 : ({ high: 0.45, medium: 0.35, low: 0.20 }[risk] || 0.20),
      dashArray: null,
    };
  };

  // ── Popup content ───────────────────────────────────────────────────────────
  const onEachFeature = (feature, layer) => {
    if (!layer || typeof layer.bindPopup !== 'function') return;
    const p = feature.properties || {};
    if (p.zone_id && onZoneSelect) {
      layer.bindTooltip(`${escapePopupText(p.display_name || p.zone_name || p.zone_id)} · ${escapePopupText(p.predicted_count)} expected reports · ${riskLevel(p.risk_level)} risk`);
      layer.on('click', () => onZoneSelect(feature));
      layer.on('add', () => {
        const element = layer.getElement();
        if (!element) return;
        element.setAttribute('tabindex', '0');
        element.setAttribute('role', 'button');
        element.setAttribute('aria-label', `${p.display_name || p.zone_name || p.zone_id}: ${p.risk_level} risk, ${p.predicted_count} expected reports. View trend.`);
        element.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onZoneSelect(feature); }
        });
      });
      return;
    }
    const breakdown = p.issue_breakdown && typeof p.issue_breakdown === 'object' && !Array.isArray(p.issue_breakdown) ? p.issue_breakdown : {};
    const breakdownHtml = Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `
        <div style="display:flex;justify-content:space-between;gap:12px;padding:2px 0">
          <span style="text-transform:capitalize">${escapePopupText(type.replace(/_/g, ' '))}</span>
          <strong>${escapePopupText(count)}</strong>
        </div>`)
      .join('') || '<div style="color:#aaa">No breakdown available</div>';

    const risk = riskLevel(p.risk_level);
    const riskColor = { high: '#ef4444', medium: '#f97316', low: '#22c55e' }[risk] || '#22c55e';

    layer.bindPopup(`
      <div style="font-family:system-ui,sans-serif;min-width:220px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <div style="
            background:${riskColor};color:#fff;font-weight:700;font-size:13px;
            width:28px;height:28px;border-radius:50%;display:flex;align-items:center;
            justify-content:center;flex-shrink:0
          ">#${escapePopupText(p.rank || '?')}</div>
          <div>
            <div style="font-weight:700;font-size:14px">Cluster #${escapePopupText(p.rank || '?')}</div>
            <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.04em">${risk} risk</div>
          </div>
        </div>

        <dl style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:14px;margin:0 0 10px;color:var(--text-primary)">
          <dt>Reports</dt><dd style="margin:0;text-align:right;font-weight:600">${escapePopupText(p.report_count ?? 'N/A')}</dd>
          <dt>Risk score</dt><dd style="margin:0;text-align:right;font-weight:600">${Number.isFinite(p.risk_score) && p.risk_score >= 0 && p.risk_score <= 1 ? (p.risk_score * 100).toFixed(0) + '%' : 'N/A'}</dd>
          <dt>Top issue</dt><dd style="margin:0;text-align:right;font-weight:600;text-transform:capitalize">${escapePopupText(typeof p.top_issue_type === 'string' ? p.top_issue_type.replace(/_/g, ' ') : 'N/A')}</dd>
          <dt>Center</dt><dd style="margin:0;text-align:right;font-size:12px">${coordinateText(p.center_lat, 90)}, ${coordinateText(p.center_lng, 180)}</dd>
        </dl>

        <div style="font-size:12px;font-weight:600;color:#555;margin-bottom:4px">Issue Breakdown</div>
        <div style="font-size:12px;border-top:1px solid #eee;padding-top:6px">${breakdownHtml}</div>
      </div>
    `, { maxWidth: 280 });

    if (typeof layer.setStyle === 'function') {
      layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.55, weight: 3 }));
      layer.on('mouseout', () => layer.setStyle(getFeatureStyle(feature)));
    }
  };

  const clusterFeatures = sanitizedGeoJson.features;
  const heatmapFeatures = heatmapData?.features || [];
  const hasData = clusterFeatures.length > 0 || heatmapFeatures.length > 0;

  const viewMode = viewModeOverride || (heatmapFeatures.length ? userViewMode : 'clusters');

  const showClusters = viewMode === 'clusters' || viewMode === 'both';
  const showHeatmap = viewMode === 'heatmap' || viewMode === 'both';


  if (!hasData) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: 12, color: 'var(--text-muted)',
      }}>
        <AlertCircle size={40} strokeWidth={1.5} aria-hidden="true" />
        <p style={{ margin: 0, fontSize: 14 }}>
          {timeHorizon === 'historical' 
            ? 'No historical data available for this range. Try selecting different dates.' 
            : <span>No forecast zones are available.</span>}
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* View mode toggle */}
      {!hideUI && (
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 400,
        background: 'var(--surface-elevated)', borderRadius: '8px', padding: '6px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '6px',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <ViewToggle id="view-heatmap" label="Heatmap" active={viewMode === 'heatmap'} onClick={() => setViewMode('heatmap')} disabled={heatmapFeatures.length === 0} />
          <ViewToggle id="view-clusters" label="Zones" active={viewMode === 'clusters'} onClick={() => setViewMode('clusters')} />
          <ViewToggle id="view-both" label="Both" active={viewMode === 'both'} onClick={() => setViewMode('both')} disabled={heatmapFeatures.length === 0} />
        </div>
        {heatmapFeatures.length === 0 && (
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '200px', alignSelf: 'center' }}>
            Awaiting real-time heatmap data...
          </div>
        )}
      </div>
      )}

      {/* Cluster count badge */}
      {!hideUI && clusterFeatures.length > 0 && (
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
          {clusterFeatures.length === 1 ? 'Forecast zone' : 'Forecast zones'}
        </div>
      )}

      <MapContainer
        key={mapKey}
        center={[14.5764, 121.0851]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className={isDark ? 'dark-mode-tiles' : ''}
        />

        <MapBoundsFitter geojsonData={sanitizedGeoJson} heatmapData={heatmapData} />
        <MapFocusManager focusedItem={focusedItem} />

        {/* Heatmap layer */}
        {showHeatmap && heatmapData && <HeatmapLayer heatmapData={heatmapData} />}

        {/* Cluster polygon layer */}
        {showClusters && clusterFeatures.length > 0 && (
          <GeoJSON
            key={`zones-${timeHorizon}-${(sanitizedGeoJson.features || []).map(f => `${f.properties?.zone_id || f.properties?.region_id || ''}-${f.properties?.risk_level || ''}-${f.properties?.predicted_count || ''}-${f.properties?.future_step_date || ''}`).join('|')}`}
            data={sanitizedGeoJson}
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
