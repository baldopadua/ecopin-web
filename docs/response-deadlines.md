# Public and mobile response deadline indicators

Accepted scope: 27 October 2026. Public Explore (map popup, result list, gallery,
detail panel), the landing map popup, and `/reports/[id]` show response deadlines
without a citizen account. The Flutter citizen map preview/list, My Reports,
shared report details, and field-crew reports/task details use the same display
policy. Crew report lists offer At risk and Overdue filters. Native citizen
authentication requirements and existing public visibility rules stay intact.

## Display policy

- `deadline_at` and `sla_started_at` come from the server. Do not derive a new
  deadline from `created_at`; historical reports can have a reset SLA clock.
- Before the final 20% of that window: neutral Response deadline.
- Within the final 20%, before the deadline: Response deadline approaching.
- At or beyond the deadline: Response overdue, including assigned/in-progress
  and clustered reports. Assignment does not erase elapsed time.
- Resolved, completed, closed, rejected and cancelled reports do not retain a
  running countdown. Historical breach tracking remains unchanged.
- Missing/invalid deadlines hide the indicator. Missing/invalid start times
  cannot manufacture a warning window; a valid deadline can still become overdue.
- Details include an exact local date/time and explain that the response target
  does not guarantee cleanup completion. Reports do not expire or disappear.
- Visible timers refresh every 30 seconds, without polling the API. Web also
  refreshes its clock on window focus. Existing data reload/sync behavior remains.
- Crew task summaries use the earliest known active linked report deadline and
  counts of approaching/overdue reports. These describe reports, not a new task
  SLA. Summaries are limited to the reports available in the current snapshot.
- Flutter caches preserve both timestamps. Offline countdowns use the saved
  report status; they cannot confirm later server changes.

The 20% rule is presentation policy implemented in the web and Flutter helpers;
it does not change the server lifecycle, dispatch policy, SLA length or scheduler.
Notifications/following are a later slice.

## Deployment order

1. Apply backend migration
   `20261027005142_add_response_deadline_projection.sql` first. It adds the two
   timestamps to the existing public/staff projections without changing row
   eligibility, approximate locations, view owners, grants, or security options.
2. Deploy the backend public field selection and website, then release the
   mobile application. New clients request these columns explicitly.
3. Verify signed-out public reports and real crew assignments on the deployed
   environment. The owner applied the migration manually in Supabase SQL Editor; the public projection was then verified with anonymous API access.

## Local validation

- Web: `npm test`; deadline behavior tests and public query contract tests.
- Browser: `tests/response-deadline.browser.cjs` with a local preview and synthetic
  signed-out API responses; gallery, map popup, public details, and indicator
  wrapping at 320/768/1024/1440px. Set `ECOPIN_PLAYWRIGHT_PATH` and
  `ECOPIN_CHROMIUM_PATH` for a locally installed test runtime if needed.
- Mobile: `test/reports/response_deadline_test.dart`,
  `response_deadline_indicator_test.dart`, and existing public-map contracts;
  boundary times, cached timestamps, theme/large-text layouts and live filters.
- Database: `node scripts/test-response-deadline-projection.mjs` in the backend,
  using isolated PGlite via `ECOPIN_PGLITE_PATH`. Verifies consent/review filtering,
  restricted columns, owner/grant/security-option preservation, invoker RLS and
  repeat application. This is a fixture database, not a deployed Supabase test.

The migration follows PostgreSQL's [view replacement rules](https://www.postgresql.org/docs/current/sql-createview.html).
Public queries retain explicit fields through Supabase's [select API](https://supabase.com/docs/reference/javascript/select).

## Production release - 27 October 2026

Backend `fec45fe94a1bc9f91f50221a3304701255e74d2e` deployed through its normal GitHub/AWS pipeline; health and anonymous report detail both return HTTP 200 with deadline and address fields. Website feature commit `62243cbbee9bf8588ce5b61895475c3c557f8ab1` passed its Vercel production deployment. Signed-out Explore and public report details were checked on https://ecopin-web.vercel.app with no browser errors.

Android 0.1.0 build 4 was built from source `25a6ade571a307072de826292ae0d591ebbeb8f4`. Its package ID and signing certificate match the previous downloadable APK. The public JSON manifest and SHA-256 file identify the downloadable artifact. Existing installations must install the new APK to receive the native indicators. Device installation/TalkBack acceptance remains pending.

The backend release also patches the compatible body-parser dependency to 2.4.0 to clear the pre-existing high-severity audit failure. Backend regression: 200 tests passed; web regression: 141 tests passed; production web build passed; affected mobile checks: 24 passed. Four unrelated dashboard preview tests still look for an obsolete route label.
