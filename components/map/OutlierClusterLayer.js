import React from 'react';
import { useMap, Popup } from 'react-leaflet';
import L from 'leaflet';
import ClusterMarker from './ClusterMarker';
import wkx from 'wkx';
import { Buffer } from 'buffer';

if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}

const parseGeometry = (geometry) => {
  if (!geometry) return null
  try {
    if (typeof geometry === 'string' && geometry.startsWith('{')) {
      const geoJSON = JSON.parse(geometry)
      if (geoJSON.type === 'Point' && geoJSON.coordinates) {
        return [geoJSON.coordinates[1], geoJSON.coordinates[0]] 
      }
    } else if (typeof geometry === 'string') {
      const buffer = Buffer.from(geometry, 'hex')
      const parsed = wkx.Geometry.parse(buffer)
      if (parsed && parsed.x && parsed.y) {
        return [parsed.y, parsed.x]
      }
    } else if (typeof geometry === 'object' && geometry.type === 'Point') {
      const [lng, lat] = geometry.coordinates
      return [lat, lng]
    } else if (Buffer.isBuffer(geometry)) {
      const parsed = wkx.Geometry.parse(geometry)
      if (parsed && parsed.x && parsed.y) {
        return [parsed.y, parsed.x]
      }
    }
  } catch (error) {
    reportDiagnostic('error', 'map', 'Error parsing geometry:', error)
  }
  return null
}

const normalizeString = (str) => {
  if (!str) return '';
  return str.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

import { useRouter } from 'next/navigation';
import { reportDiagnostic } from '../../lib/diagnostics.mjs';

export default function OutlierClusterLayer({ clusters, selectedTemplate, onClusterClick, selectionMode, onClusterSelect, clusterReportsMap, selectedReports = [] }) {
  const router = useRouter();
  const map = useMap();
  const selectedIds = new Set(selectedReports.map(String));

  if (!clusters || clusters.length === 0) return null;

  return (
    <>
      {clusters.map((cluster) => {
        const center = parseGeometry(cluster.center || cluster.location)
        if (!center) return null

        const hasSlaBreach = (clusterReportsMap?.[cluster.id] || []).some(
          report => report.breached_at != null || report.lifecycle_state === 'sla_breached'
        )
        
        // 30% opacity for non-selected template
        let opacity = 1.0;
        if (selectedTemplate === 'sweeper' && !hasSlaBreach) opacity = 0.3;

        const members = clusterReportsMap?.[cluster.id] || [];
        const selectedCount = members.filter(report => selectedIds.has(String(report.id))).length;

        const handleZoomAndExpand = (e) => {
          if (e && e.originalEvent) {
            e.originalEvent.stopPropagation();
          }
          if (map) {
            map.closePopup();
            const targetZoom = Math.max(map.getZoom() + 3, 17);
            if (members.length > 0) {
              const points = members
                .map(m => {
                  const lat = m.parsedLat != null ? m.parsedLat : m.latitude;
                  const lng = m.parsedLng != null ? m.parsedLng : m.longitude;
                  if (lat && lng) return [Number(lat), Number(lng)];
                  return parseGeometry(m.location);
                })
                .filter(Boolean);
              if (points.length > 1) {
                const lBounds = L.latLngBounds(points);
                // If points are at the exact same coordinate, fitBounds will not zoom properly; use flyTo instead
                if (lBounds.getNorthEast().equals(lBounds.getSouthWest())) {
                  map.flyTo(center, targetZoom, { duration: 0.6 });
                } else {
                  map.fitBounds(lBounds, { padding: [50, 50], maxZoom: 17, animate: true });
                }
              } else {
                map.flyTo(center, targetZoom, { duration: 0.6 });
              }
            } else {
              map.flyTo(center, targetZoom, { duration: 0.6 });
            }
          }
        };

        return (
          <ClusterMarker
            key={cluster.id}
            position={center}
            count={members.length || cluster.report_count || 0}
            selectedCount={selectedCount}
            overdue={hasSlaBreach}
            label={`${normalizeString(cluster.issue_type) || 'Report'} cluster`}
            opacity={opacity}
            eventHandlers={{
              click: (e) => {
                if (onClusterClick) onClusterClick(cluster.id);
              },
              dblclick: handleZoomAndExpand
            }}
          >
            <Popup>
              <div className="p-2 min-w-[210px]">
                <div className={`text-xs font-semibold mb-1 tracking-wider uppercase ${hasSlaBreach ? 'text-red-600' : 'text-blue-600'}`}>
                  {hasSlaBreach ? 'CLUSTER WITH BREACHED REPORT' : 'STANDARD CLUSTER'} #{cluster.id}
                </div>
                <strong className="block text-sm text-gray-800 mb-1">
                  {normalizeString(cluster.issue_type)}
                </strong>
                <div className="text-xs space-y-1 text-gray-600 mb-3">
                  <div><span className="text-gray-500">Reports:</span> <span className="font-medium text-gray-800">{cluster.report_count}</span></div>
                  <div>
                    <span className="text-gray-500">Severity:</span>{' '}
                    <span className={`font-medium ${cluster.severity === 'high' ? 'text-red-600' : cluster.severity === 'medium' ? 'text-orange-500' : 'text-blue-500'}`}>
                      {cluster.severity?.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleZoomAndExpand(e);
                    }}
                    className="w-full bg-[#0052cc] text-white text-xs font-semibold py-1.5 px-2 rounded hover:bg-[#0747a6] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>🔍 Zoom & Expand Pins</span>
                  </button>

                  {selectionMode && onClusterSelect ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (members.length > 0) {
                          onClusterSelect(members.map(r => r.id));
                        }
                      }}
                      className="w-full bg-gray-100 text-gray-800 text-xs font-medium py-1.5 px-2 rounded hover:bg-gray-200 transition-colors"
                    >
                      Select All Reports
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/officer/hotzone-intel/${cluster.id}`);
                      }}
                      className="w-full border border-gray-300 text-gray-700 text-xs font-medium py-1.5 px-2 rounded hover:bg-gray-50 transition-colors"
                    >
                      View Cluster Details →
                    </button>
                  )}
                </div>
              </div>
            </Popup>
          </ClusterMarker>
        );
      })}
    </>
  );
}
