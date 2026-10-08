import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
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
    console.error('Error parsing geometry:', error)
  }
  return null
}

const normalizeString = (str) => {
  if (!str) return '';
  return str.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

import { useRouter } from 'next/navigation';

export default function OutlierClusterLayer({ clusters, selectedTemplate, onClusterClick, selectionMode, onClusterSelect, clusterReportsMap }) {
  const router = useRouter();

  if (!clusters || clusters.length === 0) return null;

  return (
    <>
      <style jsx global>{`
        .cluster-marker {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cluster-border.red {
          border: 3px solid #dc3545;
          border-radius: 50%;
          background: rgba(220, 53, 69, 0.2);
          width: 40px;
          height: 40px;
        }

        .cluster-border.blue {
          border: 3px solid #007bff;
          border-radius: 50%;
          background: rgba(0, 123, 255, 0.2);
          width: 40px;
          height: 40px;
        }

        .cluster-content {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          font-weight: bold;
          color: white;
        }

        .alert-icon {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #ffc107;
          border-radius: 50%;
          padding: 2px;
          font-size: 12px;
          line-height: 1;
        }
      `}</style>

      {clusters.map((cluster) => {
        const center = parseGeometry(cluster.center || cluster.location)
        if (!center) return null

        const hasSlaBreach = (clusterReportsMap?.[cluster.id] || []).some(
          report => report.breached_at != null || report.lifecycle_state === 'sla_breached'
        )
        
        // 30% opacity for non-selected template
        let opacity = 1.0;
        if (selectedTemplate === 'sweeper' && !hasSlaBreach) opacity = 0.3;

        let iconHtml;
        if (hasSlaBreach) {
          iconHtml = `
            <div class="cluster-marker outlier" style="opacity: ${opacity};">
              <div class="cluster-border red"></div>
              <div class="cluster-content">
                <span class="alert-icon">⚠</span>
                <span class="cluster-count text-white text-sm font-bold shadow-sm" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${cluster.report_count || 0}</span>
              </div>
            </div>
          `;
        } else {
          iconHtml = `
            <div class="cluster-marker standard" style="opacity: ${opacity};">
              <div class="cluster-border blue"></div>
              <div class="cluster-content">
                <span class="cluster-count text-white text-sm font-bold shadow-sm" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${cluster.report_count || 0}</span>
              </div>
            </div>
          `;
        }

        const icon = L.divIcon({
          className: hasSlaBreach ? 'breached-cluster-marker' : 'standard-cluster-marker',
          html: iconHtml,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        return (
          <Marker
            key={cluster.id}
            position={center}
            icon={icon}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                if (onClusterClick) onClusterClick(cluster.id);
              }
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <div className={`text-xs font-semibold mb-1 tracking-wider uppercase ${hasSlaBreach ? 'text-red-600' : 'text-blue-600'}`}>
                  {hasSlaBreach ? 'CLUSTER WITH BREACHED REPORT' : 'STANDARD CLUSTER'} #{cluster.id}
                </div>
                <strong className="block text-sm text-gray-800 mb-2">
                  {normalizeString(cluster.issue_type)}
                </strong>
                <div className="text-sm space-y-1 text-gray-600">
                  <div><span className="text-gray-500">Reports:</span> <span className="font-medium text-gray-800">{cluster.report_count}</span></div>
                  <div>
                    <span className="text-gray-500">Severity:</span>{' '}
                    <span className={`font-medium ${cluster.severity === 'high' ? 'text-red-600' : cluster.severity === 'medium' ? 'text-orange-500' : 'text-blue-500'}`}>
                      {cluster.severity?.toUpperCase()}
                    </span>
                  </div>
                  {hasSlaBreach && (
                    <div className="mt-2 p-1.5 bg-red-50 border border-red-200 rounded text-xs">
                      <span className="text-red-600 font-bold">SLA Breach Duration:</span> {cluster.breach_duration || cluster.breach_duration_hours || '> 48'} hours
                    </div>
                  )}
                  <div className="mt-3">
                    {selectionMode && onClusterSelect ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const memberReports = clusterReportsMap && clusterReportsMap[cluster.id] ? clusterReportsMap[cluster.id] : []
                          if (memberReports && memberReports.length > 0) {
                            onClusterSelect(memberReports.map(r => r.id))
                          }
                        }}
                        className="w-full bg-blue-600 text-white font-medium text-sm py-2 rounded shadow-sm hover:bg-blue-700 transition-colors"
                      >
                        Add All Reports
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/dashboard/officer/hotzone-intel/${cluster.id}`)
                        }}
                        className="w-full bg-blue-600 text-white font-medium text-sm py-2 rounded shadow-sm hover:bg-blue-700 transition-colors"
                      >
                        View All Reports
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
