'use client';

import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

export default function BackgroundMap({ isDark }) {
  // Coordinates for Pasig City
  const position = [14.5802, 121.0850];

  // We want the map to be subtle. We can use a map style that is minimal, or apply CSS filters.
  // CartoDB Positron or Dark Matter are good for this.
  const apiKey = process.env.NEXT_PUBLIC_CARTO_API_KEY ? `?key=${process.env.NEXT_PUBLIC_CARTO_API_KEY}` : '';
  const mapUrl = isDark
    ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png${apiKey}`
    : `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png${apiKey}`;

  return (
    <div className="absolute inset-0 z-0 pointer-events-auto" style={{ filter: isDark ? 'grayscale(100%) contrast(1.2)' : 'grayscale(100%) contrast(1.2)' }}>
      <MapContainer
        center={position}
        zoom={30}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full"
      >
        <TileLayer url={mapUrl} />
      </MapContainer>
    </div>
  );
}
