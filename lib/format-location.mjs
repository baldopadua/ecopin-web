/**
 * Location formatting utilities for Pasig City civic reports.
 * Maps coordinates to localized barangay / district names without needing external API roundtrips,
 * or handles approximate property locations gracefully.
 */

// Pasig City's 30 Official Barangays and Key Landmarks with representative centroids
export const PASIG_DISTRICTS = [
  { name: 'Bagong Ilog', lat: 14.5682, lng: 121.0660 },
  { name: 'Bagong Katipunan', lat: 14.5574, lng: 121.0776 },
  { name: 'Bambang', lat: 14.5539, lng: 121.0805 },
  { name: 'Buting', lat: 14.5520, lng: 121.0689 },
  { name: 'Caniogan', lat: 14.5677, lng: 121.0801 },
  { name: 'Dela Paz', lat: 14.6133, lng: 121.0969 },
  { name: 'Kalawaan', lat: 14.5442, lng: 121.0837 },
  { name: 'Kapasigan', lat: 14.5595, lng: 121.0805 },
  { name: 'Kapitolyo', lat: 14.5714, lng: 121.0592 },
  { name: 'Malinao', lat: 14.5552, lng: 121.0754 },
  { name: 'Manggahan', lat: 14.5996, lng: 121.0967 },
  { name: 'Maybunga', lat: 14.5775, lng: 121.0965 },
  { name: 'Oranbo', lat: 14.5771, lng: 121.0635 },
  { name: 'Palatiw', lat: 14.5617, lng: 121.0872 },
  { name: 'Pinagbuhatan', lat: 14.5486, lng: 121.0961 },
  { name: 'Pineda', lat: 14.5646, lng: 121.0543 },
  { name: 'Rosario', lat: 14.5875, lng: 121.0920 },
  { name: 'Sagad', lat: 14.5647, lng: 121.0789 },
  { name: 'San Antonio', lat: 14.5815, lng: 121.0645 },
  { name: 'San Joaquin', lat: 14.5502, lng: 121.0736 },
  { name: 'San Jose', lat: 14.5546, lng: 121.0747 },
  { name: 'San Nicolas', lat: 14.5541, lng: 121.0784 },
  { name: 'Santa Cruz', lat: 14.5583, lng: 121.0742 },
  { name: 'Santa Lucia', lat: 14.5888, lng: 121.1098 },
  { name: 'Santa Rosa', lat: 14.5562, lng: 121.0789 },
  { name: 'Santolan', lat: 14.6139, lng: 121.0864 },
  { name: 'Santo Tomas', lat: 14.5517, lng: 121.0818 },
  { name: 'Sumilang', lat: 14.5529, lng: 121.0769 },
  { name: 'Ugong', lat: 14.5898, lng: 121.0754 },
  { name: 'Ortigas Center', lat: 14.5862, lng: 121.0610 }
];

/**
 * Calculates straight-line distance in km between two coords.
 */
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Resolves the closest barangay or district in Pasig City.
 * @param {number} lat
 * @param {number} lng
 * @returns {string} The name of the nearest barangay/district in Pasig
 */
export function getNearestBarangay(lat, lng) {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
    return 'Pasig City';
  }

  let closest = null;
  let minDistance = Infinity;

  for (const b of PASIG_DISTRICTS) {
    const dist = getDistanceKm(lat, lng, b.lat, b.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = b.name;
    }
  }

  // If farther than 2.0 km from any Pasig centroid, it is outside Pasig
  if (minDistance > 2.0) {
    return null;
  }

  return closest || 'Pasig City';
}

/**
 * Formats a clean human-readable address for report cards, modals, and lists.
 * E.g., "Brgy. Rosario, Pasig City", "Kalayaan Street, Brgy. Ususan, Taguig City"
 * @param {Object} report
 * @param {Object} options - { short: boolean }
 * @returns {string}
 */
export function formatReportAddress(report, { short = false } = {}) {
  if (!report) return 'Pasig City';

  const cleanStreet = report.street_address && typeof report.street_address === 'string' && report.street_address.trim()
    ? report.street_address.replace(/, Philippines$/i, '').trim()
    : null;

  // Use pre-resolved official barangay if available, otherwise compute nearest
  let barangay = report.barangay && typeof report.barangay === 'string' && report.barangay.trim()
    ? report.barangay.trim()
    : null;

  if (!barangay) {
    const lat = report.latitude != null ? Number(report.latitude) : null;
    const lng = report.longitude != null ? Number(report.longitude) : null;

    if (lat != null && lng != null && !isNaN(lat) && !isNaN(lng)) {
      barangay = getNearestBarangay(lat, lng);
    }
  }

  const barangayLabel = barangay
    ? (barangay === 'Ortigas Center' ? barangay : `Brgy. ${barangay.replace(/^Brgy\.?\s*/i, '')}`)
    : null;

  const rawCity = report.city && typeof report.city === 'string' && report.city.trim()
    ? report.city.trim()
    : 'Pasig City';

  const cityLabel = rawCity.toLowerCase().endsWith('city') ? rawCity : `${rawCity} City`;

  // If both street and barangay are known
  if (cleanStreet && barangayLabel) {
    const streetAlreadyHasBarangay = barangay && (
      cleanStreet.toLowerCase().includes(barangay.toLowerCase()) ||
      cleanStreet.toLowerCase().includes(barangayLabel.toLowerCase())
    );
    const combined = streetAlreadyHasBarangay
      ? cleanStreet
      : `${cleanStreet}, ${barangayLabel}`;

    const streetAlreadyHasCity = rawCity && cleanStreet.toLowerCase().includes(rawCity.toLowerCase());
    if (streetAlreadyHasCity) {
      return combined;
    }
    return short ? combined : `${combined}, ${cityLabel}`;
  }

  // If only street is known
  if (cleanStreet) {
    const streetAlreadyHasCity = rawCity && cleanStreet.toLowerCase().includes(rawCity.toLowerCase());
    if (streetAlreadyHasCity) return cleanStreet;
    return short ? cleanStreet : `${cleanStreet}, ${cityLabel}`;
  }

  // If only barangay is known
  if (barangayLabel) {
    if (report.location_precision === 'approximate') {
      return short ? `Near ${barangayLabel}` : `Near ${barangayLabel}, ${cityLabel}`;
    }
    return short ? barangayLabel : `${barangayLabel}, ${cityLabel}`;
  }

  return cityLabel;
}
