# Forward hotspot forecasting

The spatial scan now forecasts future incident arrivals over exactly 7, 30, or 90 days. The map renders the stable H3 resolution-8 catalog installed by the database migration; changing a horizon changes forecast values and colors, never boundaries. The catalog covers a documented Pasig study envelope including adjacent areas, not official barangay boundaries.

Select a polygon or a zone in the paginated list to open its trend panel. It shows expected reports, approximate 95% prediction intervals, growth relative to an equally long historical period, 13 weeks of observed counts, and future weekly buckets. Forecast buckets at the beginning and end can represent partial weeks. Keyboard users can select polygons with Enter or Space; Escape closes the panel and returns focus. Saved snapshots display their own saved series rather than fetching today's trend.

“Today (Actual)” displays only public report locations created today in Manila time, fetched in ordered pages. Its count and list describe those actual reports; selecting a report centers its location on the map. Forecast horizon controls are disabled in this view. Failed forecast requests clear prior horizon polygons and expose a retry control. An empty zone catalog displays unavailable totals; existing zero-count zones stay visible with zero expected reports.

The interface does not display historical DBSCAN accuracy as forecasting accuracy, or interpret the bounded risk index as a calibrated probability. Statistical intervals are approximate and need validation against held-out real observations.

## Officer workflow

The summary shows expected reports, high-risk areas and rising activity across the loaded forecast. Selecting high-risk areas or rising activity filters both the map and list. Search and the risk selector also keep both views synchronized; the summary continues to describe the complete forecast. Generic grid names appear as stable Area 01-style labels, with the underlying grid reference and coordinates available in the detail panel. These labels do not imply official administrative boundaries.

The desktop overview chart supports pointer and arrow-key inspection. Area detail charts also support keyboard inspection and a toggle for the approximate likely range. The compact phone layout prioritizes the summary and a Map/Areas switch; detailed charts remain available in the area panel. Saved forecast dates appear only when the saved-forecast view is selected.

## API contract

Both backend mounts `/api/spatial` and `/api/spatial-forecast` require an administrator or officer session. The dashboard uses the latter through the existing session proxy.

- `GET /forecast/current?horizon=7d|30d|90d`
- `GET /predictions/current?horizon=7d|30d|90d` (alias)
- `GET /zones/:zoneId/trend?horizon=7d|30d|90d` (`/history` is an alias)
- `GET /predictions?time_horizon=7d&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
- `GET /available-dates?horizon=7d|30d|90d`
- `POST /generate` with `{ "horizon": "30d" }`

The legacy `/current/:horizon` and `time_horizon` inputs stay available: `daily` and `weekly` map to `7d`, and `monthly` maps to `30d`. Forecasts use the entire stable catalog rather than a request-specific bounding box. Expired forecasts and legacy cluster rows are excluded. A same-horizon, still-valid stored forecast may be returned with `stale: true` if fresh generation fails; the dashboard labels it.

The session proxy explicitly allows the forward current/trend paths on both mounts and keeps them private. If the database migration is missing, current forecasts return `status: "setup_required"` with no predicted zones and available dates return an empty list. The dashboard displays a setup notice, not a zero forecast. This state is not cached: after applying the migration, retrying checks the database again. Database permission and network errors remain errors.

## Deployment order

1. Run the disposable PostGIS regression check described in `ecopin_backend_node/docs/forward-zone-forecasting-data.md` on a working Docker engine, then apply `20261018120000_forward_zone_forecasting.sql` to the intended database.
2. Install `ecopin_ml_models/hotspot_forecasting/requirements.txt`, deploy/restart that service, and check `/health` reports `zone-timeseries-v1`.
3. Deploy the backend, generate all three horizons, then deploy the dashboard. Schedules refresh 7-day forecasts daily, 30-day forecasts weekly, and 90-day forecasts monthly; reads can generate on demand.
4. Optionally generate the explicitly synthetic 26–52-week dataset for a demo database. The seeder previews or writes reviewable SQL and never connects to the database.

The connected database has been verified with 122 catalog areas and forecasts for all three horizons after the migration was applied through SQL Editor. No synthetic data was imported. The disposable Docker PostGIS check remains unverified because Docker Desktop failed to start locally. The ML README describes the uniform within-week assumption and uncertainty calculation.

## Verification

The Python model, HTTP and pagination tests cover exact dates, nonnegative intervals, cumulative horizon consistency, zero-filled history and a 30-zone inference benchmark. Backend tests cover persistence round trips, same-horizon caching, expiry, input validation, authorization and route aliases. Frontend unit and browser checks cover stable boundaries, color updates, trend selection, actual reports, empty/error states, keyboard focus, safe text rendering, saved snapshots and responsive pagination from 320px to desktop widths. The dashboard production build and scoped lint checks also run.

## Historical DBSCAN integration (PDT-19)

Spatial Scan now links to a separate observed-history workspace with 7/30/90-day DBSCAN concentrations, recurrence evidence and independent forward barangay trends. See [the contract and deployment notes](historical-hotspot-patterns.md). Historical footprints are not future forecast polygons.
