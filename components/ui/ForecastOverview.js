'use client';

import { useState } from 'react';
import { ArrowUpRight, TriangleAlert } from 'lucide-react';
import { forecastDate } from '../../lib/forecast-data.mjs';
import styles from './SpatialScan.module.css';

function OverviewTrend({ actual, projected }) {
  const [selected, setSelected] = useState(null);
  const points = [...actual.map(point => ({ ...point, type: 'Actual' })), ...projected.map(point => ({ ...point, type: 'Projected' }))];
  if (!points.length) return <div className={styles.overviewTrend}><p className={styles.trendCaption}>Weekly activity</p><p className={styles.trendNote}>A trend appears when weekly history is available.</p></div>;
  const first = Date.parse(points[0].date), last = Date.parse(points.at(-1).date);
  const max = Math.max(1, ...points.map(point => point.value));
  const x = point => 12 + (Date.parse(point.date) - first) / Math.max(86400000, last - first) * 456;
  const y = point => 64 - point.value / max * 48;
  const path = values => values.map((point, index) => `${index ? 'L' : 'M'}${x(point)},${y(point)}`).join(' ');
  const future = actual.length && projected.length ? [actual.at(-1), ...projected] : projected;
  const active = selected === null ? null : points[Math.min(selected, points.length - 1)];
  const shortDate = date => new Date(date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' });
  return <figure className={styles.overviewTrend}>
    <figcaption className={styles.trendCaption}><span>Weekly activity</span><span className={styles.miniLegend}><i />Past <i />Forecast</span></figcaption>
    <svg viewBox="0 0 480 88" role="img" tabIndex={0} aria-label="Past weekly reports and future forecast. Use left and right arrow keys to inspect values."
      onMouseLeave={() => setSelected(null)} onBlur={() => setSelected(null)} onKeyDown={event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); setSelected(index => Math.max(0, Math.min(points.length - 1, (index ?? actual.length - 1) + (event.key === 'ArrowRight' ? 1 : -1)))); }
      }}>
      <line x1="12" x2="468" y1="64" y2="64" className={styles.chartGrid} />
      {actual.length > 0 && <path d={path(actual)} className={styles.chartActual} />}
      {future.length > 0 && <path d={path(future)} className={styles.chartProjected} />}
      {projected.length > 0 && <line x1={x(projected[0])} x2={x(projected[0])} y1="8" y2="68" className={styles.chartBoundary} />}
      {points.map((point, index) => <circle key={`${point.type}-${point.date}`} cx={x(point)} cy={y(point)} r="8" className={styles.chartHit} onMouseEnter={() => setSelected(index)} />)}
      {active && <circle cx={x(active)} cy={y(active)} r="4" className={styles.chartForecastDot} />}
      <text x="12" y="84">{shortDate(points[0].date)}</text><text x="468" y="84" textAnchor="end">{shortDate(points.at(-1).date)}</text>
    </svg>
    <p className={styles.trendReadout} role="status">{active ? `${forecastDate(active.date)} · ${active.value.toFixed(1)} ${active.type.toLowerCase()} reports` : 'Forecast weeks can include a partial week.'}</p>
  </figure>;
}

export default function ForecastOverview({ summary, horizon, unavailable, loading, filter, onFilterChange, observed, actualCount, observedError, isHistorical, snapshotDate }) {
  const value = number => loading ? '…' : unavailable ? '—' : number.toLocaleString('en-PH', { maximumFractionDigits: 0 });
  if (observed) return <section className={styles.observedSummary} aria-label="Today’s report summary"><div><span>Reports today</span><strong>{observedError || actualCount === null ? '—' : actualCount}</strong></div><p>Reported locations for today, Manila time.<br />Switch to Forecast map to see where reports may increase.</p></section>;
  return <section className={styles.overview} aria-label="Forecast overview" aria-busy={loading}>
    <div className={styles.overviewMetrics}>
      <div className={styles.forecastMetric}>
        <span>{isHistorical ? 'Archived prediction' : 'Expected reports'}</span>
        <strong>{value(summary.total)}</strong>
        <small>{isHistorical ? `${parseInt(horizon, 10)}-day projection as of ${forecastDate(snapshotDate)}` : `Next ${parseInt(horizon, 10)} days · estimate`}</small>
      </div>
      <button type="button" className={styles.forecastMetric} aria-label="View high-risk areas" aria-pressed={filter === 'high'} onClick={() => onFilterChange(filter === 'high' ? 'all' : 'high')} disabled={loading || unavailable}>
        <span><TriangleAlert size={14} aria-hidden="true" />High-risk areas</span><strong className={styles.high}>{value(summary.high)}</strong>
        <small>{isHistorical ? 'Flagged critical zones' : 'Review for inspection'}</small>
      </button>
      <button type="button" className={styles.forecastMetric} aria-label="View areas with rising activity" aria-pressed={filter === 'rising'} onClick={() => onFilterChange(filter === 'rising' ? 'all' : 'rising')} disabled={loading || unavailable}>
        <span><ArrowUpRight size={15} aria-hidden="true" />Rising activity</span><strong>{value(summary.rising)}</strong>
        <small>{isHistorical ? 'Growth recorded at snapshot' : 'Areas above prior period'}</small>
      </button>
    </div>
    <OverviewTrend actual={loading || unavailable ? [] : summary.actual} projected={loading || unavailable ? [] : summary.projected} />
  </section>;
}
