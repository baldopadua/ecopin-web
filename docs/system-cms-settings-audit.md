# System and CMS settings audit — 27 October 2026

The audit traced each field from the admin form through persistence to its consumer. Fixes are local; the web app and backend must both be deployed. No production setting, password, storage policy or APK was changed during verification.

| Settings | Finding and resulting behavior |
| --- | --- |
| Maintenance mode and notice | Previously saved without a public consumer. `PublicSiteProvider` now pauses home, downloads, delete-account, Explore and public report pages, including their legacy aliases. Staff sign-in, forced password change and dashboards remain accessible, as requested. This pauses public web pages; it does not disable the backend or native reporting. |
| APK URL | Home and Downloads previously hardcoded the bundled APK. Both now read `app_download_url`, with the bundled APK as the empty/invalid-value fallback. |
| APK upload | The old upload crossed a 10 MB web proxy and 50 MB backend multipart limit, below the approximately 86 MB APK. The admin form now obtains a scoped signed upload, sends the file directly to `cms-media`, then verifies its path, size and content type through the backend. APKs allow up to 100 MiB; photos allow up to 10 MiB, subject to the storage project's limits. Uploading changes the draft URL; **Save changes** publishes it. A failed upload preserves the prior draft URL. |
| Version, release notes, Play Store URL | Previously unused. Both download surfaces now display the configured release details and optional Play Store link. |
| Support and office email | The form previously always sent to a hardcoded support address. Its recipient selector now uses the configured addresses; the backend allows only the configured recipients. Blank contact addresses no longer silently route to the old mailbox. |
| Office address and office email display | Previously omitted by the redesigned footer. Restored in the shared footer. |
| City Facebook URL and label | Previously unused in the redesigned footer. Restored independently of the configurable SWMO Facebook link. |
| Office name, phone, operating hours, SWMO Facebook | Already connected to the shared footer. Retained; blank SWMO URL hides its link. |
| Lead title, subtitle, image, caption, tagline, credit name/link | Already connected to the landing community section. Retained. Uploaded images use the existing permitted Supabase media host. External image URLs remain subject to Next image host and CSP restrictions. |
| Gallery images and captions | Already connected to the landing community gallery. Retained; upload uses the new signed path too. |
| Advisory enabled/title/message/severity/link/text | Already connected to the home advisory banner. Retained; public links reject unsafe URL schemes. The advisory is a home-page banner, unlike maintenance which covers the public routes. |
| Password minimum and four requirement switches | Requirements were displayed but several backend password writes bypassed them. Registration, authenticated change, forced change, admin creation, admin reset and the recovery endpoint now check the latest saved policy before any auth write. Lookup failure blocks the write. The requirements endpoint now uses the canonical latest settings row instead of failing on historical rows. Provider-level Supabase Auth restrictions can still be stricter. |
| Password requirements in staff web screens | Profile previously requested admin-only settings, and the session policy route called the admin endpoint without credentials. Profile and temporary sessions now receive the narrow password policy endpoint. Admin creation prompts for a custom temporary password when the fixed default cannot meet the saved policy. |
| Daily report quota and maximum video seconds | Existing backend enforcement was found. Retained; invalid numeric settings are rejected before a CMS save. |
| Web session lifetime | Intentionally fixed at 30 days by `docs/session-lifetime.md`. The old timeout is not a working web inactivity control. Removed the hidden default timeout from web save payloads so unrelated saves do not overwrite the legacy value. |
| Settings load/save | Failed admin reads previously showed editable defaults. The settings page now shows a reload action and blocks Save. Admin CMS reads are strict. Cold partial saves read the existing stored CMS document before merging; storage failures or corrupt documents cannot overwrite it with defaults. |

## Persistence and refresh

The backend CMS cache lasts one minute and is refreshed immediately by a successful save on that process. Public pages load settings before displaying their content, refresh every minute while open, and refresh on window focus. Changes can take a cache/refresh cycle to reach another process or open tab. Public read failures retain the last loaded content, or defaults on a fresh visit; maintenance is not an API access-control mechanism.

Signed upload preparation and completion require the existing authenticated admin routes. Paths are scoped to the admin and field, use a unique name and disallow overwrite. Completion checks stored metadata before returning a public URL. Raw file bytes never pass through the web proxy. Storage errors leave the published setting unchanged. Uploading without saving can leave an unused media object, as with the former upload flow.

## Remaining findings and verification limits

- **Production APK capacity:** read-only inspection found a public `cms-media` bucket without an explicit bucket file-size limit. The project-wide upload limit/plan was not established, and no real 86 MB file was uploaded. The browser test exercises the real SDK and an 86 MB synthetic Blob with the storage response mocked; backend tests verify metadata checks and bucket-limit rejection. Verify the live project's file-size allowance before publishing a large APK. Raising the application's limit cannot raise the storage platform's limit.
- **Password recovery:** the preexisting recovery handler calls `supabaseAdmin.auth.updateUser(token, { password })`, which does not match the installed SDK signature. The added policy guard does not repair the token/session recovery flow. Recovery needs a separate verified-token/session fix and end-to-end recovery test; the audit does not claim that flow succeeds.
- **Legacy native session timeout:** the native admin settings expose the legacy value, but no runtime consumer was located during the audit. No new timeout behavior was introduced, and the deliberate web lifetime was preserved.
- External image hosts must remain compatible with the site's image/CSP configuration. Uploading through CMS uses the already configured Supabase host.

## Verification

- Backend: 253 tests across 26 suites, including 42 focused CMS/password/upload tests.
- Web: 142 unit tests plus 6 response-deadline tests; production build passed.
- Browser: configured downloads/release/contact content; admin save/reload; synthetic 86 MB upload with generic source MIME normalized to APK MIME; upload failure retaining the draft; maintenance on public routes and staff access; failed-load Save protection; custom-password prompt under a stricter policy.
- Responsive maintenance and Downloads checks at 320 and 1440 px in light/dark themes, with screenshots inspected. Existing footer and settings browser regressions are also run.
- Targeted lint passed for the changed CMS, public UI, API and session files. Profile and admin Users have existing effect/initialization lint errors outside the password-related edits; these were not suppressed. The broader working tree also contains two existing trailing-whitespace warnings in `PhotoGalleryCard.js`.

Implementation: `lib/public-cms.mjs`, `components/public/PublicSiteProvider.js`, shared landing/footer components, Downloads, admin settings/users, `lib/api/admin.js`, the session password-policy route and Profile; backend CMS/upload/password-policy services and admin/auth/contact controllers. No database migration is required.
