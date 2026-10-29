# PDT-19: historical density patterns and barangay outlooks

Officers/admins open **Spatial Scan → Historical hotspots** at `/dashboard/spatial-scan/patterns`. Historical DBSCAN is recomputed for preceding 7, 30 and 90 rolling days; the independent future selector chooses +7, +30 or +90-day **barangay report-count forecasts**. The existing H3 forward hotspot map and saved forecasts remain available. No recommendation changes a schedule or dispatches a crew.

## Observations and interpretation

The Python engine shares the existing haversine DBSCAN implementation (default neighborhood 150 m, minimum 3 reports). Its 90-day groups anchor the recurrence evidence. Shorter-window groups link through overlapping member identities, never nearest centroids. Barangay links count each report's reconciled polygon assignment; a concentration can span several barangays. Hulls/circles are display footprints, not legal boundaries or street-network corridors. A corridor candidate requires field inspection. IDs hash sorted member identities for reproducibility within a snapshot; they are not persistent cross-snapshot tracking IDs.

Version `recurrence-v1` assigns labels using three **non-overlapping** 30-day bins, oldest to newest:

- Chronic corridor candidate: at least 3 reports per bin across at least 6 distinct UTC weeks.
- Observed transient spike: middle bin at least 6, both adjacent bins at most 2; the observed peak has already faded.
- Recent activity spike: at least 3 in 7 days and at least twice the daily rate of the preceding 23 days, whose baseline must contain at least 3 reports.
- Recent concentration: at least 3 in 7 days with insufficient preceding activity to establish a trend.
- Remaining concentrations are intermittent or historical-only (no reports in the last 30 days).

These are explainable observation heuristics, not statistical significance, measured model accuracy, causal attribution or learned future cluster locations. Density chains can join local concentrations; inspect the member barangays and time series before committing resources. Noise points remain in barangay totals but their individual coordinates are not exported. Zero observations do not establish zero waste risk.

The existing `zone-timeseries-v1` model uses the same database snapshot's **52 complete UTC Monday weeks** per barangay, excluding the current incomplete week. It reuses damped Holt trends / sparse Gamma-Poisson fallback and prorates weekly forecasts into exact forward windows. The chart shows the last 13 complete observed weeks and forward points, an accessible values table and approximate 95% intervals. The intervals have not been calibrated on held-out municipal observations. Predictions concern report volume, not waste tonnage, trucks or crew capacity.

## Data contract and safeguards

`GET /api/spatial-forecast/patterns` (also `/api/spatial/patterns`) requires authenticated officer/admin access through the existing middleware and session proxy. It returns `{data: ...}` with schema `historical-dbscan-v1`, one timestamp, coverage counts, three observed GeoJSON collections, 90-day pattern evidence, all 30 canonical barangays and three sets of aggregate trend series. Names are resolved against the official roster at the Node boundary. The response is allowlisted; raw report IDs, report point lists, arbitrary ML fields and credentials are removed. The session proxy permits only the exact private GET paths. `?refresh=1` requests a new snapshot.

Node posts `{}` to the existing spatial ML service at `/patterns/analyze` with `Authorization: Bearer <SPATIAL_ANALYTICS_TOKEN>`. Set the same nonempty random secret on **Node and Python only**, never `NEXT_PUBLIC_*` or Flutter/web bundles. Missing token fails closed (503); wrong token is forbidden (403). Use private networking and TLS if the service is remote. Existing forecast and feedback endpoints retain their contracts.

The service-role-only `read_hotspot_pattern_history(5000)` RPC reads one consistent database snapshot, avoiding PostgREST row-page truncation. Only approved/validated, non-severe, non-rejected/non-withdrawn/non-cancelled reports enter history; active and resolved cases both count. Canonical resolved barangay assignments and valid WGS84 point coordinates are required. Unreconciled/border and invalid-location exclusions stay visible as separate counts. This scope differs from PDT-16's all-submission metrics. The SQL source serializes no point list when above 5,000 usable reports and raises an error instead of sampling. Weekly aggregates still cover the complete 52-week source period.

Synchronous processing is capped at 5,000 points, with one active Python analysis, a Node 60-second timeout, concurrent-request coalescing and a five-minute aggregate cache. Shortcut: this bounded synchronous job serves the current dataset; use a bounded asynchronous spatial pipeline before supporting larger histories. Busy or oversized inputs return unavailable, never invented clusters or a partial sample. A failed refresh clears the cache and the UI removes old evidence until retry succeeds. No new dependencies, background schedules, writes or prediction persistence are introduced.

## Deployment order

1. Apply the existing forward-zone forecasting schema and **PDT-08** `20261029050000_reconcile_pasig_barangay_boundaries.sql`; finish the documented reconciliation/backfill and audit. The current coarse boundary baseline is not a surveyed legal boundary source. Unreconciled reports are excluded rather than assigned using centroids.
2. Verify/apply backend migration `20261029070000_hotspot_pattern_history.sql` to the intended PostGIS database. It grants execute only to `service_role` and reloads the PostgREST schema. PGlite tests stub point accessors; real PostGIS execution and deployment remain unverified locally. Follow the existing disposable-PostGIS workflow before live rollout.
3. Configure a shared `SPATIAL_ANALYTICS_TOKEN` in Node and Python, keep Supabase server credentials private, and restart/deploy the ML service and backend. No web secret is needed.
4. Deploy the dashboard. Check officer/admin access, citizen denial, 30 barangays including San Miguel, visible coverage exclusions and all independent past/future windows against real data. Missing setup displays unavailable rather than zero activity. No migration or live deployment was performed for PDT-19.

## Verification

- Python: `python -m unittest discover -s hotspot_forecasting -p "test_*.py"` from `ecopin_ml_models`. Covers recurrence, independent windows, sparse/noise/empty data, multi-barangay membership, deterministic identities, invalid history, real HTTP authentication, bounded concurrency and safe source failures.
- Backend: `npm test`; focused Node checks: `node --test --test-isolation=none tests/historical-patterns.test.mjs tests/hotspot-pattern-history-db.test.mjs`. Covers snapshot scope, no 1,000-row truncation, no sampling, service-only SQL grants, role denial, allowlisting, metadata/count/date integrity, cache/coalescing and failure recovery.
- Web: `npm test`, scoped ESLint and `npm run build`. `node tests/historical-patterns.browser.cjs` uses the local Next server on port 4001 (override `ECOPIN_BROWSER_BASE`) and an installed Playwright/Chromium (`ECOPIN_PLAYWRIGHT_PATH` / `ECOPIN_CHROMIUM_PATH`). The browser script generates invented data using the actual Python engine, runs it through the actual Node sanitizer, then intercepts the private GET. It requires the Python hotspot dependencies and the adjacent backend checkout; it never connects to a database. Checks 1440px light/officer, 768px dark/admin and 320px dark/officer, controls, evidence, chart/table, no writes, refresh failures and retry. Map tiles are synthetic blank PNGs in these screenshots, so external basemap delivery is not verified. Refresh/focus checks guard against Leaflet animations outliving a removed map.
