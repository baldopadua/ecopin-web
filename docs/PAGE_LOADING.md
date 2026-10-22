# Dashboard loading checks — 2026-10-19

## Measured result

Production Chromium test, synthetic officer session and 12 reports, with a 100 ms report response delay. The same Map Grid → Command Center → Map Grid sequence was used before and after.

| Request | Before | After |
| --- | ---: | ---: |
| Reports | 5 | 1 |
| Cleanup tasks | 3 | 1 |
| Clusters | 3 | 1 |
| Session metadata | 3 | 1 |

These counts demonstrate reduced network work, not a production latency or Core Web Vitals claim. Route rendering, Leaflet initialization, uncached work-queue requests and real network conditions still contribute to navigation time.

PDF generation libraries now load inside the export handler. Browser verification checks that additional script requests occur on export and that a PDF downloads. Total page script bytes varied with unrelated sidebar prefetch, so no percentage improvement is claimed for bundle size. The focused loading test excludes route prefetch for subsequent measurements.

## Cache behavior

- TanStack Query shares reports, cleanup tasks and clusters between the command center, map and hotzone list. Existing callers outside these views retain their original behavior.
- Cached results are fresh for 30 seconds, retained in memory for five minutes when inactive, and never persisted to browser storage.
- Each session, user, role, LGU or barangay change creates a separate query client and clears the previous client. Server-side API authorization remains enforced.
- Successful protected writes invalidate dashboard queries. Read-only photo-evidence POSTs and task previews do not. The existing map report subscription also invalidates shared queries.
- Stale queries refresh on mount, focus or reconnect. Explicit retry forces a read. Failed refreshes preserve previously loaded query data.
- Session validation continues on visibility changes and at the existing one-minute interval. The fixed session deadline and expiry dialog are preserved.

## Verification

- Production build passed.
- Unit suite: 88 passing tests, including shared reads, freshness, invalidation, failed refreshes and cache scope.
- Browser checks: navigation request counts, PDF download, write notification refresh, tenant/session changes, role revocation, report-outage retry, map controls at desktop/mobile sizes, and session deadline/outage behavior.
- The responsive map check also reproduced a zero-width heatmap canvas crash. Map resizing now skips hidden containers, and the heatmap detaches while hidden and returns when visible.
- Targeted lint passed for the changed layout, session provider, dashboard pages, query provider and API helpers. EcoPinMap retains its existing four effect-related lint errors and three warnings; no lint suppressions were added.

Run `npm run test:unit` and `npm run build`. Browser checks are `tests/dashboard-loading.browser.cjs`, `tests/officer-map-grid.browser.cjs` and `tests/session-lifetime.browser.cjs`, against a local production server. The loading test accepts `ECOPIN_TEST_BASE_URL`, `ECOPIN_PLAYWRIGHT_PATH` and `ECOPIN_CHROMIUM_PATH`. Existing browser tests resolve Playwright normally.

Backend summary endpoints, viewport-based officer queries and Flutter navigation remain separate follow-up work. They need their own accuracy and performance baselines.
