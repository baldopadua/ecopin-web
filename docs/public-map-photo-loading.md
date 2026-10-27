# Public Map dummy-photo loading investigation

Verified 27 October 2026 against the live Vercel frontend and its CloudFront backend.

The random citizen-photo assignments are stored in the backend's `src/data/seeded-report-evidence.json`, loaded by `src/controllers/report.controller.js`. They are not saved in the report's database photo fields. Before/after photos are saved in the database, which lets Officer Map Grid use its cleanup-photo fallback. The Public Map's explicit public-report projection does not include those cleanup-photo fields and obtains photos from the evidence API.

For approved, exact-location public report `874c324b-3a7a-6909-2533-73bd43442d2a`, the local single and batch evidence handlers returned two assigned photos. Both production evidence endpoints and the live site's proxy returned HTTP 200 with no evidence. The assigned image file itself returned HTTP 200. The live page successfully loaded existing Cloudinary photos, so this discrepancy is not explained by broken image URLs or a general browser image-blocking problem. Production is not serving the local dummy-photo mapping.

The backend loader and manifest were staged additions relative to the local committed code during this investigation. The existing backend release package includes `src`, so a backend release containing both changes is needed. This investigation did not deploy or change database records or public access policies.

Two frontend issues were also corrected locally: photo loading stopped after the first 24 displayed reports, and returning to Explore could skip shared cached evidence without copying it into the page's local state. Public Map now processes all displayed exact-location reports in sequential batches of up to 24, hydrates cached results, and does not cache failed fetches as empty success. Approximate-location reports remain excluded.

Regression coverage checks photos beyond report 24, navigation back to cached photos, and public-visibility restrictions on packaged dummy evidence. Release verification should repeat the production evidence requests for this public sample and confirm that the live page receives its assigned photos.
