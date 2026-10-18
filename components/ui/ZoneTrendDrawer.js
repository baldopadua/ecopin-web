'use client';

import { useEffect, useRef, useState, useId } from 'react';
import { getZoneTrend } from '../../lib/api/hotspot';
import { buildTrendSeries, forecastDate } from '../../lib/forecast-data.mjs';
import styles from './SpatialScan.module.css';

function ZoneForecastChart({ zone }) {
  const [selected, setSelected] = useState(null);
  const [showRange, setShowRange] = useState(true);
  const { actual, projected } = buildTrendSeries(zone);
  const all = [...actual, ...projected];
  if (!all.length) return <p>No time series is available for this zone.</p>;
  const start = Math.min(...all.map(point => point.time));
  const duration = Math.max(86400000, Math.max(...all.map(point => point.time)) - start);
  const ceiling = Math.max(1, ...actual.map(point => point.value), ...projected.map(point => point.upper));
  const x = point => 48 + (point.time - start) / duration * 600;
  const y = value => 212 - value / ceiling * 180;
  const line = points => points.map((point, index) => `${index ? 'L' : 'M'}${x(point)},${y(point.value)}`).join(' ');
  const corridor = projected.length ? [...projected.map(point => `${x(point)},${y(point.upper)}`), ...projected.toReversed().map(point => `${x(point)},${y(point.lower)}`)].join(' ') : '';
  const trajectory = actual.length && projected.length ? [actual.at(-1), ...projected] : projected;
  const active = selected === null ? null : all[Math.min(selected, all.length - 1)];
  return <figure className={styles.trendFigure}>
    <div className={styles.chartToolbar}><h3>Past activity and forecast</h3><button type="button" aria-pressed={showRange} onClick={() => setShowRange(value => !value)}>Show likely range</button></div>
    <div className={styles.chartInspection} role="status">{active ? <><span>Week of {forecastDate(active.date)}</span><strong>{active.value.toFixed(1)} {'lower' in active ? 'projected' : 'actual'} reports</strong>{'lower' in active && <span>Likely range: {active.lower.toFixed(1)}–{active.upper.toFixed(1)}</span>}</> : <span>Hover over the chart, or focus it and use the arrow keys.</span>}</div>
    <svg viewBox="0 0 680 264" role="img" tabIndex={0} aria-label="Actual weekly reports and projected reports with approximate 95% prediction interval"
      onMouseLeave={() => setSelected(null)} onBlur={() => setSelected(null)} onKeyDown={event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); setSelected(index => Math.max(0, Math.min(all.length - 1, (index ?? actual.length - 1) + (event.key === 'ArrowRight' ? 1 : -1)))); }
      }}>
      {[0, 0.5, 1].map(tick => <g key={tick}><line x1="48" x2="648" y1={y(ceiling * tick)} y2={y(ceiling * tick)} className={styles.chartGrid} /><text x="40" y={y(ceiling * tick) + 4} textAnchor="end">{(ceiling * tick).toFixed(0)}</text></g>)}
      {showRange && corridor && <polygon points={corridor} className={styles.chartBand} />}
      {showRange && projected.map(point => <line key={`interval-${point.date}`} x1={x(point)} x2={x(point)} y1={y(point.upper)} y2={y(point.lower)} className={styles.chartInterval} />)}
      {actual.length > 0 && <path d={line(actual)} className={styles.chartActual} />}
      {trajectory.length > 0 && <path d={line(trajectory)} className={styles.chartProjected} />}
      {actual.map(point => <circle key={point.date} cx={x(point)} cy={y(point.value)} r="3" className={styles.chartDot} />)}
      {projected.map(point => <circle key={point.date} cx={x(point)} cy={y(point.value)} r="3" className={styles.chartForecastDot} />)}
      {all.map((point, index) => <circle key={`hit-${index}`} cx={x(point)} cy={y(point.value)} r="10" className={styles.chartHit} onMouseEnter={() => setSelected(index)} />)}
      {active && <><line x1={x(active)} x2={x(active)} y1="32" y2="212" className={styles.chartBoundary} /><circle cx={x(active)} cy={y(active.value)} r="5" className={styles.chartForecastDot} /></>}
      <text x="48" y="244">{forecastDate(all[0].date)}</text><text x="648" y="244" textAnchor="end">{forecastDate(all.at(-1).date)}</text>
    </svg>
    <figcaption><span>━━ Reported</span><span>┄┄ Forecast</span><span>Shaded: approximate 95% range</span></figcaption>
    <p className={styles.trendNote}>Each point represents a week. Forecast weeks may be partial. The likely range shows uncertainty in the estimate, not measured accuracy.</p>
    <details><summary>View trend values</summary><div className={styles.trendTable}><table><thead><tr><th scope="col">Bucket start</th><th scope="col">Actual</th><th scope="col">Projected</th><th scope="col">95% interval</th></tr></thead><tbody>
      {actual.map(point => <tr key={point.date}><th scope="row">{forecastDate(point.date)}</th><td>{point.value}</td><td>—</td><td>—</td></tr>)}
      {projected.map(point => <tr key={point.date}><th scope="row">{forecastDate(point.date)}</th><td>—</td><td>{point.value.toFixed(1)}</td><td>{point.lower.toFixed(1)}–{point.upper.toFixed(1)}</td></tr>)}
    </tbody></table></div></details>
  </figure>;
}

