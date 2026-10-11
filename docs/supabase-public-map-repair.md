# Public map Supabase repair

The anonymous /map route previously queried reports_view.* and issue types from the same view. Column permissions caused 42501 errors, which became an empty map. It also listened to raw report changes and refreshed with the invalid validation_status value validated.

The map now uses the tested public_reports projection with an explicit 19-field selection. Requests include the visible latitude/longitude bounds, status and issue-type filters, created_at/id descending order and a 200-report page with one extra row to detect truncation. Errors, loading and truncation are visible. Superseded requests are aborted and ignored. Dateline and full-world bounds are supported.

The map groups only visible reports; popup counts explicitly say visible reports. Zoom controls are positioned below the existing header. Consented private-property reports retain rounded coordinates and do not request public photo evidence. The issue-type options match the seven live report_issue_type enum values checked on 11 October 2026.

Public freshness uses a bounded refresh every 60 seconds while the page is visible, plus map navigation/filter changes. This avoids subscribing to raw report payloads. Safe invalidation delivery and notification reconnect remain separate full-plan gates.

## Validation on 11 October 2026

- Seven Node tests using the real Supabase client and a local HTTP boundary: safe projection/fields, viewport, deterministic page/extra row, dateline/full-world, invalid input, errors and aborts.
- Targeted ESLint: zero errors; three existing no-img-element warnings in the map.
- Final production build passes, including 38 routes.
- Local browser /map shows three real reports initially; response fields exclude identity, notes, operation internals, ML probabilities and private image URLs.
- Zooming out requests a wider viewport and displays 20 reports.
- Resolved filter sends status=eq.resolved and displays a valid empty state.
- Temporarily blocking the projection request shows Reports could not load and Try again; clearing the block and retrying returns HTTP 200 and three reports. Temporary network blocking was removed.

## Measurement and rollout

Three alternating live anonymous comparisons used identical safe fields, ordering and cap. Without viewport: 45 rows / 29,219 bytes in each sample. Initial viewport: 3 rows / 1,892 bytes, all inside bounds, in each sample. This is a 93.5% payload reduction for that area. Timings were 649/251/268 ms versus 269/248/262 ms; no general latency claim follows from these samples.

This source is verified locally on codex/supabase-public-map. Hosted application rollout is not proved. Authorized dashboard callers remain on their separate detail path; base report privileges have not yet been contracted. Mobile uses the shared reports stream for both public and officer maps, so a blind owner-filter change would break those consumers. They must receive separate public/authorized contracts in the next slice.

The full 55-task optimization remains open. This change does not certify report privacy through every old API, Storage assignment, sustained load, real Auth sessions or recovery.
