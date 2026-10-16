# ecopin-web QA Security Audit Log

Audit date: 2026-10-16 (Asia/Manila). Scope: ecopin-web only; shared services are considered only as web-client dependencies. No mobile inspection or modification. Application code is unchanged.

## Executive Summary Dashboard

| Metric | Count |
| --- | ---: |
| Total Checked | 50/50 |
| Passed | 11 |
| Failed (Vulnerable) | 19 |
| Needs Manual Verification | 20 |
| Not yet checked | 0 |
| Critical findings | 1 |
| High findings | 1 |
| Medium findings | 8 |
| Low findings | 2 |

Counters classify each checklist item once. Severity counts describe unique confirmed findings. A static pass does not certify deployed infrastructure. Secrets are never reproduced in this log.

Nineteen failed checklist items map to twelve unique security findings: VULN-01 covers #4/#5/#15/#40; VULN-02 #25; VULN-03 #7/#41; VULN-04 #8; VULN-05 #16; VULN-06 #19/#50; VULN-07 #46; VULN-08 #10; VULN-09 #12; VULN-10 #28; VULN-11 #22/#37/#38; VULN-12 #35. Functional observations are excluded from security severity counters. npm's package/advisory counts are not additional unique app findings. Source, synthetic, loopback and configured-Supabase evidence are distinguished; public-host reachability remains unverified.

All seven phases are recorded. “50/50 checked” means every item was investigated and classified; the 20 manual items are unresolved evidence requirements, not passes. Earlier phase summaries remain historical snapshots. Current-source probes, the preexisting production build and configured-service checks are explicitly distinguished because the user's other edits continued during this audit.

### Final review order

| Priority | Finding / review target | Evidence to require before closing |
| --- | --- | --- |
| 1 | VULN-11 Critical: vulnerable Next/native dependency chain | Patch the supported framework/tooling and affected dependencies; verify installed and deployed artifact versions against current advisories, tests and a fresh dependency audit. The temporary vulnerable web server remains stopped. |
| 2 | VULN-03 High; VULN-04 Medium: anonymous legacy-view and storage boundaries | Deny anonymous private-detail reads and align object-origin access with the intended public/private media policy; retest effective grants/listing/known-object access. Close-out still reproduces legacy-view reads and anonymous listings. |
| 3 | VULN-01/05/10: preview authorization, input/work limits | Authenticate and authorize before reads/solver work; enforce validated bounded inputs and server-side quotas. Verify no/invalid/low-role requests plus valid authorized fixtures. |
| 4 | VULN-02/06/07/08/09/12: browser/session/rendering/diagnostic controls | Review JavaScript-readable credentials, remove unsafe HTML and diagnostic exposure, enforce response headers, return generic errors and remove raw sensitive logs. Validate the final production artifact. |
| 5 | FUNC-01–05 and QA/config observations | Recheck refresh and temporary-token contracts, admin UI gates, query grammar, severity/cluster mapping, solver-output validation and evidence-cache identity boundaries without changing user data. |

### Consolidated manual-verification queue

| Checklist items | Missing evidence / owner boundary |
| --- | --- |
| #6, #9, #33, #34, #45, #49 | Valid disposable role/tenant A/B sessions and records; authenticated read/mutation permissions and ownership at the service boundary |
| #24, #26, #47 | Service password/reset/temporary-token policy, JWT signing/verification/revocation and actual successful-session cookie behavior |
| #11, #13, #14, #29 | CI and historical/deployed artifacts, repository exposure, privileged-key exclusion and host preview/staging controls |
| #20, #21, #48 | Actual authenticated mutation/CSRF contract; disposable upload validation; deployed transport and data/key protection settings |
| #39 | Actual downstream model/prompt contract and isolated prompt-boundary fixtures if a prompt-capable model is used |
| #42, #43, #44 | Critical-event completeness/integrity, deployed monitoring and tested alert delivery, provider backup/storage recovery configuration and isolated restore-drill evidence |

No remediation was applied. This audit's only file change is this log; concurrent application/package/assets/test changes belong to the user's working tree and were neither reverted nor claimed as audit work. The Markdown-only update requires no code graph rebuild.

## Workflow Trace Log

### Phase 7 — Logging, Monitoring & Operational Readiness

Status: complete for scoped web source, synthetic redaction checks, production-artifact inspection and bounded anonymous close-out retests. Scope: browser/server logging and redaction → admin audit-log consumption and event evidence → monitoring/alert hooks → documented backups and restore verification. Observability guidance was applied to assess evidence, not to add a telemetry vendor or change logging. Fast-agent inventory was delegated and independently reviewed. No real account event, alert delivery, backup restore or state mutation was triggered; all log probes used synthetic fields. Operational controls outside the web evidence boundary remain explicitly manual.

Sensitive-logging batch: independently executed the four current report-detail console statements with synthetic report/profile/evidence objects and consent=false, using a capturing console stub. Email, private-note and evidence-reference markers were retained unredacted. The current upload diagnostic also retained the first 20 characters of a synthetic token; it does not log the complete token. No real credential or personal data was used or printed. Each of the four report/profile/evidence/upload logging labels occurs in one production JavaScript file, confirming these diagnostics are also present in the existing artifact. This is an unredacted logging boundary, not proof of a public log endpoint or a usable token disclosure. #35 fails under VULN-12.

### Phase 7 scope and results

| Item | Result | Evidence |
| --- | --- | --- |
| #35 Logs containing tokens, emails, passwords or private user data | Failed | VULN-12: current report-detail source logs full report, profile and evidence objects before consent-sensitive display; synthetic private fields remain unredacted. Upload diagnostic logs a token prefix only. Logging markers remain in the existing production browser artifact. No password logging or complete usable bearer disclosure established. |
| #42 Missing immutable audit logs | Needs Manual Verification | Admin audit-log page and authenticated GET helper exist, with actor, event, entity and event_data display/export. No web-side audit emitter found; event production, completeness, retention, append-only privileges and integrity controls reside outside this inspected web boundary. No real role/status/reassignment/deletion event was triggered. A viewer alone neither proves immutability nor proves absence of logs. |
| #43 Missing monitoring or alerting | Needs Manual Verification | No installed Sentry/OpenTelemetry/New Relic/Datadog SDK, web error-boundary/instrumentation file or alert config was found in the scoped web files/dependency inventory. Hosting/Supabase/service monitoring may exist independently; actual alert rules, delivery and ownership were unavailable. Browser role=alert UI is not operational monitoring. |
| #44 Missing backup or restore plan | Needs Manual Verification | No web-local backup/PITR/restore runbook, retention/RPO/RTO policy or drill evidence was found in scoped docs/scripts. Provider backup settings and separate infrastructure docs were unavailable. No restore was attempted. Database backups alone must not be assumed to cover stored evidence-object bytes. |

Audit-trail review: app/dashboard/admin/audit-logs/page.js:48–53 requests up to 500 records, :127–176 displays event/actor/entity fields, :187 applies AdminGuard, and :198–207 exports event_data. lib/api/admin.js:335–365 calls GET /api/admin/audit-logs with the stored bearer when present. The system-log reader is at admin.js:301–332. Phase 2's real missing/invalid-bearer reads were 401. These demonstrate readers and authentication on sampled anonymous requests, not a guarantee that every critical event is written or that valid low-role users cannot read/alter records.

