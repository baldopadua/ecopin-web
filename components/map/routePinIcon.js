import L from 'leaflet'

/**
 * Creates an anchored modern SVG pin for route depots (SWMO Headquarters).
 * Seamless circular badge silhouette with a precision needle tip anchor,
 * high-contrast perimeter halo, and start/end status pip.
 *
 * @param {boolean} isEnd - Whether this depot marker is the route destination rather than start
 * @returns {L.DivIcon} Leaflet DivIcon with needle tip anchor
 */
export function createDepotIcon(isEnd = false) {
  const depotColor = '#0052CC'
  const pipColor = isEnd ? '#EF4444' : '#10B981'

  // Precision tangent teardrop silhouette for 38x48:
  // Center (19, 18), Radius 15.5, Tip (19, 46.5)
  const pinPath = 'M 19 46.5 L 5.99 26.43 A 15.5 15.5 0 1 1 32.01 26.43 Z'

  const iconGraphic = isEnd
    ? `<g transform="translate(12, 10.5)" stroke="${depotColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none">
         <path d="M3 14V3" />
         <path d="M3 3h7.5a1 1 0 0 1 .8 1.6L9.8 7l1.5 2.4A1 1 0 0 1 10.5 11H3" fill="${depotColor}" fill-opacity="0.2" />
       </g>`
    : `<g transform="translate(12, 11)" stroke="${depotColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none">
         <path d="M2 13V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v10" />
         <path d="M1 13h12" />
         <path d="M5 5h1M8 5h1M5 8h1M8 8h1" />
         <path d="M6 13v-3h2v3" />
       </g>`

  return L.divIcon({
    className: 'custom-marker route-depot-marker',
    html: `<div class="route-pin-wrapper route-depot-pin" style="
      position: relative;
      width: 38px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.35)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
      transition: transform 0.15s cubic-bezier(0.2, 0, 0, 1), filter 0.15s ease;
    ">
      <svg width="38" height="48" viewBox="0 0 38 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="${pinPath}"
              fill="${depotColor}"
              stroke="#FFFFFF"
              stroke-width="2.5"
              stroke-linejoin="round" />
        <path d="M 9.5 15 A 12 12 0 0 1 28.5 15 A 12 9 0 0 0 9.5 15 Z" fill="#FFFFFF" fill-opacity="0.22" />
        <circle cx="19" cy="18" r="11.5" fill="#FFFFFF" stroke="${depotColor}" stroke-width="1.5" stroke-opacity="0.25" />
        ${iconGraphic}
        <circle cx="27" cy="10.5" r="3.5" fill="${pipColor}" stroke="#FFFFFF" stroke-width="1.5" />
      </svg>
    </div>`,
    iconSize: [38, 48],
    iconAnchor: [19, 47],
    popupAnchor: [0, -48],
  })
}

/**
 * Creates an anchored modern SVG pin for route waypoints,
 * keeping the outer shell and accent colored according to the crew's assigned color.
 * Features a circular coin badge silhouette, precision needle tip, crisp white center disc,
 * and high-contrast sequence number.
 *
 * @param {number|string} sequenceNumber - Stop sequence order (1, 2, 3...)
 * @param {string} color - Hex/RGB color representing the assigned field crew
 * @returns {L.DivIcon} Leaflet DivIcon with needle tip anchor
 */
export function createWaypointIcon(sequenceNumber, color) {
  const safeColor = color || '#0052CC'
  const seqStr = String(sequenceNumber ?? '')
  const fontSize = seqStr.length > 2 ? '9px' : seqStr.length === 2 ? '11px' : '13px'

  // Precision tangent teardrop silhouette for 36x46:
  // Center (18, 17), Radius 14.5, Tip (18, 44.5)
  const pinPath = 'M 18 44.5 L 5.68 24.65 A 14.5 14.5 0 1 1 30.32 24.65 Z'

  return L.divIcon({
    className: 'custom-marker route-waypoint-marker',
    html: `<div class="route-pin-wrapper route-waypoint-pin" style="
      position: relative;
      width: 36px;
      height: 46px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.35)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
      transition: transform 0.15s cubic-bezier(0.2, 0, 0, 1), filter 0.15s ease;
    ">
      <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="${pinPath}"
              fill="${safeColor}"
              stroke="#FFFFFF"
              stroke-width="2.5"
              stroke-linejoin="round" />
        <path d="M 9 14 A 11 11 0 0 1 27 14 A 11 8 0 0 0 9 14 Z" fill="#FFFFFF" fill-opacity="0.25" />
        <circle cx="18" cy="17" r="10.5" fill="#FFFFFF" stroke="${safeColor}" stroke-width="1.5" stroke-opacity="0.25" />
        <text x="18" y="17.5"
              text-anchor="middle"
              dominant-baseline="central"
              fill="#0F172A"
              font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
              font-weight="800"
              font-size="${fontSize}"
              letter-spacing="-0.3px">${seqStr}</text>
      </svg>
    </div>`,
    iconSize: [36, 46],
    iconAnchor: [18, 45],
    popupAnchor: [0, -46],
  })
}
