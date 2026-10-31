'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { patternColor, patternLabel } from '../../lib/historical-patterns.mjs';
import { PASIG_CENTER, PASIG_BOUNDS, PASIG_MIN_ZOOM } from '@/lib/map/pasigMapConstants'
function Focus({ pattern }) {
  const map = useMap();
  useEffect(() => { if (pattern) map.stop().setView([pattern.center_lat, pattern.center_lng], 16, {animate:false}); }, [map, pattern]);
  return null;
}
export default function HistoricalPatternMap({ data, selected, onSelect, snapshot, windowKey }) {
  return <MapContainer center={PASIG_CENTER} zoom={13} maxBounds={PASIG_BOUNDS} maxBoundsViscosity={1} minZoom={PASIG_MIN_ZOOM} style={{height:'100%',width:'100%'}} aria-label="Observed density clusters map">
    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
    <Focus pattern={selected} />
    <GeoJSON key={`${snapshot}-${windowKey}`} data={data} style={f => ({ color:patternColor(f.properties.pattern), weight:2, fillOpacity:0.24 })}
      onEachFeature={(f, layer) => {
        const p=f.properties, label=`${patternLabel(p.pattern)} · ${p.report_count} reports`;
        const tooltip=document.createElement('span');tooltip.textContent=label;layer.bindTooltip(tooltip);
        const choose=()=>onSelect(p.anchor_ids[0]);layer.on('click',choose);
        layer.on('add',()=>{ const path=layer.getElement();if(path){path.setAttribute('tabindex','0');path.setAttribute('role','button');path.setAttribute('aria-label',label);path.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});} });
      }} />
  </MapContainer>;
}