Monitoring/backup review: no app error.js/global-error.js/instrumentation file or installed supported-vendor SDK was located by the scoped inventory; the dependency query returned empty. The web docs/scripts inventory provided no operational backup or recovery plan. This is a bounded absence of web evidence, not a finding that platform facilities are disabled. Supabase exposes logs/metrics and integration options ([observability documentation](https://supabase.com/docs/guides/observability)); project enablement, alert rules and routing still need direct verification. Supabase explicitly distinguishes database backups from Storage object bytes ([backup documentation](https://supabase.com/docs/guides/platform/backups)); verify separate recovery coverage for report/evidence files. Logging review follows sensitive-data exclusion and protection principles in the [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).

Bounded close-out recheck after concurrent-work indications: with only the configured browser anon key over HTTPS, limit=1 REST reads still returned public_reports 200 with the exact safe 19-field projection, reports_view 200 with legacy private-detail columns, and base reports 401/42501. No row values were retained. All three recognized private bucket root listings still returned 200 with one entry each. Thus VULN-03 and the anonymous-listing portion of VULN-04 remain reproducible at close-out; no new object download/HEAD or permission mutation was attempted. Source changes or documentation naming a repair do not override the observed effective anonymous grants.

| Manual Phase 7 follow-up | Required review evidence |
| --- | --- |
| Critical admin events | Disposable authorized role/status/assignment/deletion actions produce actor, target, timestamp, outcome and correlation records; rejected sensitive attempts are recorded under a defined policy without secrets/private payload dumps |
| Audit integrity and access | Low roles cannot query unauthorized records or update/delete audit entries; append-only service grants or tamper-evident external retention, UTC/time synchronization, access auditing and retention/export policy are demonstrated |
| Error/security monitoring | Production web/backend/job failures and abnormal auth/preview use reach a protected sink with safe redaction, deployed release identifiers and useful correlation; source maps if privately uploaded stay inaccessible publicly |
| Alert ownership and delivery | A synthetic event reaches the designated operator through configured rules; thresholds, deduplication, escalation and response runbook are verified without raising a real incident |
| Database recovery | Actual project backup/PITR enablement, retention, last successful run, recovery points and named operator are verified; documented recovery-point and recovery-time targets are tested in an isolated destination |
| Evidence/storage recovery | Separate backup/version/replication coverage for object bytes; restore verifies sample report-to-object consistency, access policies and private media gating, without exposing a restore copy publicly |
| Recovery exercise | Date, restored scope, validation results, measured recovery time/data loss, dependencies/secrets/config recovery and sign-off retained; never restore over production merely to complete this checklist |

Phase 7 summary: 4 investigated; 1 failed item, 3 manual-verification items; 1 new Medium security finding. Cumulative final classification: 50/50 investigated, 11 scoped passes, 19 failed checklist items and 20 manual-verification items. Twelve unique security findings: 1 Critical, 1 High, 8 Medium and 2 Low. No fixes, package changes, real account mutations, model calls, uploads or restoration were performed in this phase.

#### [VULN-12] (#35) Sensitive report/profile/evidence objects reach browser diagnostics

**Severity:** Medium.

**Workflow Context:** Staff report-detail loading and evidence upload; map/report diagnostics provide additional object-logging surfaces.

**Location:** ecopin-web/app/dashboard/(shared)/raw-data/[id]/page.js:64–67 (full loaded report/profile/evidence), :294 (20-character token prefix), :314 (upload response); components/map/EcoPinMap.js:279–282 and :315 (report/cluster objects and realtime callback payload). Consent-sensitive reporter display is at raw-data/[id]/page.js:787–796.

**Proof of Concept / Evidence:** The detail loader directly passes reportData, reportData.profiles and evidenceData to console.log without selecting safe metadata or applying redaction. Logging happens before the later role-dependent report check and independently of consent-sensitive reporter display. Executing those exact statements with synthetic email/private-note/evidence markers and data_consent=false retained all markers. The upload diagnostic prints token.substring(0,20), which exposes credential material but is not proof of a usable complete token. Production static output contains all four tested diagnostic labels. Any party or collector already able to inspect that browser console can obtain the raw logged fields even when the visible screen anonymizes a reporter. No remote logging collector, cross-user access, actual sensitive production log contents, password logging or complete token disclosure was demonstrated; the browser must first receive the data, and logs are not an independent backend authorization bypass. Realtime payload logging is source evidence only; no live subscription was exercised.

**Recommended Fix:** Remove raw report/profile/evidence and token diagnostics from production. If an event is needed, log only an allowlisted event name, non-sensitive outcome, correlation ID and bounded counts; never include bearer fragments, private notes, reporter contact objects or storage references. Apply a centralized production logging policy with redaction before serialization and explicit handling for nested objects/errors. Validate with synthetic sensitive-field fixtures against the emitted output and production artifact, and review any actual support/error collection sink for access, retention and historical copies. Keep the protected admin audit trail separate from ad hoc browser debugging.

### Phase 6 — AI Features & Automated Workflows

Status: complete for inspected web contracts, isolated current-source solver fixtures and safe read-only local service checks. Scope: web forecast/classification surfaces, route optimization/Sweeper preview → approval/application boundaries, generated response handling and security-relevant stubs or bypasses. Mechanical endpoint/source inventory delegated to the fast agent. No paid model request, automated job, approval, assignment or other state mutation was triggered. The Windows-vulnerable Next runtime was not restarted. Backend/mobile/model implementation directories remained out of this source audit.

First source/fixture batch: the inspected web code contains no LLM provider SDK, chat/system prompt construction or arbitrary tool-call executor. The visible AI-labelled surfaces are forecast reads/generation wrappers, queue planning/job polling, draft-plan commit/run approval and the legacy local route-preview solver. They are not assumed to be generative agents merely because of AI branding. The local preview remains an unauthenticated automated read/compute path (VULN-01), so #40 fails on that concrete automation boundary; backend plan/forecast mutation authorization is still unverified.

Isolated current-source preview with realistic public projection field names (severity_level/severity_score, cluster_id; no severity or is_cluster) converted synthetic low and high reports to equal base_severity=1 and treated a cluster-linked report as individual. This verifies a data-contract mismatch, not that any real cleanup assignment changed. A separate synthetic solver response containing an out-of-input target ID, included_reports:null, a nonnumeric priority and an unknown top-level marker was accepted and returned as HTTP 200. Its null array fails the consumer's included_reports.map operation. All database/solver activity was stubbed; no live generation/dispatch occurred. #50 fails for concrete unchecked automation/result assumptions, not a claim about who authored or reviewed the code; functional details follow.

Runtime authentication controls: nine read-only configured-loopback endpoints (forecast current/predictions/accuracy/available dates, optimization queue/job/plan/runs and Sweeper config) each rejected missing and invalid bearer credentials with 401 (18/18). Job/plan probes used nonexistent synthetic IDs and no generation/commit endpoint was called. Bodies were discarded without logging. These positive controls do not certify valid low-role access, tenant isolation, mutation authorization or background-job permissions. Existing optimization response tests passed 4/4, exercising 429/error/success client handling; they do not verify planner correctness or backend authorization.

Prompt-boundary control: an isolated preview fixture placed a text marker in report title, description and notes, plus a synthetic reporter ID. None were forwarded in the solver request. Report entries included only id/lat/lon/base_severity/created_at. The preview is therefore a structured deterministic-solver boundary, not a demonstrated natural-language prompt injection sink. Whether downstream image classification/forecast generation uses any prompt-capable model remains unverified without service-contract evidence. No instruction-like text or image was submitted to a real model.

### Phase 5 — API Resilience, Webhooks, Headers & Dependencies

Status: complete for available web source, local production HTTP, isolated handler tests, current registry audit/version queries and maintainer advisory review. Scope: production debug/experimental routes → actual local response headers/CORS → preview errors and work limits → auth/API limiter boundaries → native dependency audit and package freshness. Fast-agent dependency/config scanning delegated as requested. No install, audit fix, brute-force, sustained load or webhook delivery was performed. Application/package/lock files and concurrent user edits were preserved.

First runtime batch: existing production build served /, /auth, /explore, /test-session and /experiments/yt-maps-landing with HTTP 200; /debug and /api/test returned 404. /test-session HTML included Session Timeout Test Page. All seven responses lacked Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy and Strict-Transport-Security. Source next.config.mjs has no header configuration. Browser execution and hosting/proxy behavior are checked separately; initial HTML findings do not prove cross-user session access.

Web preview OPTIONS with an external Origin returned 204 with Allow: OPTIONS, POST and no Access-Control-Allow-Origin. Two external-origin probes to the configured loopback backend (auth/me GET and auth/login OPTIONS) returned 500 without ACAO, while supplying CSP/frame/nosniff/referrer/HSTS headers. Thus the backend's security headers do not demonstrate equivalent headers on Next.js pages, and the rejected-origin status is not proof of permissive CORS. The unchanged limiter abort tests passed 3/3; a benign Node package-module-type warning was emitted. These tests exercise queue cancellation, not security ingress quotas.

Dependency audit escalation: sandbox npm is configured offline and its offline audit returned a zero summary that could not be treated as current. Forced-online sandbox queries failed through the sandbox proxy. A read-only, approved escalation of npm audit --offline=false --json --fetch-retries=0 succeeded against the registry and returned 12 affected package entries: 1 Critical, 10 High, 1 Moderate. These are npm package-tree severity counts, not 12 independent exploitable application findings. The installed/runtime Next.js version is 16.3.0. Maintainer advisories confirm Critical Windows-hosted RCE and AVIF optimizer RCE affect this version. The temporary audit server on port 4017 was immediately stopped; no exploit payload, AVIF or SSRF target was requested and no package was changed. Production-only reachability and current version metadata are being checked separately.

Final runtime/dependency batch: configured frontend Origin produced 401 with an exact allowlisted ACAO and credentials=true; an untrusted Origin produced 500 with no ACAO and body keys message/error/stack. The stack value was not logged. In the isolated preview test, a synthetic database error marker was returned verbatim in a 500 error body; eight tiny in-memory preview calls each reached database/solver stubs and returned 200, with zero real network traffic. This is source-boundary verification, not a live rate-limit stress test.

Production-only npm audit (omit=dev) reports five affected package entries: next Critical; sharp/nanoid/source-map-js High; baseline-browser-mapping Moderate. Production-tree membership does not prove all code runs on attacker input: PostCSS/Tailwind helpers are also build-time dependencies. Current npm outdated reports 13 direct packages with newer versions; Next 16.3.0 can resolve to wanted/latest 16.4.2 under its current range. No package was updated. The existing production manifest confirms cacheComponents=false, image optimization enabled, zero remotePatterns, one localPattern, output formats image/webp, and process platform win32. Combined with App Router and Next 16.3.0, this matches the Windows advisory's deployment conditions; no exploit was attempted.

Reachability refinement: maintainer GHSA-cjq9-62q9-8jv4 explicitly excludes apps without remotePatterns, so the sampled manifest does not match that SSRF prerequisite; #23 retains its scoped pass with this added evidence. No next/og ImageResponse/use cache/draftMode source use was found. next/image is used in five modules. Output format image/webp does not by itself establish safe handling of malicious input formats; AVIF/native-image advisory applicability still needs a patch/config review. The Windows RCE advisory is CWE-22, so earlier manual #22 is upgraded to Failed under VULN-11; backend media-path ownership checks remain pending independently.

### Phase 4 — Input Validation, Injection & File Handling

Status: complete for scoped web source, isolated handler/browser probes and targeted existing tests. Scope: public map/query filters → forecast/map HTML rendering → officer route-preview inputs → staff evidence/avatar upload and media paths. Source scanning delegated to the fast sub-agent; primary performed trust-boundary review and isolated reproductions. Existing concurrent working-tree edits remain untouched. No malicious content was stored in real reports, no real uploads/deletions were performed, and no cloud metadata/private-network SSRF target was requested.

Initial review locates one local server handler (route preview), client-built Supabase filters, several Leaflet HTML-string builders, and backend-directed file uploads. Normal React text rendering, literal inline scripts/styles and constrained numeric/constant icon values are distinguished from untrusted string interpolation. The preview handler's fixed localhost solver URL is not automatically an SSRF sink merely because it calls an internal service.

Current-source preview handler was exercised in isolation with a synthetic report/database and intercepted solver (zero real requests). Valid input returned 200. Nonnumeric aging_factor also returned 200, serialized NaN into null for the solver and returned a null task priority via the native fallback. Negative detour limits and array config were accepted with 200; null config returned 500 after two database reads; null body and malformed JSON returned 500. A JSON body labeled text/plain with an external Origin was also accepted (the endpoint has no origin/content-type guard). These are input-boundary results, not a claim of cookie-based CSRF or actual task assignment changes. #16 fails; VULN-05 records the distinct validation issue.

Isolated Chromium reproduction used the current HotspotForecastMap onEachFeature callback with installed Leaflet 1.9.4. All network requests were blocked and the fresh browser context had no app session or real data. A synthetic img/onerror marker inserted separately into top_issue_type, issue_breakdown count and rank executed a harmless window.auditXss=1 marker in all three cases when the actual Leaflet popup opened. This confirms an unsafe HTML rendering boundary under #19; no malicious forecast/report was stored or fetched from the real service. Upstream attacker control of these forecast fields remains unverified.

Additional checks: public map query tests passed 10/10 (safe field projection, viewport/pagination, dateline/world bounds, rejection before requests, aborts/errors). Existing private-media tests passed 4/4. Expanded current-source resolver probes accepted one valid cleanup path and rejected eight encoded traversal/double-encoding/backslash/bucket/query/kind/length cases. A URL-normalized dot segment can become a different canonical Report Evidence path and is accepted; selecting an object path is not proof of filesystem traversal, and the backend must authorize the resulting canonical object.

A bounded live anonymous query against public_reports reproduced the shared search helper's literal comma failure: title/description ilike OR filter built from search='audit,query' returned HTTP 400 / PGRST100. Only id was selected with limit=1; no record data was logged. This is a PostgREST filter-grammar handling defect, not evidence of SQL or NoSQL execution or private-row access. It is logged separately as FUNC-03.

### Phase 3 — Database, Supabase & Storage Security

Status: complete for available web source and bounded anonymous read-only runtime checks. Scope: public map/report projection → authorized detail/evidence API → private-media resolver → storage; staff photo/avatar upload paths are traced without uploading files. Existing Supabase/Postgres security skills applied. No mobile/backend implementation files were inspected and no database/storage mutations or service-role requests were performed.

Source review: public-report-page.mjs:1 selects an explicit 19-field projection; public map repair documentation says base report privileges were not yet contracted and does not certify every legacy API or storage assignment. Runtime clients in lib/supabase.js use NEXT_PUBLIC_SUPABASE_ANON_KEY. Known private storage buckets are Report Evidence, Cleanup Task Photos and Report Cleanup; private-media.mjs rewrites their recognized references to the authenticated backend media route.

The first existing-test runs could not spawn test subprocesses (EPERM); this was a sandbox runner limitation, not an application assertion failure. Retrying with Node's supported --test-isolation=none option successfully executed the unchanged tests. Runtime probes report statuses, counts and field classifications rather than private values.

First completed batch: private-media tests passed 4/4 with --test-isolation=none. The live reports-access suite passed 2/3; the security assertion that anon is denied reports_view failed because the SDK returned error=null. Independent bounded REST reads reproduced this with the configured browser anon key (decoded role anon, HTTPS transport): public_reports returned 200 with exactly the documented 19 safe field names; reports_view returned 200 with a row containing nonempty user_id plus internal metadata columns; base reports returned 401/42501; clusters returned 200; optimization_settings returned 200 with zero rows. Only one row per relation was requested. No identifiers or field values were logged. The reports_view boundary is a confirmed failure under #7, not a failed network connection or proof that base-table RLS is disabled.

Second completed batch: bounded read-only object-list operations (POST list API, not upload) using the same anon key returned 200 and one root entry for each of Report Evidence, Cleanup Task Photos and Report Cleanup. One-entry filtered reads through reports_view independently confirmed populated notes and before_photo_url; no populated photo_lat was found by the bounded non-null query. A known Report Evidence reference from that response was resolved only in memory. The backend /api/media/storage route rejected that exact reference with both missing and invalid bearer (401 each), but HEAD on the direct Supabase public-object URL without any authentication returned 200 image/jpeg. No image bytes were downloaded and no path, note, signed token or object name was logged. This confirms storage-origin bypass of the web media gate (#8) and excess anonymous database privileges (#41, same underlying VULN-03 as #7).

Impact qualification: a further limit=1 query constrained to on_private_property=true and non-null before_photo_url returned no row. Thus public storage access to the sampled evidence object is verified, but retrieval of an actually private-property photo is not. Public exact-location reports intentionally have public evidence consumers in the landing/explore code. VULN-04 is therefore Medium for the origin/gateway privacy-classification mismatch, not High for an unproven private-image disclosure. Raw legacy-view reporter identity/notes exposure remains High under VULN-03. HTTPS was used for Supabase; the configured backend uses HTTP on loopback, which is not evidence of an insecure production transport.

### Phase 2 — Authentication, Sessions & Access Control

Status: complete for available web source, isolated handler tests, local browser fixtures and limited unauthenticated loopback HTTP probes. Static review follows actual sign-in → dashboard /me → role-specific admin/officer screens → session validation/refresh → sign-out and forced-password-change flows. No real account login, valid bearer credential, password mutation or role mutation is used.

Isolated Chromium test of the existing local production build at 127.0.0.1:4017: all /api/ requests were intercepted with synthetic responses, external requests were blocked, and each scenario used a fresh browser context. Private data API stubs deliberately returned 403. Browser automation required an approved sandbox escalation after the first launch returned EPERM; it then completed successfully. No authenticated personal browser was used.

| Scenario on direct /dashboard/admin/users navigation | Observed browser result |
| --- | --- |
| No session | Initial HTML 200; browser redirects to /auth; no admin data requests |
| Synthetic /me role officer | Admin users screen renders; admin users/settings/timeout requests attempted (individual paths below); mocked admin data request returns 403 |
| Synthetic /me role citizen | Admin users screen renders despite sign-in excluding citizens; same admin requests attempted and rejected by mocks |
| Synthetic /me role field_crew | Browser redirects to /auth; admin users/settings requests were still initiated before redirect |

Exact officer/citizen requests: GET /api/auth/me, /api/admin/settings, /api/admin/users, /api/admin/timeout. Field crew requested /api/auth/me, /api/admin/settings and /api/admin/users. No scenario produced an uncaught browser page error. The fixtures supply roles and synthetic tokens; this does not demonstrate that the real backend accepts forged tokens or returns protected data to these roles. It demonstrates UI route behavior and premature requests only. Initial HTML 200 for a client-rendered shell is not itself a private-data leak.

Current-source isolated handler reproduction: unauthenticated and invalid-bearer requests to route preview both reached optimization_settings/public_reports reads and produced HTTP 200 synthetic plans with one task each. Two solver attempts were intercepted and forced offline. Real network requests: zero.

Subsequent real local-runtime probes (separate from the synthetic tests): the configured web backend resolves to loopback port 4002. Read-only GET /api/auth/me, /api/auth/validate-session, /api/admin/users, /api/admin/stats, /api/admin/settings, /api/admin/audit-logs and /api/admin/system-logs each returned 401 with no credential and again with Bearer audit-invalid-token (14/14 rejected; no Set-Cookie on these responses). Response data was not logged. This verifies an authentication boundary on those sampled endpoints, not authenticated role or ownership enforcement.

One actual POST http://127.0.0.1:4017/api/tasks/auto-generate/preview with no credentials and body {"config":{}} returned 200, seven route plans, 8018 response bytes and no error. This confirms local deployed-build reachability of VULN-01 using the app's existing anonymous client configuration. The request reads reports/settings and computes a preview; no assignment/status/account mutation was requested. No report IDs, coordinates or response payload were retained in this log. No load test or repeat enumeration was performed.

Current-source sign-in/session reproduction with synthetic credentials and responses: the active sign-in handler stored only lastActivity/authToken when its successful officer response included a refresh token; the unused login helper did store refreshToken for the same response. On a thrown network error, validateSession returned {valid:true,message:'Network error, assuming valid session'}. No real credentials, refresh token, account state or provider was used. The first sign-in test fixture omitted user.role and was correctly rejected by the citizen fallback; adding the officer fixture made the intended refresh-path test pass. This was a fixture correction, not an application change.

Sign-out source trace: the profile calls logout; that helper attempts POST /api/auth/logout with the current bearer, then removes local access/refresh/activity state in finally. Non-2xx logout status is not checked. Server-side revocation, refresh-token rotation and reuse detection require real authorized integration checks. Forced initial password change sends tempAuthToken as bearer, but then promotes the same temporary token to authToken rather than consuming any new token returned by the server; its server-side scope/expiry remains unverified.

### Phase 1 — Secrets, Repo Hygiene & Build Configuration

Status: complete for available local evidence; deployment and historical coverage limitations remain below. Initial boundary: browser bundle/public assets → Next.js web runtime → configured API services. Assets under review: credentials, deployment configuration, build output and repository history. Abuse cases: download accidentally published environment material; extract private credentials from browser JavaScript; activate development bypasses or default accounts.

Initial inventory and configuration scan delegated to a fast sub-agent. Repository graph queried before source discovery, as required. No live production changes, account mutations, or credential testing performed.

Local HTTP trace (existing production build, Next.js 16.3.0, isolated server bound to 127.0.0.1:4017):

| Request | Observed result |
| --- | --- |
| GET / | 200 HTML; 9 referenced JavaScript assets |
| GET /explore | 200 HTML |
| GET /.env and /.env.local | 404 each |
| GET /.git/config | 404 |
| GET /next.config.mjs and /package.json | 404 each |
| GET corresponding .map URLs for all 9 landing scripts | 404 each |
| GET corresponding .map URLs for all 9 explore scripts | 404 each |

These requests verify local HTTP behavior only. Map interaction, downstream data permissions, sign-in and role workflows remain for later phases. The existing build may predate current uncommitted source; no rebuild or dependency installation was performed. Source maps are disabled by default according to the installed Next.js documentation; next.config.mjs:1–8 does not opt in. lib/supabase.js:4–5 reads public URL and anonymous-key variables, not a service-role variable. Supabase documents anonymous keys as low-privilege client keys (https://supabase.com/docs/guides/getting-started/api-keys); database policies still require Phase 3 verification.

Production artifact cross-check: .next/required-server-files.json has config.productionBrowserSourceMaps=false and an empty config.env object. BUILD_ID timestamp is 2026-10-16T06:27:14.915Z. No environment values were printed. Source and build configuration agree on disabled browser source maps.

The temporary production server was stopped after HTTP verification; port 4017 is no longer listening. The web repository already contained 13 modified tracked files and 4 untracked files before this audit; they were preserved. This audit adds only this log.

## Checklist Results

### Phase 2 scope and results

The web sign-in flow is explicitly for authorized personnel: app/auth/page.js:45–47 rejects citizen and field_crew responses and directs those roles to mobile. No web signup, forgot-password, password-reset or OAuth callback flow was found in app/lib. Forced initial password change is a distinct implemented flow. The mobile app is not inspected. The shared dashboard uses browser-side /api/auth/me verification; backend ownership and role enforcement are not yet verified.

| Item | Result | Evidence |
| --- | --- | --- |
| #4 Weak or missing authentication | Failed | VULN-01: officer preview handler never authenticates; isolated unauthenticated/invalid-token calls return 200, and one real local unauthenticated POST returned seven route plans. In contrast, seven sampled backend session/admin GET endpoints rejected missing/invalid bearers (14/14 HTTP 401). |
| #5 Missing authorization checks | Failed | VULN-01: preview handler has no server-side role check; the UI's OfficerGuard is its only role gate. |
| #6 Users accessing other users' data | Needs Manual Verification | Web fetches /api/reports/{reportId} and evidence by caller-selected report IDs. Wrapper sends bearer when present; no real cross-user read was executed. lib/api/reports.js:94–118, :168–188. Need authorized A/B accounts and ownership assertions. |
| #9 Admin routes unprotected | Needs Manual Verification | Client-only shared layout; several admin pages lack page role guards. Synthetic officer/citizen sessions rendered /dashboard/admin/users but mocked APIs denied private data (FUNC-02). Real sampled admin read APIs returned 401 for missing/invalid bearers. Valid low-role sessions and admin mutation permissions remain unverified. |
| #15 Client-side-only security checks | Failed | VULN-01: officer guard has no corresponding auth/role check in the local preview handler. Other client gates require service-side verification. |
| #24 Broken password reset flows | Needs Manual Verification | No web reset/signup/OAuth flow found. Forced initial password change is implemented at app/force-change-password/page.js:32–37, :87–97 and lib/api/auth.js:126–149. Verify temporary-token scope/TTL/single-use, password policy and throttling at the service; see QA-02. |
| #25 Weak session management | Failed | VULN-02: persistent JavaScript-readable access/temporary tokens; refresh helper can persist refresh tokens. FUNC-01 confirms active sign-in drops refresh token; QA-01 records fail-open validation. Server revocation/expiration still requires verification. |
| #26 Weak/leaked/reused JWT secrets | Needs Manual Verification | No web custom JWT signer/verifier found. SessionProvider.js:129–178 decodes exp for UI expiration only, not signature verification. Local JWT_SECRET length/non-placeholder evidence from Phase 1 cannot prove the service uses a strong, unique signing key or validates issuer/audience/algorithm. |
| #32 Frontend-only payment/tier/quota checks | Passed (not applicable to discovered web features) | Scoped app/lib/component searches found no payment, billing, subscription plan or paid feature gate. Client request throttling is separate and will be checked under #28. This does not certify any unimplemented paid feature. |
| #33 IDOR | Needs Manual Verification | Caller-selected report/user/task IDs are sent to backend routes. lib/api/reports.js:338–355 (status), :732–747 (details); lib/api/admin.js:118–135 (role), :151–168 (delete), :189–206 (password). ID parameters alone are not IDOR; real service ownership and role enforcement are unverified. |
| #34 API trusts user-controlled IDs/roles | Needs Manual Verification | Admin create passes userData and role change passes {role}; crew membership update body includes {user_id:userId,action}. lib/api/admin.js:85–101, :118–135; lib/api/optimization.js:269–275. The crew user_id identifies the target member, not an actor claim. Verify server derives actor identity from session and separately authorizes target crew/member/role. Legitimate admin target fields are not themselves privilege escalation. |
| #45 Public internal dashboards | Needs Manual Verification | Dashboard initial HTML shell returns 200; anonymous browser redirects to /auth without admin requests in tested route. Real local admin stats/audit-log/system-log reads returned 401 for missing/invalid credentials. Valid low-role access remains untested. Route names or UI assets are not a demonstrated sensitive-data leak. |
| #47 Missing cookie flags | Needs Manual Verification | No application cookie setter or cookie-session implementation found in app/lib/components; the implemented browser session uses localStorage. Sampled 401 auth/admin responses and the preview response set no cookie. Successful sign-in/service/reverse-proxy cookie behavior remains untested; no flags can be inferred from absent cookies. JavaScript-readable credential risk is counted once under VULN-02/#25. |
| #49 Poor tenant/role isolation | Needs Manual Verification | No authenticated multi-LGU/tenant fixtures available. Preview has no tenant filter but reads public_reports; whether that view's geographic visibility is intended and which settings are private depends on actual schema/RLS policy. Need explicit LGU policy plus tenant A/B records and real role sessions. |

Phase 2 summary: 14 investigated; 1 scoped pass/not-applicable, 4 failed items, 9 manual-verification items. Cumulative: 23/50 investigated; 6 passes, 4 failed, 13 manual, 27 not checked.

| Item | Result | Evidence |
| --- | --- | --- |
| #1 Exposed database credentials | Passed (scanned web source) | No embedded database connection credentials found. lib/supabase.js:4–5 uses environment-backed public URL/anon key. Ignored privileged local configuration is tracked separately under #14. |
| #2 Public .env files | Passed (local repository and HTTP) | .gitignore:34 ignores .env*; git ls-files reports no tracked .env files; no environment files found under public; /.env and /.env.local return 404. |
| #3 Hardcoded API keys | Passed (scanned web source) | No confirmed private hardcoded credential in non-env source/config; exact local service-role value absent from source and static output. Public anonymous Supabase and map keys are not classified as private credentials. Provider-side map-key restrictions are not verified. |
| #11 Build logs leaking secrets | Needs Manual Verification | package.json:5–15 scripts contain no environment-dump command; no CI/deployment workflow found under the web workspace. Actual CI logs, host settings and old build logs are unavailable. |
| #13 Leaked repositories or commit history | Needs Manual Verification | Regex-targeted local history scan yielded no confirmed private secret; exact current service-role key search returned no matching commits. This was not a full review of every historical file revision, deleted/remote branches, forks or repository visibility. |
| #14 Secrets included in frontend JavaScript | Needs Manual Verification | .env:7 contains NEXT_PUBLIC_SERVICE_ROLE_KEY with decoded role service_role; signature/validity not tested. Zero exact matches in 115 static files and non-env source/config; no source references found. Existing build config.env is empty. Deployment and historical artifacts still need verification. |
| #29 Public test or staging environments | Needs Manual Verification | No confirmed staging auth bypass found; lib/api/hotspot.js:3 defaults to localhost:3002 when unset. Inventory includes /test-session and /experiments/yt-maps-landing; their content/access controls belong to Phase 5 #10. Host preview protection and deployed dev flags are unverified. |
| #30 Default credentials left unchanged | Passed (scanned web source) | No hardcoded login/admin fallback or default account password found in web source/scripts. Configured JWT_SECRET is 128 characters and not an obvious placeholder, which does not prove entropy or reuse safety. External account/password state was not tested. |
| #36 Source maps exposed in production | Passed (local source and build) | next.config.mjs:1–8; installed Next.js source-map guide; production manifest flag false; 18 HTTP map probes return 404. Live hosting is unverified. |

### Phase 3 scope and results

| Item | Result | Evidence |
| --- | --- | --- |
| #7 Open database read/write permissions | Failed | VULN-03: browser anon can read reports_view, including populated reporter user_id/notes/evidence reference fields. Existing deny test fails and independent bounded REST probes return 200. Base reports query is denied (401/42501); safe public_reports returns only its 19 projected fields. INSERT/UPDATE/DELETE and actual view/RLS definitions were not tested or inspected. |
| #8 Misconfigured storage buckets | Failed | VULN-04: all three web-recognized private bucket names allow anonymous one-entry root listing; a known Report Evidence object's public URL returns 200 image/jpeg without credentials while the backend media gate returns 401. Private-property photo retrieval and bucket upload/overwrite/delete permissions remain unverified. |
| #41 Excessive app database permissions | Failed | VULN-03: the actual browser client uses an anon key, not service_role, but that anon identity has excessive effective access to the legacy private-detail view. No privileged key was used. The unused NEXT_PUBLIC_SERVICE_ROLE_KEY configuration risk remains CONFIG-01/#14. |
| #48 Unencrypted sensitive data | Needs Manual Verification | Configured Supabase traffic uses HTTPS; configured backend HTTP is loopback. No at-rest database/storage encryption, key management, TLS enforcement on the deployed web/backend, private-field encryption or provider storage settings can be certified from this web source/read-only anon boundary. Persistent browser credentials are already VULN-02, not new evidence of provider encryption-at-rest failure. |

Phase 3 summary: 4 investigated; 0 passes, 3 failed checklist items, 1 manual item; 2 unique new findings (1 High, 1 Medium). Cumulative: 27/50 investigated; 6 passed, 7 failed, 14 manual, 23 not yet checked.

### Phase 4 scope and results

| Item | Result | Evidence |
| --- | --- | --- |
| #16 Missing input validation | Failed | VULN-05: preview accepts nonnumeric/negative/array config, propagates null priorities and returns 500 for malformed/null inputs. Existing public viewport validation is a positive control with 10 passing tests, not coverage for the preview handler or backend mutation APIs. |
| #17 SQL injection | Passed (scoped web code) | No raw SQL string/query execution, PostGIS SQL or RPC invocation found in app/lib/components. Supabase fluent filters use the SDK boundary. The search OR grammar issue is FUNC-03; no SQL execution or privilege bypass was demonstrated. Shared backend SQL internals are outside this source audit and not certified. |
| #18 NoSQL injection | Passed (not applicable to discovered web data stack) | No MongoDB/document-store query layer or NoSQL object operator interface found. PostgREST public-report filters are not a NoSQL database; functional filter-grammar handling is recorded without labeling it NoSQL injection. |
| #19 XSS | Failed | VULN-06: forecast properties are interpolated into Leaflet popup HTML; three synthetic response-field probes executed a harmless event handler in isolated Chromium. Backend/citizen control of those fields remains unverified. React-rendered report title/description are escaped; static theme/CSS dangerouslySetInnerHTML uses no interpolated user content. |
| #20 CSRF | Needs Manual Verification | Web mutations normally attach explicit bearer headers; no web cookie-session or Server Action declaration found. Preview accepts external Origin/text/plain JSON, but is unauthenticated and does not persist assignments, so that fact alone is not authenticated session-riding CSRF. Successful service cookie behavior, Origin enforcement and authenticated mutation contracts require authorized fixtures. |
| #21 Insecure file uploads | Needs Manual Verification | Uploads go to backend report/task/profile APIs. Client checks include JPEG/PNG/WebP allowlists and 5MB/10MB limits, varying by screen; one field-crew report handler checks size only. Client MIME claims are not proof of bytes or server enforcement. No file was uploaded and server magic-byte/MIME/size/name/storage restrictions were not tested. |
| #22 Path traversal | Failed (updated by Phase 5 dependency evidence) | VULN-11: installed Next 16.3.0 on Windows/App Router with cacheComponents=false matches GHSA-p293-qw3h-jr36/CVE-2026-75604 (CWE-22). No exploit was run. No direct application filesystem read/write path sink was found, and the client resolver rejected eight malformed probes. Backend media/upload/export ownership/path handling remains a separate manual check. |
| #23 SSRF | Passed (scoped route/config) | Custom web server fetch has fixed localhost:8000 target; browser fetches are not server SSRF. Phase 5 found a Next image-optimizer SSRF advisory but verified remotePatterns=[] in the build; the maintainer explicitly excludes that configuration. Backend fetch internals and future hosting/config changes are not certified. |

Phase 4 current classification: 8 investigated; 3 scoped passes/not-applicable, 3 failed items, 2 manual items. The third failure (#22) was upgraded from manual during Phase 5's dependency review and maps to VULN-11. Phase 4 itself added two unique Medium findings. Its original completion snapshot was 35/50 investigated; later cumulative counters are in the dashboard.

### Phase 5 scope and results

| Item | Result | Evidence |
| --- | --- | --- |
| #10 Production debug pages | Failed | VULN-08: /test-session production HTML returns 200 and exposes local diagnostic controls without a production/role gate. No cross-user session data was established. /debug and /api/test are 404; the public experiment page alone is not a sensitive leak. |
| #12 Verbose error disclosure | Failed | VULN-09: preview copies synthetic database error message into client JSON; actual backend untrusted-Origin 500 includes a stack field. No real stack/path/token was recorded. |
| #27 Permissive CORS | Passed (sampled web/backend responses) | No wildcard/reflected ACAO on sampled Next responses or external-origin preview preflight. Backend allowed the configured frontend Origin exactly and rejected an untrusted Origin without ACAO. Rejecting it with 500 is an error-response defect, not permissive CORS. Other deployment origins/routes remain unverified. |
| #28 Missing rate limits | Failed | VULN-10: no per-caller ingress quota/work cap in expensive preview handler; browser/per-process outbound queue is not an attacker request limiter. No live flood or auth brute-force was run. Backend auth/signup/AI rate enforcement remains manual. |
| #31 Unsigned webhooks | Passed (not applicable to discovered web routes) | No incoming webhook route/handler/signature integration found in the web inventory; sole custom route is preview POST. Outbound solver requests are not incoming webhooks. Shared service hooks not used by the web were not tested. |
| #37 Dependency vulnerabilities | Failed | VULN-11: successful current npm audit 12 affected package entries, including Critical Next; omit=dev still reports 5. Installed version/config and maintainer advisory establish affected Windows runtime presence; optional feature exploitation was not attempted. |
| #38 Outdated packages | Failed (security-relevant update gap) | VULN-11: registry confirms 13 direct packages behind available versions, including Next 16.3.0 versus wanted/latest 16.4.2 and known missing security fixes. Other newer packages are not automatically vulnerable or required major upgrades. |
| #46 Missing security headers | Failed | VULN-07: all seven sampled Next page/error responses lacked CSP/frame/nosniff/referrer headers; source has no policy. Backend headers do not cover the web documents. Hosted proxy/HSTS behavior remains manual. |

Phase 5 adds 8 investigated items (2 scoped passes, 6 failures), plus an evidence-based upgrade of earlier #22 from manual to failed. Five unique new findings: 1 Critical, 2 Medium, 2 Low. Cumulative: 43/50 investigated; 11 passed, 16 failed, 16 manual; 7 unchecked items remain for Phases 6–7. Manual items count toward investigation coverage but not passes.

### Phase 6 scope and results

| Item | Result | Evidence |
| --- | --- | --- |
| #39 Prompt injection | Needs Manual Verification | No prompt/LLM provider/chat/tool-call construction found in web source. Solver payload omits title/description/notes/reporter identity in the synthetic boundary test. Forecast and classification model internals/prompts are not visible within this web-only source scope; no live model payload was sent. AI branding alone is not evidence of an LLM or prompt vulnerability. |
| #40 AI/automated actions accessing data without permission | Failed | Existing VULN-01: unauthenticated local preview reads data and invokes a solver/native automation without a verified user/role. This is automated computation, not a claim of an LLM agent or unauthorized persisted dispatch. Nine backend read endpoints reject missing/invalid bearers, while authenticated generation/commit/approval/job-scope checks remain manual. |
| #50 Over-trusting generated/automated code and results | Failed (concrete unchecked contract/rendering assumptions) | Existing VULN-06 renders unvalidated forecast/service fields as executable HTML. FUNC-04/05 additionally reproduce mismatched report fields and unchecked solver task structure. No commented-out auth, fake helper or disabled security check was found in the scoped forecast/planner scan. Authorship and whether a human previously reviewed code are not inferred. |

Phase 6: 3 investigated, 0 passes, 2 failed items mapped to existing findings, 1 manual item. No new unique security finding is counted. Two confirmed functional defects and explicit automation-permission test cases are appended below. Cumulative: 46/50 investigated; 11 passed, 18 failed, 17 manual, 4 unchecked. Only Phase 7 remains (#35, #42, #43, #44).

## Detailed Vulnerability Findings

### [VULN-09] (#12 Verbose error messages)

**Severity:** Low.

**Workflow Context:** Failed route preview and rejected browser-origin requests to the web's configured auth service.

**Location:** ecopin-web/app/api/tasks/auto-generate/preview/route.js:165–167, :240–242; runtime configured backend /api/auth/me error response (web caller app/dashboard/layout.js:28 and public account helper). Backend implementation files were not inspected.

**Proof of Concept / Evidence:** The preview concatenates error.message from its database operation into a returned JSON error and copies arbitrary caught messages in its outer catch. An isolated current-source test supplied the synthetic marker audit-internal-schema.private_relation as the database error message and observed that marker in the 500 response, without a real database call. A separate actual unauthenticated request with an untrusted Origin to the loopback backend produced HTTP 500 with JSON fields message/error/stack; the stack field was nonempty but its contents were not retained. The same configured-frontend Origin received a normal 401/error-only response. No actual credential leak, raw SQL text or full database object was established; the defect is uncontrolled internal detail reaching caller-visible errors.

**Recommended Fix:** Return stable generic client errors and an opaque correlation ID; retain scrubbed internal diagnostics only in server logs. Map malformed input to 400/422, unauthorized requests to 401/403, rejected origins to an appropriate controlled status, and internal failures to a generic 500. Ensure production error middleware never emits stack fields. Test rejection/error paths explicitly, without hiding operational failures as success or empty data.

### [VULN-10] (#28 Missing ingress rate/work limits)

**Severity:** Medium.

**Workflow Context:** Publicly reachable officer route preview; database scanning and solver/native route computation.

**Location:** ecopin-web/app/api/tasks/auto-generate/preview/route.js:90–130, :136–173, :217–239; ecopin-web/lib/rateLimiter.js:3–8, :19–35, :41–76; direct active login fetch at ecopin-web/app/auth/page.js:32–35 is a separate backend-rate-limit verification lead.

**Proof of Concept / Evidence:** The preview handler has no caller quota, admission rejection, maximum report count or computation-work bound. It paginates the full report set and can call a solver or run nested report loops. The imported Supabase fetch wrapper has an in-process 30/s outbound queue; it delays database requests but does not authenticate callers, bound request admission/queue growth, provide per-IP/user quotas, or reject abuse with 429. Browser wrappers are also bypassable by direct HTTP callers. Eight tiny isolated handler invocations all reached synthetic database/solver stages and returned 200; no live flood, timing claim or endpoint saturation test was performed. Edge/proxy limits and backend login/signup/AI service throttles are not established. Missing public deployment controls cannot be inferred from environment variable names alone.

**Recommended Fix:** Authenticate/authorize preview first, enforce shared-store per-principal and fallback IP quotas before body parsing/database reads, return 429 with Retry-After when exhausted, and add bounded body/config/report/work budgets plus downstream timeouts/cancellation. Avoid an unbounded global queue as the security boundary; shared limits must work across processes/serverless instances. Verify quota enforcement with isolated/disposable fixtures and confirm it cannot be bypassed by direct calls or parallel instances. Independently verify strict backend auth/reset/AI quotas; do not rely on a client loading flag or the browser fetch queue.

### [VULN-11] (#22 Framework path traversal; #37 Known vulnerable dependencies; #38 Missing security updates)

**Severity:** Critical (maintainer-advisory severity; exploitation was not attempted).

**Workflow Context:** Next.js web server/runtime and its image-processing dependency surface; the audited local runtime uses Windows.

**Location:** ecopin-web/package.json:29 (next ^16.3.0); ecopin-web/package-lock.json:5903 (next 16.3.0), :6835 (sharp 0.35.3); installed runtime and .next/required-server-files.json configuration. Additional lock locations and reachability notes are in the Phase 5 dependency table.

**Proof of Concept / Evidence:** A successful current npm registry audit flags the resolved Next.js 16.3.0 package as Critical. The Next.js maintainer's GHSA-p293-qw3h-jr36 / CVE-2026-75604 covers Windows-hosted App/Pages Router applications without Cache Components in versions >=16.0.0 <16.3.3; it recommends immediate upgrade and states no known workaround for affected Windows hosting. The actual audit host is win32, the app uses App Router and the production manifest has cacheComponents=false, matching those conditions. GHSA-2xp9-vwfh-vxw4 also flags AVIF image optimizer RCE for Next <16.3.3; input AVIF reachability was not tested. The next/og RCE advisory is in the version audit but no ImageResponse use was found. The image-optimizer SSRF advisory is also in the version audit, but its remotePatterns prerequisite is absent in the sampled manifest, so it is not asserted as an exploitable app SSRF. Other cache/dev-server advisories depend on features/hosting. npm outdated confirms Next wanted/latest 16.4.2 versus current 16.3.0. This finding aggregates confirmed affected dependency presence and missing security updates; not every audit entry is independently reachable remotely. No code execution, malicious image, cache poisoning or internal network request was attempted.

**Recommended Fix:** Prioritize a reviewed Next.js update to a supported patched version that covers all applicable current advisories, not just the earliest individual 16.3.3 fix. Update the matching tooling and native image dependencies deliberately, review the resolved lockfile, and run the web tests/build/runtime checks before redeployment. Check the final deployed artifact/version and registry audit. Do not apply npm audit fix --force: the audit proposes a major eslint-config-next downgrade for part of the tooling chain, which is not a safe Next.js remediation plan. Keep public deployment of an affected Windows runtime blocked until patched and verified; no remediation was applied during this audit.

**Primary references:** [Next.js Windows RCE advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), [AVIF optimizer RCE](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), [image optimizer SSRF](https://github.com/vercel/next.js/security/advisories/GHSA-cjq9-62q9-8jv4).

### [VULN-07] (#46 Missing security headers)

**Severity:** Medium.

**Workflow Context:** Public pages, staff sign-in, and other responses served directly by the web runtime.

**Location:** ecopin-web/next.config.mjs:1–8; local production responses for /, /auth, /explore, /test-session, /experiments/yt-maps-landing, /debug and /api/test.

**Proof of Concept / Evidence:** All seven sampled Next.js responses lacked CSP, X-Frame-Options, X-Content-Type-Options and Referrer-Policy. No web header configuration/middleware was found. HSTS was also absent, although the HTTP loopback environment cannot establish a hosted HTTPS/HSTS defect. In contrast the configured backend supplies these headers, but those API responses do not protect separately served web documents. The finding is missing web-layer defenses in the tested production runtime, not proof that a real hosted proxy omits headers or that clickjacking/XSS was performed against a real session. VULN-06 already establishes a separate unsafe rendering sink.

**Recommended Fix:** Set an explicit web-response header policy through Next.js or the actual deployment proxy: nosniff, a suitable Referrer-Policy, and CSP with frame-ancestors/object-src/base-uri plus narrowly scoped script/connect/img/style rules. Use a compatible X-Frame-Options fallback if needed; enable HSTS at the real HTTPS host after checking subdomain coverage. Account for the current inline theme script, map tiles/media/blob images and API connections rather than adding a blanket allow-all CSP. Verify headers on success/error/static responses at the hosted URL; do not rely on the backend API's Helmet policy to protect web pages.

### [VULN-08] (#10 Debug page exposed in production)

**Severity:** Low.

**Workflow Context:** Unauthenticated access to an operational session diagnostic screen.

**Location:** ecopin-web/app/test-session/page.js:6–56, :58–121, :123–129; ecopin-web/components/auth/SessionProvider.js public-route handling around :80–86 (snapshot may shift with concurrent UI imports).

**Proof of Concept / Evidence:** GET /test-session on the existing production build returned 200 and rendered the session-test heading/controls in the HTML. The source exports the diagnostic page unconditionally and has no environment/role gate. Its controls examine or modify the current browser's own activity state and call session validation; no other user's token, server session mutation or privilege escalation is established. /experiments/yt-maps-landing is also served, but a public UI prototype by itself is not scored as a sensitive debug leak. This is a low-severity production diagnostic exposure, not evidence of an internal admin dashboard compromise.

**Recommended Fix:** Exclude the test page from production routes, or enforce an explicit server-side diagnostic policy that returns 404/403 in normal production access. Keep session test controls in automated tests or a dedicated protected development environment. Verify the deployed route is unavailable and the regular sign-in/session workflows still work.

### [VULN-06] (#19 Cross-Site Scripting; #50 Unchecked generated/service-output rendering)

**Severity:** Medium.

**Workflow Context:** Staff spatial forecast/cluster map, including historical forecast rendering.

**Location:** ecopin-web/components/map/HotspotForecastMap.js:183–187, :218–256; label marker rank also interpolated at :84–100. Historical record properties are forwarded at ecopin-web/app/dashboard/spatial-scan/page.js:117–150.

**Proof of Concept / Evidence:** The map accepts predictions.geojson without field validation. Its popup interpolates top_issue_type, issue_breakdown names/counts, rank, risk_level and report_count into an HTML string passed to layer.bindPopup. React escaping does not apply to this string. In a fresh isolated browser using the actual installed Leaflet popup and the source callback, the harmless synthetic value `<img src="audit-invalid" onerror="window.auditXss=1">` executed its event handler when supplied separately as top_issue_type, a breakdown count or rank. Network was blocked and no app token, real report or persistent forecast was involved. A stored/citizen-origin exploit is not established: the service-side type constraints and who can influence forecast properties have not been verified. The confirmed defect is the rendering sink accepting executable markup if such a response field reaches it.

**Recommended Fix:** Build popup content as DOM nodes with textContent or render React content into a node, rather than interpolating response strings into HTML. Validate the forecast response contract: bounded feature counts, finite coordinates/scores/ranks/counts, allowlisted risk/issue enums and bounded plain-text fields. Treat historical JSON and generated/model output as untrusted too. Replace or encode every dynamic value in string-based Leaflet icons/popups; normal React report text is already escaped. Add an isolated browser regression asserting HTML-shaped response strings remain literal text and never produce executable elements. CSP can reduce impact but is not a substitute for safe rendering.

**Reference:** [Leaflet popup API](https://leafletjs.com/reference.html#layer-bindpopup) treats string content as HTML; [OWASP XSS prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) recommends safe text sinks and context-appropriate encoding.

### [VULN-05] (#16 Missing input validation)

**Severity:** Medium.

**Workflow Context:** Officer/LGU route-generation preview API; currently also reachable without authentication as recorded in VULN-01.

**Location:** ecopin-web/app/api/tasks/auto-generate/preview/route.js:136–139, :144–173, :184–191, :235–242.

**Proof of Concept / Evidence:** The handler destructures arbitrary req.json() and uses Number() on configuration values without requiring an object, finite numbers or domain ranges. In an isolated execution of the current handler, {"config":{"aging_factor":"not-a-number"}} reached the database and solver, returned 200 and a task with primary_priority:null; NaN became null in the solver request JSON. Negative detour limits and config:[] were also accepted. config:null caused an internal 500 after database reads; null body and malformed JSON also returned 500 instead of a controlled client-validation error. All database/solver dependencies used synthetic fixtures; no real data was modified. The preview does not persist assignments, so this confirms malformed computation/results and unnecessary downstream work, not production task corruption or a load-test finding.

**Recommended Fix:** After authoritative authentication/role verification, require the intended Content-Type and bounded request body, parse JSON with a controlled 400 response, and validate a strict object schema before any reads or solver calls. Require config to be an object with explicitly allowed keys and finite numeric values, using documented nonnegative upper/lower domain bounds for aging/escalation/detour settings; do not silently coerce arbitrary strings/arrays. Return 400/422 with safe field errors. Validate coordinates and solver-result types/ranges as separate trust boundaries. Add regression cases proving malformed bodies cause zero database/solver calls and valid settings produce finite priorities. Rate/work caps are still Phase 5 checks.

### [VULN-03] (#7 Open database read permissions; #41 Excessive app database permissions)

**Severity:** High.

**Workflow Context:** Any unauthenticated web visitor can bypass the map's safe projection and query the legacy report view with the browser's public database key.

**Location:** Runtime Data API relation public.reports_view (policy/view definition is outside the inspected web source); ecopin-web/tests/reports-access.test.mjs:30–35 defines the intended denial; ecopin-web/lib/supabase.js:4–5, :23 initializes the public client; ecopin-web/lib/api/public-report-page.mjs:1–6 defines the separate public projection. ecopin-web/docs/supabase-public-map-repair.md:25–29 already warns that base privileges/legacy privacy are not certified.

**Proof of Concept / Evidence:** Use the browser anon client to request from('reports_view').select('*').limit(1), or GET /rest/v1/reports_view?select=*&limit=1 with only the app's anon API credential. The existing live test expects error.code=42501 but failed at assert.ok(error) because error was null. An independent HTTPS REST request returned 200 and one report row, including a populated user_id. Returned columns additionally include notes, before_photo_url, after_photo_url, satisfaction_rating, ML scores/probabilities and photo-geolocation/source metadata. Separate limit=1, field-not-null reads confirmed populated notes and before_photo_url, not just column names. Values beyond the field names/population classification were not retained. The safe public_reports view excludes these columns, but hiding them in the UI or choosing a safer client projection does not prevent a direct Data API query. A control query to the base reports relation was denied with 401/42501. The app does use its anon key rather than a service-role key; the anon role nevertheless has excessive effective read permissions, so #41 fails on grants/access, not key type. The exact granting policy and unrestricted writes are not established.

**Recommended Fix:** In the shared database's managed migration workflow, revoke anonymous access to the legacy/private report view and explicitly allow only the intended public projection. Review view owner, security_invoker behavior, underlying table/column grants and all RLS policies together; a base-table deny alone does not protect a privileged view. Restrict authenticated detail access by verified identity, role and LGU policy. Keep the existing denial regression enabled and add assertions that anonymous callers cannot retrieve reporter identity, internal notes, evidence references or raw capture metadata through any alternate report view. Verify allowed public map queries still work. No database policy was changed during this audit.

**Reference:** [Supabase views and RLS](https://supabase.com/docs/guides/database/postgres/row-level-security#views) explains why views require separate privilege review; [column-level privileges](https://supabase.com/docs/guides/database/postgres/column-level-security) distinguish field permissions from row policies.

### [VULN-04] (#8 Misconfigured storage buckets)

**Severity:** Medium.

**Workflow Context:** Public report browsing → legacy evidence reference → direct evidence retrieval, bypassing staff/private-media access checks.

**Location:** Runtime Supabase bucket Report Evidence (bucket policy configuration is not stored in the inspected web workspace); ecopin-web/lib/api/private-media.mjs:10–21, :24–31; ecopin-web/components/ui/SecureImage.js:12–13, :41–45; evidence discovery path public.reports_view (VULN-03).

**Proof of Concept / Evidence:** The web resolver explicitly treats Report Evidence, Cleanup Task Photos and Report Cleanup as private references and routes them through authenticated /api/media/storage. The backend correctly returned 401 for a known Report Evidence object with no bearer and with an invalid bearer. However, HEAD https://<configured-project>/storage/v1/object/public/Report%20Evidence/<known-path> without API key, bearer, cookie or signed token returned HTTP 200 with Content-Type image/jpeg. The path was obtained through the anonymous legacy-view read and used only in memory. Therefore the origin publicly serves an evidence object that the web path treats as private; a backend-only guard does not secure it. Anonymous read-only listing returned one root entry from each of the three named buckets, exposing namespace metadata as well; direct public content retrieval is confirmed only for the sampled Report Evidence object. A bounded private-property/non-null-photo query returned no row. Public reports can intentionally publish evidence, so private-property photo disclosure is not established and the severity is limited to the verified origin/gateway classification mismatch. If these images are deliberately public, explicitly classify them as such and align delivery paths; do not imply that this authenticated gateway protects their bytes. No photo bytes were downloaded, no overwrite/delete/upload was attempted, and authenticated ownership rules remain unverified.

**Recommended Fix:** Make sensitive evidence buckets private at the storage origin and apply operation-specific storage.objects policies for authorized roles/owners/assignments/LGU scope. Ensure anon cannot list private namespace metadata or retrieve the underlying files. Keep the authenticated media gateway enforcing the same record/assignment policy; issue short-lived signed URLs only after authorization if that delivery model is needed. Separate deliberately public, consent-approved/redacted images into a distinct public projection/bucket rather than exposing the staff evidence source. Revoke anonymous legacy-view references (VULN-03), review previously shared URLs and storage/CDN caches, and verify known-existing private objects fail through public/authenticated direct routes without authorized credentials. Test upload/upsert/delete permissions with disposable fixtures before rollout; do not change a shared bucket blindly without checking web consumers.

**Reference:** [Supabase storage access controls](https://supabase.com/docs/guides/storage/security/access-control) and [private/public delivery](https://supabase.com/docs/guides/storage/serving/downloads) explain that origin bucket access must match the intended media policy.

### [VULN-02] (#25 Weak session management)

**Severity:** Medium.

**Workflow Context:** Officer/admin sign-in, persistent browser sessions and forced initial password change.

**Location:** ecopin-web/lib/auth-token.mjs:2–6; ecopin-web/app/auth/page.js:39–49; ecopin-web/lib/api/auth.js:54–60, :94–115; ecopin-web/lib/supabase.js:7–20.

**Proof of Concept / Evidence:** Access tokens are persisted in localStorage.authToken, temporary password-change credentials in tempAuthToken, and the refresh helper uses localStorage.refreshToken. These values are readable by any JavaScript executing on the same origin and survive tab closure. The isolated current-source sign-in test confirmed the active handler writes authToken through updateAuthToken. A same-origin script compromise could read/replay the persistent bearer token; no XSS injection or real credential extraction was attempted or established here. Supabase client persistence is separately enabled; this does not establish a second active authenticated Supabase session. Local storage is not exposed to arbitrary cross-origin sites by default. The finding concerns persistent credentials accessible to same-origin scripts, not a claim that JWT payload decoding grants server privileges.

**Recommended Fix:** For the staff web app, use a server-managed session/BFF boundary so access and refresh credentials stay server-side and the browser receives an appropriately scoped HttpOnly, Secure, SameSite cookie with a bounded lifetime. Add CSRF/origin checks when introducing cookie-authenticated mutations and continue authorizing every data/action request server-side. If a browser-held bearer architecture is retained, avoid persistent storage for long-lived refresh/temporary credentials, document the residual same-origin script risk, and enforce short lifetimes, rotation and revocation at the actual authority. Clear all session credential variants on sign-out/expiry. Do not treat changing storage alone as an authorization fix.

**Reference:** [OWASP HTML5 storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage) advises keeping session identifiers out of localStorage because JavaScript can read them. [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication) covers server-side session and authorization boundaries.

### [VULN-01] (#4 Missing authentication; #5 Missing authorization; #15 Client-side-only security checks; #40 Unauthorized automated data access)

**Severity:** Medium.

**Workflow Context:** Officer / LGU dispatcher auto-generated cleanup route preview.

**Location:** ecopin-web/app/api/tasks/auto-generate/preview/route.js:136–148, :159–173, :217–239; UI caller ecopin-web/app/dashboard/officer/operations/create/page.js:194–199, :272; client guard ecopin-web/components/auth/RequireRole.js:12–24.

**Proof of Concept / Evidence:** The screen is wrapped in OfficerGuard, but its POST handler accepts a JSON body and immediately reads optimization_settings and all paginated public_reports through the anonymous Supabase client. It never reads/verifies a session, token, role or tenant. It sends report-derived IDs/coordinates to localhost:8000/generate_tasks or computes locally, then returns the task plan. A direct POST /api/tasks/auto-generate/preview with Content-Type: application/json and body {"config":{}} bypasses the screen gate. In the isolated current-source reproduction, both no Authorization header and Authorization: Bearer audit-invalid-token returned 200 and one synthetic task; both reached database-read and solver stages. A subsequent actual unauthenticated request against the existing local production build returned 200 and seven route plans. Public-host reachability and disclosure of private records are not established. The endpoint does not persist task assignments; this is unauthorized preview computation, not proof of an assignment mutation, service-role bypass or exposure of otherwise-private report rows.

**Recommended Fix:** Verify the request's real session on the server before JSON parsing, data access or solver calls; return 401 for absent/invalid credentials and 403 for roles outside the explicit dispatcher policy. Scope report/settings reads to the permitted LGU/tenant using a session-scoped database client or an authorized backend service. Update the UI caller to supply the verified-session credential (it currently sends only Content-Type). Keep OfficerGuard as a UI convenience. Add handler regressions proving unauthenticated/invalid-token/wrong-role requests cause no database or solver calls and that an allowed officer succeeds. Rate/size/computation limits are deferred to Phase 5 #28.

No confirmed exploitable Phase 1 vulnerabilities were found. Phase 2 findings are listed above; this is not a security sign-off. The unsafe environment configuration below also requires follow-up.

### Configuration risk under verification — #14

**ID & Checklist Number:** [CONFIG-01] (#14 Secrets included in frontend JavaScript).

**Severity:** Info — unsafe configuration; actual exposure and credential validity unverified. Not counted as a confirmed vulnerability.

**Workflow Context:** Public landing/map browser bundle and web deployment environment.

**Location:** ecopin-web/.env:7; public client construction at lib/supabase.js:4–5 and :23.

**Proof of Concept / Evidence:** The ignored local .env defines NEXT_PUBLIC_SERVICE_ROLE_KEY. Its JWT payload decodes to role service_role (payload inspection only, no signature verification or service request). This is an inappropriate public namespace for a privileged credential. No source reference was found; the exact value appeared in zero of 115 .next/static files, zero non-env source/config files and zero matching local history commits. A NEXT_PUBLIC_ name alone does not prove Next.js bundled an unused variable. Do not reproduce or test the credential against a live project during this audit.

**Recommended Fix:** Remove the unused credential from the web environment. If a privileged web server client is actually required, use a server-only variable such as SUPABASE_SERVICE_ROLE_KEY, isolate its module from client imports, and enforce authentication and authorization before every privileged operation. Inspect deployment environments, old bundles and logs; rotate/revoke the key if exposure is established. Keep the browser client on its public anonymous/publishable key. No application or environment changes were made by this audit.

## Inventory and Next-Phase Handoff

### Phase 2 functional findings and validation notes

#### [FUNC-01] (#25) Active sign-in loses the refresh token

**Severity:** Medium (functional; excluded from security finding counters).

**Workflow Context:** Officer/admin sign-in → continued dashboard use near access-token expiry.

**Location:** ecopin-web/app/auth/page.js:26–50; ecopin-web/lib/api/auth.js:54–60, :94–105; ecopin-web/components/auth/SessionProvider.js:141–154.

**Proof of Concept / Evidence:** The active form performs its own fetch and stores access token/activity only. The separate login helper persists a returned session.refresh_token, but no app call site for that helper was found. In the isolated current-source reproduction, a successful officer response containing token plus session.refresh_token resulted in stored keys [lastActivity,authToken] and no refreshToken. The helper stored refreshToken for the same fixture. refreshAuthToken returns null without that key, so a fresh login through the real form cannot use the implemented refresh path even when the service supplies a refresh credential. A preexisting refreshToken is also not replaced/cleared by this form; cross-account behavior needs an integration test and is not asserted as an exploit.

**Recommended Fix:** Consolidate response/session handling into one helper shared by the form and refresh flow. Preserve forced-password-change and staff-role restrictions. Store/rotate the complete intended session consistently with the chosen secure-session architecture; clear stale credentials on each sign-in transition. Verify sign-in → near-expiry refresh → subsequent request maintains the same user identity, plus logout → different-user sign-in.

#### [FUNC-02] (#9, #15) Staff role restrictions are inconsistent across entry points

**Severity:** Low (functional UI access-control gap; excluded from security finding counters).

**Workflow Context:** Direct navigation to administrator user management from officer/citizen/field-crew session contexts.

**Location:** ecopin-web/app/auth/page.js:45–47; ecopin-web/app/dashboard/layout.js:40–58, :69–114; ecopin-web/app/dashboard/admin/users/page.js:48–64, :315–324.

**Proof of Concept / Evidence:** Sign-in explicitly rejects citizen and field_crew roles. The shared dashboard redirects field crews but allows a returned citizen role through, and it lacks a general admin-route role gate. UserManagement has no AdminGuard and starts its settings/user queries from effects. Fresh synthetic officer and citizen /me responses rendered the admin users screen and initiated admin API reads; a synthetic field crew initiated users/settings reads before redirecting to /auth. Mocks returned 403 to those requests, while real unauthenticated/invalid-token backend admin probes returned 401. No real low-role record access or role mutation is established.

**Recommended Fix:** Centralize web-eligible-role and per-route UI policy; gate mounting of admin page content/data loaders on the authorized role and avoid setting an accepted user state before rejecting the role. Keep authoritative server-side permission checks for every read and mutation. Add browser coverage for direct URLs, client navigation and role changes. Adding a UI guard alone is not remediation for backend authorization failures.

#### [QA-01] (#25) Network failures are reported as successful session validation

**Severity:** Info (confirmed helper behavior; no server-side bypass established).

**Workflow Context:** Dashboard visibility resume and the exported validateSessionWithServer helper.

**Location:** ecopin-web/lib/api/auth.js:29–33; ecopin-web/components/auth/SessionProvider.js:34–52, :220–237.

**Proof of Concept / Evidence:** A synthetic thrown fetch error returned {valid:true} from the actual validateSession source. validateSessionWithServer also returns true in its catch. Current production call sites use this for UI session continuity, and no critical mutation was found gated authoritatively by its result; the only direct UI caller located was the diagnostic session page. This is not evidence that a backend accepts an expired/revoked token.

**Recommended Fix:** Represent network failure as an explicit unknown/unavailable state rather than verified success. Block privileged operations until verification succeeds, show a retryable connectivity message and keep backend validation authoritative.

#### [QA-02] (#24, #25) Forced password-change token lifecycle needs service-contract verification

**Severity:** Info (manual integration check).

**Workflow Context:** Temporary password sign-in → forced password change → dashboard session.

**Location:** ecopin-web/app/auth/page.js:39–43; ecopin-web/lib/api/auth.js:126–149; ecopin-web/app/force-change-password/page.js:87–97.

**Proof of Concept / Evidence:** The form ignores the forceChangePassword response and reuses tempAuthToken as the normal authToken. That may fail if the service issues a new session or revokes the temporary credential. Conversely, temporary-token restriction/expiry cannot be established from the client. No password was changed and no temporary token was tried against protected endpoints.

**Recommended Fix:** Define the server contract explicitly: temporary credentials only authorize password change, have a short TTL, cannot access normal data, and are consumed/revoked on success. The service should return the intended post-change session or require fresh sign-in; the client must follow that contract instead of promoting an old credential by assumption.

### Phase 2 endpoint and role inventory

| Web request | Implemented client path / credential |
| --- | --- |
| POST /api/auth/login | Active auth/page.js form; email/password only |
| GET /api/auth/me | Dashboard layout and public-account helper; bearer |
| GET /api/auth/validate-session | Session helper; bearer |
| POST /api/auth/refresh-token | Refresh helper; JSON refresh_token |
| POST /api/auth/logout | Profile → logout helper; bearer |
| POST /api/auth/force-change-password | Forced-change page → helper; temporary bearer plus new_password |
| POST /api/tasks/auto-generate/preview | Officer task-creation screen; currently Content-Type only |

34 dashboard page modules and one shared client auth layout were inventoried. The additional officer/optimization layout is not a server auth boundary. Eight field-crew and eleven officer pages use corresponding client guards; three admin pages use AdminGuard (audit logs, sweeper settings, system logs). Remaining admin pages, both optimization pages, shared pages and dashboard root lack page-level role guards. Spatial scan has a RequireRole wrapper. No 'use server' declaration was found in the scoped app/lib/components search. Guard coverage describes UI behavior only.

### Manual Phase 2 verification queue

Use disposable authorized test fixtures and retain only redacted results. These checks were not executed with real logged-in accounts:

| Check | Expected result / evidence to retain |
| --- | --- |
| Citizen/officer/field-crew GET admin users/stats/settings/audit/system logs | Reject disallowed roles server-side, without protected records; capture status and field names only |
| Non-admin POST admin/users, PATCH users/{id}/role or /password, DELETE users/{id} | Reject before mutation, including self-role escalation and arbitrary target IDs; use disposable accounts |
| User A requests User B's report/detail/evidence and batch-evidence IDs | Reject or return only explicitly public fields; verify no contact/private media or signed URL leakage |
| User A modifies User B's report status/validation/details or crew assignment | Reject outside role/ownership/LGU policy before mutation; use disposable reports/tasks |
| Tenant A session references tenant B report/crew/settings | Reject or restrict according to a written geographic/tenant policy; verify direct API/RPC as well as UI |
| Real sign-in → access-token expiry → refresh | Same user/role/tenant remains; rotated refresh token replaces old one; reuse is rejected according to authority's policy |
| Sign-out followed by old refresh/access-token replay | Refresh credential revoked and access-token behavior matches documented expiry/revocation guarantees; client storage deletion alone is insufficient evidence |
| Temporary password-change token on normal/admin endpoints | Reject; expiry/reuse enforced; consume old temporary token on successful change |
| Successful sign-in behind actual proxy/host | Inspect any Set-Cookie flags, scope and lifetime; confirm transport HTTPS and no private token in client logs |
| Actual JWT signing configuration | Strong unique key or verified asymmetric issuer; algorithm allowlist, signature, issuer, audience and expiry checked by authority |

Supabase documents that access JWTs can remain valid until their expiry after sign-out: [sign-out lifecycle](https://supabase.com/docs/guides/auth/signout). Verify the actual web backend contract rather than assuming immediate access-token revocation.

### Phase 3 source inventory and remaining permission checks

Runtime Supabase targets under web source: public_reports, clusters, optimization_settings; EcoPinMap.js:304–315 also subscribes to public.reports changes. No web RPC invocation or direct storage upload/delete/signed-URL creation was found. reports_view is named in the web denial regression test, and that deny boundary is reachable with the same public client credential even though current public screens choose another view. The web workspace contains no SQL policy/migration definition establishing its deployed database or bucket grants. No other service's implementation was inspected.

Photo/avatar uploads and deletes are routed through authenticated backend calls rather than direct browser Storage writes: report POST/DELETE /api/reports/{id}/photo, cleanup task POST /api/cleanup-tasks/{id}/photo, and profile POST/DELETE /profile/avatar. The existing client-side file checks do not certify server MIME/size/content validation; these checks belong to Phase 4 #21. Web citizen submission/history is not implemented as a citizen workspace in the inspected sign-in flow, as recorded in Phase 2.

Public evidence is intentionally requested for exact-location public reports in LandingMap.js:65–67 and PublicMap.js:1000–1008; approximate/private-property public projections skip that request. Public-image intent must be separated from staff-only cleanup/private-property originals when reviewing VULN-04. Do not assume every public report image is confidential.

#### [QA-03] (#6, #8) Batch evidence cache does not include session identity

**Severity:** Info pending real role-dependent evidence contract verification; not counted as a confirmed cross-user data leak.

**Workflow Context:** Evidence gallery/map within a single browser tab across sign-out or account changes.

**Location:** ecopin-web/lib/api/reports.js:205–216, :220–239, :253–260; consumers include components/ui/EvidenceGallery.js:35 and components/map/useMapPhotoEvidence.js:16.

**Proof of Concept / Evidence:** The module-level map is keyed only by report ID, has no TTL or auth-change invalidation, and returns complete cached results before reading the current token. Source search found no cache-clearing path. An isolated current-source synthetic test warmed one report as user A, switched to user B, then removed the session; both later calls returned the same synthetic A response with only one stubbed fetch total and zero network requests. This establishes identity-independent caching behavior. It does not establish that the real batch endpoint returns different/private fields for staff versus public callers; current public-map consumers intentionally fetch public evidence. Actual private-response reuse therefore remains a manual integration question rather than an asserted account bypass.

**Recommended Fix:** If the endpoint's response varies by identity/role/assignment, key cached data by the verified session scope and clear it on auth change/expiry; never fall back to another principal's entries. Prefer a clearly separated, safe public-evidence contract for public map caches. Test staff → sign-out → public map and staff A → staff B in the same tab with disposable evidence fixtures.

| Manual Phase 3 check | Expected evidence / limit |
| --- | --- |
| Inspect reports_view definition/owner/options, anon/authenticated grants and underlying RLS | Establish which actual view/grant path allowed anonymous identity and notes; revoke only unintended exposure while retaining explicit safe public projection |
| INSERT/UPDATE/DELETE on report/cluster/settings data | Denied for anon and disallowed roles, with ownership/LGU checks on allowed mutations; use rollback-backed or disposable fixtures, not production record edits |
| Review storage bucket public flags and storage.objects policies | Explicit public/private classification; anon cannot list private namespaces or retrieve private objects; test each known-existing bucket/object with appropriate roles |
| Upload/upsert/overwrite/delete another user's evidence | Denied before storage/database mutation; disposable objects only; verify assignment and LGU isolation and path ownership |
| Known existing private-property/cleanup originals via public URLs | Denied without valid authorization; Phase 3 found no private-property row with a non-null before_photo_url in its bounded query |
| Public versus staff /api/reports/{id}/evidence and batch-evidence | Public gets only approved public/consented fields; staff gets authorized detail only; no raw private/signed links outside policy |
| Evidence link lifetime and origin bypass | Signed links expire as configured; authenticated gateway does not coexist with public access to the same confidential originals |
| Database/storage encryption at rest and key controls | Project/platform evidence of encryption and key management; JSON/plaintext returned by an authorized query is not evidence that disks are unencrypted |
| Hosted web/backend transport | HTTPS and appropriate enforcement at actual host/proxy; local HTTP loopback alone is not a deployment defect |

Phase 3 test results remain intentionally unchanged: private-media unit tests 4/4 pass; live reports-access tests 2/3 pass and 1 security-denial assertion fails. No assertion was weakened, skipped or removed. Bounded runtime tests verify anonymous read/list/object delivery only; no write-policy certification is implied. No image payload, reporter identifier, note, object path, signed token, service-role credential or response record was written into the audit log. No application/database/storage configuration was modified. Next phase: input validation, injection and file handling (#16–#23).

### Phase 4 functional findings and manual test queue

#### [FUNC-03] (#16, #17 review context) Literal search punctuation breaks the PostgREST filter

**Severity:** Low (functional; excluded from security severity counters).

**Workflow Context:** Any web consumer using the shared filtered-report search helper.

**Location:** ecopin-web/lib/api/reports.js:300–310, :327–331 (line numbers from the Phase 4 source snapshot; this file also has concurrent user edits).

**Proof of Concept / Evidence:** filters.search is lowercased and interpolated into the raw title.ilike/description.ilike OR string with no grammar-aware quoting. A search containing an ordinary comma, audit,query, reproduced HTTP 400/PGRST100 with the same OR expression against public_reports. The verification request selected only id with limit=1 and logged no record. The helper's error path returns [], potentially presenting the failure as no matches. Metacharacters can affect raw filter syntax, but no SQL execution, private-data access or authorization escape was demonstrated. Current primary screens may also filter loaded data locally; the source scan does not establish a currently mounted caller for every shared helper export.

**Recommended Fix:** Treat search as bounded literal text and build correctly quoted/escaped PostgREST operands according to its grammar, or use an explicit parameterized search contract/full-text search column. Preserve intended SQL wildcard semantics deliberately instead of interpolating arbitrary grammar. URL-encoding the final query alone is insufficient because the server decodes it before parsing. Keep RLS/column permissions authoritative and surface parse/service errors separately from an empty result. Add comma, quote, parenthesis, percent, underscore and Unicode search cases before wiring this helper into additional screens.

**Reference:** [Supabase .or() documentation](https://supabase.com/docs/reference/javascript/or) identifies its argument as raw PostgREST filter syntax.

| Manual Phase 4 check | Expected evidence / scope |
| --- | --- |
| Authenticated report/task/profile upload with spoofed image MIME, mismatched signature or HTML/SVG filename | Reject by server-side content policy before persistence; use disposable fixtures and inspect no executable content delivery |
| Zero-byte, oversized, huge-dimension/decompression-heavy and invalid image files | Bounded parsing, request limits and safe 4xx responses; do not run resource-exhaustion payloads against live production |
| Filename/path and photo_type tampering | Generated/scoped storage keys; reject traversal, encoded separators, invalid kind and another owner's report/task path before mutation |
| Forecast JSON and historical issue_breakdown input contract | Establish who can write each HTML-interpolated field; ensure enums/finite numbers and plain-text rendering of hostile markup at every string-based popup/icon sink |
| Authenticated cross-origin mutation | With disposable test records, determine whether any ambient-cookie auth is accepted and whether Origin/CSRF protection rejects cross-site state changes; explicit bearer-only design should not be mislabeled as cookie CSRF |
| Backend SQL/spatial filters and any document query | Review parameterization and accepted filter shape within the web-facing endpoint contract; no backend implementation audit was performed in this phase |
| Media gateway/export/upload path mapping | Authorize the canonical object/record and constrain any filesystem resolution to an owned allowlisted root; client-side path syntax validation alone is insufficient |

Phase 5 handoff: the preview returns raw errors for malformed/null input and does work without schema/auth gating; assess generic client errors, rate/work limits and headers there. The raw-data upload screen logs a partial access-token prefix (app/dashboard/(shared)/raw-data/[id]/page.js:294); assess logging separately under Phase 7 #35 rather than scoring it prematurely. No new production exploit was claimed from a UI-only file check.

Phase 4 verification used 14 passing existing tests, isolated current-source preview/resolver probes, isolated Leaflet browser execution with all requests blocked, and one bounded read-only PostgREST grammar check. Browser contexts were closed. No runtime test script, app code, package/dependency file, database policy, stored report, uploaded object or server configuration was changed by this audit. Only this Markdown log was edited; no graph rebuild is needed for application code because none was modified. Existing user edits continued independently; earlier phase evidence remains dated to its recorded snapshot and is not implicitly re-certified against all later changes.

### Phase 5 dependency evidence and operational follow-up

Installation boundary: ecopin-web owns package.json and npm package-lock.json v3, with matching root metadata and all 27 direct dependency requirements. The lock has 543 entries including the root; npm audit reports 542 dependencies. npm ls resolves all direct installed dependencies. No independent competing manager/CI workflow was found in this web workspace. Package.json was already dirty user work, while the lockfile was unchanged; neither was edited by this audit.

The sandbox offline-zero audit is superseded by the successful current online registry audit. Full tree: 12 affected package entries (1 Critical, 10 High, 1 Moderate). omit=dev: 5 entries (1 Critical, 3 High, 1 Moderate). These counts include transitive/meta-vulnerable packages and should not be summed as independent application exploits. Parent-side approved registry queries were needed because the sub-agent's sandbox was offline. No forced remediation or install scripts were executed.

| Package / resolved version | Lockfile location | Audit severity / path | Reachability qualification |
| --- | --- | --- | --- |
| next 16.3.0 | package-lock.json:5903 | Critical; direct production dependency | Windows/App Router/cacheComponents=false matches GHSA-p293-qw3h-jr36; no exploit attempted. Other feature-specific advisories require separate prerequisites. |
| sharp 0.35.3 | :6835 | High; optional Next image dependency | Native image decoding; maintainer patch >=0.35.5 covers librsvg issue. That advisory's RCE conditions concern glibc Linux, not this Windows host; actual hosted binary/input paths need checking. AVIF/libheif issue is separately referenced by Next. |
| nanoid 3.3.17 | :5862 | High; production tree | Custom generator zero-size loop advisory GHSA-2v37-7h3g-55p8; patched range starts 3.3.18. No web caller passing attacker-controlled generator size was found. |
| source-map-js 1.2.1 | :6997 | High; PostCSS/Tailwind/Next tree | Indexed source-map offset denial-of-service GHSA-68fv-2mgg-jv7q; fixed 1.2.2. Build/asset-processing context, not demonstrated web request reachability. |
| baseline-browser-mapping 2.10.32 | :2895 | Moderate; Next production tree and dev tools | Invalid-input process termination GHSA-w5vr-8v7q-w6rv; fixed 2.11.0. Actual exposure to untrusted queries not established. |
| browserslist 4.28.2 | :2933 | High; development tree | Query-cache memory/custom-stats advisories GHSA-c83g-rgw3-j3cx and GHSA-73wf-gq98-2v4g; registry audit flags <=4.28.6. No normal web data input path established. |
| brace-expansion 5.0.9 and nested 1.1.18 | :2907, :3844 | High; development/ESLint dependencies | Nested-pattern stack/CPU advisories GHSA-qhr7-859c-m2p7, GHSA-6j4f-fj2g-mc7p and GHSA-q2hr-2g5m-vwhr. Fix selection must match each major; other lock copies at 1.1.21 are distinct from affected old copies. |
| braces 3.0.3 → micromatch 4.0.8 → fast-glob 3.3.1 → @next/eslint-plugin-next 16.3.0 → eslint-config-next 16.3.0 | :2920, :5815, :4257, :1235, :3810 | High; five affected/meta-vulnerable development entries | Brace stack-exhaustion GHSA-vfj7-8cjw-p6xm propagates through the lint chain. npm proposes a major downgrade for this chain; do not apply it automatically. Review supported tooling releases and overrides with real lint/build tests. |

Primary reachability sources checked: [Windows Next RCE](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36), [AVIF optimizer](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4), [next/og prerequisite](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j), [image SSRF prerequisite](https://github.com/vercel/next.js/security/advisories/GHSA-cjq9-62q9-8jv4), [Sharp librsvg platform conditions](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w). Remaining package advisories above are native npm registry findings; no additional exploit test was run. Source search found next/image imports in five modules, but no next/og/ImageResponse/use cache/draftMode in app/components/lib. The production manifest, not package names alone, supplied the local cache/image configuration checks.

Current npm outdated metadata (2026-10-16; versions can change):

| Direct dependency | Current | Wanted under manifest | Latest registry |
| --- | --- | --- | --- |
| @supabase/supabase-js | 2.112.4 | 2.118.0 | 2.118.0 |
| @tailwindcss/postcss | 4.3.0 | 4.3.3 | 4.3.3 |
| @tanstack/react-query | 5.101.4 | 5.104.3 | 5.104.3 |
| @types/react | 19.2.18 | 19.2.18 | 19.3.0 |
| eslint | 9.39.5 | 9.39.5 | 10.12.0 |
| eslint-config-next | 16.3.0 | 16.3.0 | 16.4.2 |
| jspdf-autotable | 5.0.8 | 5.0.9 | 5.0.9 |
| lenis | 1.3.26 | 1.3.27 | 1.3.27 |
| lucide-react | 1.47.0 | 1.58.0 | 1.58.0 |
| next | 16.3.0 | 16.4.2 | 16.4.2 |
| react | 19.2.8 | 19.2.8 | 19.3.1 |
| react-dom | 19.2.8 | 19.2.8 | 19.3.1 |
| react-router-dom | 7.18.2 | 7.18.4 | 7.18.4 |

Newer is not synonymous with vulnerable, and exact pins may be intentional. #38 fails specifically because the confirmed vulnerable framework remains behind available security updates; the table is an upgrade-review queue, not authorization to bulk upgrade every package. Review Next release notes/current advisories, patch the supported release/tooling combination, then resolve all affected transitive versions and repeat the audit on the final artifact. Suggested npm fixAvailable metadata is not a compatibility guarantee.

#### [QA-04] (#27, #12) Rejected CORS origin returns a server error

**Severity:** Info (operational behavior; stack disclosure is already VULN-09).

**Location:** Runtime configured loopback backend /api/auth/me and /api/auth/login OPTIONS, used by the web client; no backend source inspection.

**Evidence:** Configured frontend Origin gets exact ACAO/credentials=true with normal 401 auth rejection. An untrusted Origin gets 500 without ACAO, so it is not a CORS allow-all finding. The response should be a controlled rejection without an internal stack. Hosted origin allowlists and credentials policies still need final deployment verification.

| Manual Phase 5 follow-up | Expected evidence |
| --- | --- |
| Patch/redeploy framework and native dependency artifacts | Reviewed lockfile, passing targeted/full web checks, successful current audit, final installed/deployed versions; public host OS/config verified |
| Hosted success/error/static headers | CSP/frame/nosniff/referrer policy observed on web documents and errors; HTTPS/HSTS configured at actual host; CSP compatible with intended app assets without broad unsafe allowances |
| Backend auth/reset/signup/AI quotas and edge rules | Server-side 429/Retry-After and shared per-principal/IP enforcement verified with isolated/disposable fixtures; no live brute-force or saturation test |
| Preview admission/work limits | Reject quota exhaustion before reads/solver; finite row/body/work budgets; consistent enforcement across instances |
| Production diagnostics | /test-session unavailable under intended production policy; no real-session test controls deployed by default |
| Production error handling | Generic client body/correlation ID and scrubbed server diagnostics; no stacks returned for malformed inputs, disallowed origins or provider errors |
| Any future incoming webhook | Signature/MAC verification against raw body, replay protection and secret rotation before enabling the handler; no current web webhook was found |

Phase 5 verification: seven local production page/error GETs, one web preflight, configured/untrusted loopback-origin checks, isolated preview error/eight-call probes, 3 passing existing limiter abort tests, npm installation/lock inspection, successful current full/production-only audits and outdated metadata, plus maintainer advisory prerequisite checks. The temporary web server is stopped; the user's existing backend remains running. No package, lock, app code, user record or storage object changed. Only this audit log was edited. Next phase: AI/automated workflows (#39, #40, #50); Phase 7 logging/operations follows afterward.

### Phase 6 automation contracts, functional findings and manual queue

| Web workflow / trigger | Read versus action boundary | Evidence / authorization limit |
| --- | --- | --- |
| Spatial-scan entry/date selection | GET current/monthly predictions, accuracy, available dates and historical predictions | app/dashboard/spatial-scan/page.js:40–43, :66–111; lib/api/hotspot.js:33–119. Bearer from browser session; sampled reads reject missing/invalid credentials. |
| Forecast-generation wrapper | POST /api/spatial-forecast/generate with time_horizon/bounding_box | lib/api/hotspot.js:8–27; no web caller found. Do not infer UI use or generate a live forecast merely to test a wrapper. |
| Legacy officer route-preview button | POST local /api/tasks/auto-generate/preview → fixed structured solver request/native fallback | create/page.js:188–221; route.js:136–239. Missing permission boundary is VULN-01. Preview itself does not persist assignments. |
| Legacy preview confirmation | Separate button/handler loops over proposed tasks and POSTs custom cleanup tasks | create/page.js:233–256; lib/api/cleanupTasks.js:123–140. Stored bearer is attached when present; backend must verify every target/crew rather than relying on this UI confirmation. No real dispatch executed. |
| Generate Route Proposal | POST /api/optimization/plan/generate, then GET job and GET draft plan | lib/api/optimization.js:91–115; components/context/TaskContext.js:21–76. Checks jobId/planId presence, but consumes item/group/capacity shape from service. Draft retrieval is not dispatch. |
| Commit draft / approve saved run | Explicit POST /plan/{id}/commit or /runs/{id}/approve | optimization.js:119–127, :174–180; officer/optimization/page.js:246–307. Mutations were not invoked; actual low-role/tenant/actor checks remain manual. |
| Disassemble / discard | POST /plan/{id}/disassemble or /runs/{id}/discard | optimization.js:187–193, :408–414; TaskContext.js:149–169. These alter workflow state and require server policy, replay/idempotency and audit checks. |
| Image classification | pending_ai_validation status is displayed/filtered; no direct web classifier/model call found | lib/helpers/statusHelpers.js:35 and officer/reports/page.js status filters. Backend processing after photo submission is not inferred from a UI label. |

The forecast/optimization wrappers generally attach a stored bearer and do not pass caller-supplied actor role/user_id fields. Target plan/job/run IDs and selected settings still need server authorization and validation. Unused exported wrappers (generateForecast, prioritizeQueue, runOptimization) are not evidence of a live vulnerable endpoint or hallucinated helper. No disabled/commented authentication marker was found in the scoped AI/forecast/planner files. Code authorship/review history is not claimed by this audit.

#### [FUNC-04] (#50) Preview ignores the public projection's severity/cluster contract

**Severity:** Medium (functional; excluded from security severity counters).

**Workflow Context:** Officer auto-route preview prioritization and cluster-aware routing.

**Location:** ecopin-web/app/api/tasks/auto-generate/preview/route.js:159–163, :181–182, :193–212; ecopin-web/lib/api/public-report-page.mjs:1; client labels at app/dashboard/officer/operations/create/page.js:217, :248–253.

**Proof of Concept / Evidence:** The handler reads public_reports, whose verified public projection supplies severity_score/severity_level and cluster_id, but it tests r.is_cluster and r.severity. Those latter fields are absent from the Phase 3 observed 19-field view and the web projection contract. Current-source synthetic reports with low/high severity_level and different severity_score both became base_severity=1; a report linked by cluster_id remained an individual because is_cluster was absent. This verifies loss of severity distinction and an unreachable intended cluster-input branch for that projection shape. It does not prove an actual wrong dispatch or determine the intended cluster aggregation policy.

**Recommended Fix:** Define and validate the input contract explicitly. Convert severity_level/severity_score through a documented bounded mapping and construct cluster targets from an authorized cluster projection/grouping with real cluster IDs. Do not expand the anonymous public view with private legacy fields just to satisfy stale assumptions. Keep report/cluster ID types distinct through preview and confirmation. Add fixtures that assert high/low ordering and correct cluster-linked behavior against the exact public projection shape.

#### [FUNC-05] (#50) Solver task arrays are accepted without validating their contents

**Severity:** Medium (functional/contract defect; excluded from security severity counters).

**Workflow Context:** External solver result → route preview UI → explicit staff confirmation.

**Location:** ecopin-web/app/api/tasks/auto-generate/preview/route.js:228–239; ecopin-web/app/dashboard/officer/operations/create/page.js:208–221, :248–253, :695–701.

**Proof of Concept / Evidence:** The sole solver-result check is Array.isArray(mlData.tasks); each task's IDs, target type, arrays, finite numbers and relation to the submitted input set are not verified. An isolated synthetic response with primary_target_id outside the input set, included_reports:null and a nonnumeric priority was returned as 200; an unrelated top-level marker was passed through too. The UI subsequently expects included_reports.map, cumulative_detour_minutes.toFixed and string target IDs. The null-array consumer operation throws in the reproduction. No service compromise, cross-user assignment, secret-bearing response or automatic task persistence is established: the real mutation service may reject bad IDs, and dispatch requires a separate staff action. Existing forecast HTML output trust is the separately counted VULN-06.

**Recommended Fix:** Validate the solver response server-side before exposing it: strict allowlisted envelope/fields, bounded task/report counts, unique target IDs from the authorized input set, consistent target kinds, finite ranged scores/coordinates/detours and actual included_reports arrays. Reject malformed results with a generic upstream-contract error rather than returning arbitrary data; use a safe fallback only for explicitly handled failure classes. Validate again before UI rendering, and independently reauthorize/revalidate every report/crew at commit. Add malformed/unknown-ID/duplicate/oversized/nonnumeric fixtures without calling a live solver.

| Manual Phase 6 check | Expected evidence / scope |
| --- | --- |
| Determine actual classifier/forecast model type | Provider/model contract establishes whether prompts/vision text, deterministic features or an LLM are involved; no prompt-injection label based only on AI branding |
| If a prompt-capable downstream model receives report text/image text/metadata | Disposable fixtures test instruction separation; secrets/private cross-user context excluded; model output treated as data and constrained by service policy, never as authorization |
| Citizen/field-crew/officer versus generation/prioritization/commit/approval/disassembly | Valid sessions and disposable jobs prove role/LGU/assignment checks before expensive work or mutation; a UI button/guard is not the service policy |
| User/LGU A requests B's job, draft plan, run or generated report IDs | Reject unauthorized reads and commits; derive actor from verified session and bind result to its authorized input/version |
| Duplicate/stale/replayed commit or approval | Idempotency, optimistic/version checks, atomic assignment and audit evidence; no duplicate dispatch or model-controlled role assignment |
| Sweeper isolated/outlier/SLA selection | Grounded report eligibility, severity, consent and tenant filters; server enforces permissions when automation selects an item and when it is assigned |
| Generated route output contract | Reject invented/out-of-input targets and malformed data before rendering/confirmation; keep deterministic fallback explicit and test against real view field names |
| Background jobs/tool capabilities | Minimal credentials, bounded scope/rate/cost, no service-wide data access simply because a job/AI step runs; verify effective server policy rather than client payload fields |

Phase 6 added no new unique security finding: #40 extends VULN-01 and #50 extends VULN-06. It records two new functional defects and a manual downstream prompt/model-contract check. Verification used three current-source synthetic solver scenarios (field mapping, malformed output, text/identity minimization), 18 read-only missing/invalid-token HTTP probes and 4 passing existing response tests. No browser server restart, model invocation, real generation/commit/approval, data mutation or package change occurred. Only the audit log was edited. Phase 7 remains: sensitive logging, audit trails, monitoring/alerting and backups (#35, #42, #43, #44).

### Phase 1 inventory (retained)

- Public/auth page files include /, /landing, /about, /gallery, /explore, /map, /downloads, /auth and /force-change-password. Web /mobile and /mobile-app pages were inventoried by filename only; the mobile application was not inspected.
- Diagnostic/experimental page files: /test-session and /experiments/yt-maps-landing. Presence is a review lead, not proof of a vulnerability.
- Dashboard groups: shared profile/raw-data/map-grid; admin users/settings/sweeper-settings/sys-logs/audit-logs/optimization-settings; officer reports/operations/hotzone-intel/crew-management/optimization/metrics/sweeper-analytics; field-crew tasks/operations/my-route/raw-data/hotzone-intel.
- One App Router API handler found: app/api/tasks/auto-generate/preview/route.js. No middleware/proxy file found in inventory. Absence of middleware alone is not a vulnerability; handler/server authorization must be assessed.
- No recognized .github/GitLab/CircleCI/Buildkite, Docker or Vercel deployment files were found under the web workspace. Deployment controls outside this scope remain unverified.
- Local environment names only: FRONTEND_URL, JWT_SECRET, MIN_PASSWORD_LENGTH, NEXT_PUBLIC_BACKEND_API_URL, NEXT_PUBLIC_CARTO_API_KEY, NEXT_PUBLIC_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_URL, NODE_ENV, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS. Names do not prove runtime enforcement of the corresponding controls.
- Phase 2 leads: client-side dashboard/role gates and browser session storage; verify actual server/API enforcement rather than inferring a bypass from the UI. Preview API authentication/data access needs review against intended public-report visibility. Error response behavior is a Phase 5 lead. These leads are not yet scored as findings.

## Evidence and Verification Limits

Audit initialized before investigation. Findings will distinguish source evidence, local runtime observations and deployment checks that require manual verification.

Evidence methods: graphify query/explain before source discovery; scoped filename/content-pattern scans excluding dependencies/build output initially; metadata-only Git history searches; git check-ignore and git ls-files; exact-value comparisons without value output; local Next.js production HTTP requests; production manifest and .next/static inspection. The fast sub-agent performed inventory, configuration, secret and targeted history scans; the primary independently verified local env key classification and all 115 browser-static files against the exact sensitive value.

No dependency audit, account creation, authenticated role simulation, storage mutation, database query, live endpoint credential validation, or live-host testing was performed in Phase 1. Those workflow checks are pending subsequent phases. The existing production artifact was used without rebuilding current dirty source. Only this Markdown log was added, so no code change or graph rebuild was required. Phase 1 summary: 9/50 investigated; 5 scoped passes, 0 confirmed vulnerable items, 4 manual-verification items; 0 Critical/High/Medium/Low confirmed findings.

Phase 2 verification: current-source synthetic handler/form/session checks, isolated Chromium contexts with intercepted APIs, 14 actual unauthenticated/invalid-token loopback backend read probes, and one actual unauthenticated local web route-preview request. Browser automation used the installed runtime without installing packages; all browser contexts were closed. The preexisting production build was not rebuilt. No real valid tokens were read, no user/role/report state was changed, and no secret or returned plan payload was written to this log. Only this log was modified. Phase 3 is next: database/Supabase/storage permissions (#7, #8, #41, #48); no Phase 3 verdict is implied by the preview response.

Final preservation check: additional UI edits appeared concurrently in the user's working tree during Phase 2. They were not made or reverted by this audit. SessionProvider's added icon import shifted relevant locations by one line; the cited session-management locations were refreshed and the reviewed validation/refresh behavior remains unchanged. The temporary audit server on port 4017 was stopped; the existing backend on port 4002 was left running.

Final log consistency check: all checklist IDs 1–50 appear exactly once in result tables; dashboard totals and all twelve unique finding severities reconcile. No JWT-shaped credential was found in the log. Installed Next remains 16.3.0 (declared ^16.3.0), and the temporary audit listener on port 4017 is stopped. Only this audit log was edited by this phase.
