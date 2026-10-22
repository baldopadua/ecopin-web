import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeForecast, buildTrendSeries, manilaDayRange, observedReportPoints } from '../lib/forecast-data.mjs';
import { isAllowedBackendRequest, isPublicBackendRequest } from '../lib/server/backend-policy.mjs';
import { labelForecastAreas, summarizeForecast, filterForecastAreas } from '../lib/forecast-data.mjs';

test('readable area labels stay attached to the same grid across horizon order and risk changes', () => {
  const feature = id => ({ type: 'Feature', properties: { zone_id: id, zone_name: `Pasig study grid ${id}`, predicted_count: 2, risk_level: 'low' } });
  const first = labelForecastAreas([feature('bbb'), feature('aaa')]);
  const second = labelForecastAreas([feature('aaa'), feature('bbb')]);
  assert.equal(first.find(f => f.properties.zone_id === 'aaa').properties.display_name, 'Area 01');
  assert.deepEqual(first.map(f => f.properties.display_name), second.map(f => f.properties.display_name).toReversed());
  assert.equal(labelForecastAreas([{ properties: { zone_id: 'market', zone_name: 'Market district' } }])[0].properties.display_name, 'Market district');
});

test('officer summary and filters use the loaded forecast and preserve zero counts', () => {
  const areas = labelForecastAreas([
    { properties: { zone_id: 'a', zone_name: 'Market', predicted_count: 20, risk_level: 'high', risk_score: .9, growth_velocity_percent: 45, historical_points: [{ week_start: '2026-10-05', actual_count: 3 }], forecast_points: [{ week_start: '2026-10-19', predicted_count: 20 }] } },
    { properties: { zone_id: 'b', zone_name: 'Residential', predicted_count: 0, risk_level: 'low', risk_score: 0, growth_velocity_percent: 0, historical_points: [{ week_start: '2026-10-05', actual_count: 2 }], forecast_points: [{ week_start: '2026-10-19', predicted_count: 0 }] } },
  ]);
  const summary = summarizeForecast(areas);
  assert.equal(summary.total, 20);
  assert.equal(summary.high, 1);
  assert.equal(summary.rising, 1);
  assert.deepEqual(summary.actual, [{ date: '2026-10-05', value: 5 }]);
  assert.equal(filterForecastAreas(areas, 'high', '').length, 1);
  assert.equal(filterForecastAreas(areas, 'all', 'residential')[0].properties.predicted_count, 0);
  assert.equal(filterForecastAreas(areas, 'rising', 'Market').length, 1);
});

test('the session proxy allows the forward forecast routes while keeping them private and method scoped', () => {
  for (const prefix of ['/api/spatial-forecast', '/api/spatial']) {
    for (const suffix of ['/forecast/current', '/predictions/current', '/zones/88694ec081fffff/trend', '/zones/88694ec081fffff/history', '/available-dates']) {
      assert.equal(isAllowedBackendRequest('GET', prefix + suffix), true, prefix + suffix);
      assert.equal(isPublicBackendRequest('GET', prefix + suffix), false);
      assert.equal(isAllowedBackendRequest('DELETE', prefix + suffix), false);
    }
    assert.equal(isAllowedBackendRequest('GET', prefix + '/zones/id/private'), false);
    assert.equal(isAllowedBackendRequest('GET', prefix + '/forecast/unknown'), false);
  }
});

const geometry = { type: 'Polygon', coordinates: [[[121.07, 14.57], [121.08, 14.57], [121.08, 14.58], [121.07, 14.57]]] };
const zone = { zone_id: 'h3-zone', region_id: 'h3-zone', zone_name: 'Market grid', horizon_days: 30,
  predicted_count: 0, risk_level: 'low', risk_score: 0, region_center_lat: 14.575, region_center_lng: 121.075,
  geojson_polygon: JSON.stringify(geometry), historical_points: [{ week_start: '2026-10-05', actual_count: 0 }], forecast_points: [] };

test('saved forecasts retain low and zero risk zones and their real stable boundary', () => {
  const result = normalizeForecast([zone]);
  assert.equal(result.geojson.features.length, 1);
  assert.deepEqual(result.geojson.features[0].geometry, geometry);
  assert.equal(result.geojson.features[0].properties.center_lat, 14.575);
  assert.equal(result.region_analyses['h3-zone'].predicted_count, 0);
});

test('historical DBSCAN rows and absent boundaries never become invented forecast polygons', () => {
  const result = normalizeForecast([{ region_id: 'cluster-old', risk_score: 0.9, geojson_polygon: geometry }, { ...zone, geojson_polygon: null }]);
  assert.deepEqual(result.geojson.features, []);
});

test('live forecasts preserve forward metadata, all zones, and changed horizon values', () => {
  const feature = { type: 'Feature', geometry, properties: { ...zone, predicted_count: 27 } };
  const result = normalizeForecast({ horizon: '90d', forecast_date_end: '2027-01-16', geojson: { type: 'FeatureCollection', features: [feature] } });
  assert.equal(result.horizon, '90d');
  assert.equal(result.forecast_date_end, '2027-01-16');
  assert.equal(result.geojson.features[0].properties.predicted_count, 27);
});

test('trend keeps actuals separate from projection and preserves prediction bounds', () => {
  const series = buildTrendSeries({ historical_points: [{ week_start: '2026-10-05', actual_count: 4 }, { week_start: '2026-10-12', actual_count: 7 }],
    forecast_points: [{ week_start: '2026-10-19', predicted_count: 8, lower_bound: 2, upper_bound: 15 }] });
  assert.equal(series.actual.length, 2);
  assert.equal(series.projected.length, 1);
  assert.equal(series.projected[0].value, 8);
  assert.equal(series.projected[0].lower, 2);
  assert.equal(series.projected[0].upper, 15);
  assert.equal(series.actual[1].value, 7);
});

test('Today actuals use the Manila calendar day and never include future or invalid points', () => {
  const now = new Date('2026-10-18T10:00:00Z');
  assert.deepEqual(manilaDayRange(now), { start: '2026-10-17T16:00:00.000Z', end: '2026-10-18T10:00:00.000Z' });
  const report = { location_lat: 14.57, location_lng: 121.075 };
  const points = observedReportPoints([{ ...report, created_at: '2026-10-17T16:00:00Z' }, { ...report, created_at: '2026-10-17T15:59:59Z' },
    { ...report, created_at: '2026-10-18T10:00:01Z' }, { ...report, created_at: '2026-10-18T08:00:00Z', location_lng: 999 }], now);
  assert.equal(points.features.length, 1);
  assert.deepEqual(points.features[0].geometry.coordinates, [121.075, 14.57]);
});