export default function ZoneTrendDrawer({ feature, horizon, snapshot, onClose }) {
  const dialog = useRef(null);
  const titleId = useId();
  const [remote, setRemote] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const properties = feature.properties;
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    element.showModal();
    return () => { element.close(); previousFocus?.focus(); };
  }, []);
  useEffect(() => {
    if (snapshot) return;
    const controller = new AbortController();
    getZoneTrend(properties.zone_id, horizon, { signal: controller.signal }).then(response => {
      if (!controller.signal.aborted) { setRemote(response.data ?? response); setError(''); }
    }).catch(reason => { if (reason.name !== 'AbortError') setError('The latest trend could not load. Showing the saved forecast series.'); });
    return () => controller.abort();
  }, [properties.zone_id, horizon, snapshot, attempt]);
  const zone = { ...properties, ...remote };
  const number = value => Number.isFinite(value) ? value.toFixed(1) : '—';
  const coordinate = value => Number.isFinite(value) ? value.toFixed(5) : '—';
  const velocity = zone.growth_velocity_percent;
  return <dialog ref={dialog} className={styles.trendDrawer} aria-labelledby={titleId} onClose={onClose} onClick={event => { if (event.target === dialog.current) onClose(); }}>
    <div className={styles.trendBody}>
      <header className={styles.trendHeader}><div><p>Area outlook · Next {parseInt(horizon, 10)} days</p><h2 id={titleId}>{properties.display_name || zone.zone_name || zone.zone_id}</h2></div><button type="button" onClick={onClose} aria-label="Close zone trend" autoFocus>×</button></header>
      <dl className={styles.trendMetrics}>
        <div><dt>Expected reports</dt><dd>{Number.isFinite(zone.predicted_count) ? Number(zone.predicted_count.toFixed(1)) : '—'}</dd></div>
        <div><dt>Likely report range</dt><dd>{number(zone.predicted_lower_bound)}–<wbr />{number(zone.predicted_upper_bound)}</dd></div>
        <div><dt>Change vs. prior period</dt><dd>{Number.isFinite(velocity) ? `${velocity > 0 ? '+' : ''}${velocity.toFixed(1)}%` : '—'}{velocity > 40 && <span className={styles.surge}>Rapid increase</span>}</dd></div>
      </dl>
      <p className={styles.trendNote}><span className={`${styles.risk} ${styles[zone.risk_level] || styles.unknown}`}>{zone.risk_level || 'Unknown'} risk</span> · Compared with the same number of days before the forecast. The likely range is an approximate 95% prediction interval.</p>
      {error && <div className={styles.notice} role="status">{error}<button type="button" onClick={() => setAttempt(value => value + 1)}>Retry trend</button></div>}
      <ZoneForecastChart zone={zone} />
      <div className={styles.priorityNote}><strong>Use this to plan your checks</strong>{zone.risk_level === 'high' ? 'Higher forecast activity makes this an area to review for inspection.' : zone.risk_level === 'medium' ? 'Watch for increasing activity during routine patrols.' : 'Continue routine monitoring.'} Confirm conditions on the ground before assigning cleanup work.</div>
      <details className={styles.trendReference}><summary>Area location and model details</summary><p className={styles.reference}>Grid reference: {zone.zone_id}<br />Map center: {coordinate(zone.region_center_lat ?? zone.center_lat)}, {coordinate(zone.region_center_lng ?? zone.center_lng)}<br />Forecast: {forecastDate(zone.forecast_date_start)} – {forecastDate(zone.forecast_date_end)}</p></details>
    </div>
  </dialog>;
}
