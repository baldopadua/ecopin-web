/** Format server-provided addresses; centroid proximity is not an administrative boundary. */
export function formatReportAddress(report, { short = false } = {}) {
  if (!report) return 'Pasig City';

  const cleanStreet = report.street_address && typeof report.street_address === 'string' && report.street_address.trim()
    ? report.street_address.replace(/, Philippines$/i, '').trim()
    : null;

  // Unknown/border classifications must never become centroid guesses.
  let barangay = report.barangay && typeof report.barangay === 'string' && report.barangay.trim()
    ? report.barangay.trim()
    : null;

  const resolution = report.barangay_resolution_status;
  const unresolved = resolution && resolution !== 'resolved';
  if (unresolved) barangay = null;
  const notices = {
    border: 'Barangay border — needs review',
    pending_reconciliation: 'Barangay pending verification',
  };
  const notice = unresolved ? notices[resolution] || 'Barangay unresolved' : null;

  const barangayLabel = barangay
    ? (barangay === 'Ortigas Center' ? 'Ortigas Center (district)' : `Brgy. ${barangay.replace(/^Brgy\.?\s*/i, '')}`)
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
    if (short) return cleanStreet;
    return [cleanStreet, notice, streetAlreadyHasCity ? null : cityLabel].filter(Boolean).join(', ');
  }

  // If only barangay is known
  if (barangayLabel) {
    if (report.location_precision === 'approximate') {
      return short ? `Near ${barangayLabel}` : `Near ${barangayLabel}, ${cityLabel}`;
    }
    return short ? barangayLabel : `${barangayLabel}, ${cityLabel}`;
  }

  return [notice, cityLabel].filter(Boolean).join(', ');
}
