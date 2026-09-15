'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

function HeatmapLayer({ heatmapData }) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!heatmapData) return;

    // Remove existing heat layer
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    // Convert heatmap GeoJSON to leaflet.heat format [lat, lng, intensity]
    const heatPoints = heatmapData.features
      .filter(feature => feature.geometry?.coordinates && feature.properties?.intensity)
      .map(feature => {
        const coords = feature.geometry.coordinates;
        const intensity = feature.properties.intensity;
        return [coords[1], coords[0], intensity]; // [lat, lng, intensity]
      });

    if (heatPoints.length > 0) {
      // Create heat layer using leaflet.heat
      // @ts-ignore - leaflet.heat extends Leaflet
      const heatLayer = L.heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 15,
        max: 1.0,
        gradient: {
          0.0: 'green',
          0.3: 'yellow',
          0.6: 'orange',
          1.0: 'red'
        }
      }).addTo(map);
      
      heatLayerRef.current = heatLayer;
    }

    // Cleanup
    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [heatmapData]); // Removed map from dependencies to prevent re-render issues

  return null;
}

export default function HotspotForecastMap({ predictions, timeHorizon }) {
  const [geojsonData, setGeoJsonData] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [mapCenter, setMapCenter] = useState([14.5995, 120.9842]); // Default to Manila
  const [mapZoom, setMapZoom] = useState(11);
  const [viewMode, setViewMode] = useState('both'); // 'heatmap', 'grid', 'both'

  useEffect(() => {
    if (predictions && predictions.geojson) {
      setGeoJsonData(predictions.geojson);
      
      // Calculate center from first feature if available
      if (predictions.geojson.features && predictions.geojson.features.length > 0) {
        const firstFeature = predictions.geojson.features[0];
        const coords = firstFeature.geometry.coordinates[0][0]; // First point of polygon
        setMapCenter([coords[1], coords[0]]); // Leaflet uses [lat, lon]
      }
    }
    
    if (predictions && predictions.heatmap_geojson) {
      setHeatmapData(predictions.heatmap_geojson);
    }
  }, [predictions]);

  const getFeatureStyle = (feature) => {
    const riskLevel = feature.properties?.risk_level || 'low';
    const riskScore = feature.properties?.risk_score || 0;
    
    const colors = {
      high: '#ff0000',
      medium: '#ffff00',
      low: '#00ff00',
    };
    
    return {
      fillColor: colors[riskLevel] || colors.low,
      weight: 2,
      opacity: 1,
      color: '#333',
      dashArray: '3',
      fillOpacity: 0.5 + (riskScore * 0.3), // Higher opacity for higher risk
    };
  };

  const onEachFeature = (feature, layer) => {
    const props = feature.properties || {};
    
    layer.bindPopup(`
      <div className="p-2">
        <h3 className="font-bold text-lg">Hotspot Details</h3>
        <p><strong>Region ID:</strong> ${props.region_id || 'N/A'}</p>
        <p><strong>Risk Level:</strong> ${props.risk_level || 'N/A'}</p>
        <p><strong>Risk Score:</strong> ${(props.risk_score * 100).toFixed(1)}%</p>
        <p><strong>Report Count:</strong> ${props.report_count || 0}</p>
        <p><strong>Center:</strong> ${props.center_lat?.toFixed(4) || 'N/A'}, ${props.center_lng?.toFixed(4) || 'N/A'}</p>
        <p><strong>Gi* Statistic:</strong> ${props.gi_star?.toFixed(4) || 'N/A'}</p>
        <p><strong>P-Value:</strong> ${props.p_value?.toFixed(6) || 'N/A'}</p>
      </div>
    `);
  };

  if (!geojsonData) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <p className="text-gray-500">No hotspot data available</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[600px] rounded-lg overflow-hidden border border-gray-300">
      {/* View mode toggle */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-2 flex gap-2">
        <button
          onClick={() => setViewMode('heatmap')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            viewMode === 'heatmap' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Heatmap
        </button>
        <button
          onClick={() => setViewMode('grid')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            viewMode === 'grid' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Grid Cells
        </button>
        <button
          onClick={() => setViewMode('both')}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            viewMode === 'both' 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Both
        </button>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Heatmap layer - displayed below grid cells */}
        {(viewMode === 'heatmap' || viewMode === 'both') && heatmapData && (
          <HeatmapLayer heatmapData={heatmapData} />
        )}
        
        {/* Grid cell layer - displayed on top for operational purposes */}
        {(viewMode === 'grid' || viewMode === 'both') && geojsonData && (
          <GeoJSON
            data={geojsonData}
            style={getFeatureStyle}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
    </div>
  );
}
