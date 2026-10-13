# Public landing page

The home route introduces EcoPin before citizens enter the report browser. The supplied reference informs the centered headline, map fading in from above, floating filter bar, and quieter explanatory sections. Civic blue is the primary action color; green is reserved for community and environmental accents.

## Public routes

- `/`: Landing page with a draggable map preview, introduction, Android showcase, and reporting guide.
- `/explore`: Full map and public report details. The filter toolbar switches between map and gallery views, without a title box, saved reports, export, or submission footer.
- `/explore?view=gallery`: Incident gallery with public-text search, labeled Grid/Showcase controls, and a photo viewer with image/report navigation.
- `/landing`: Redirects to `/`.
- `/mobile` and `/mobile-app`: Redirect to `/#mobile-app`.
- `/downloads`: Responsive APK download card, three installation steps, and FAQs. Only the download button starts a download.

The landing preview uses the existing bounded `fetchPublicReportPage` helper and public projection. It fetches at most 100 reports per viewport, cancels stale requests, and shows only reviewed reports with valid coordinates. Its count describes the current preview rather than a city-wide total. Loading, empty, and unavailable states are explicit. No illustrative incidents or invented statistics are mixed into live data.

The preview disables scroll-wheel zoom so the map does not interrupt page scrolling. Dragging, keyboard map navigation, dedicated zoom buttons, neighborhood and concern filters, and report popups remain available. Map attribution stays visible. On small screens the navigation collapses, content stacks, and the guide remains below the app showcase. Both themes use the existing Outfit typeface and public theme preference.

The map spans the full viewport, with a long fade continuing behind the header and hero. Its height is at least the visible screen height, including tall desktop and portrait displays. Lenis (already a project dependency) smooths desktop wheel and anchor scrolling only while the landing page is mounted. Animations are enabled by default as requested, with no preference button or dependency on the old `ecopin-motion` setting. Components enter once with a short stagger and 820ms easing, then stay visible when scrolling back. Content stays visible if scripting is unavailable. Leaving the page stops and destroys the scrolling instance.

Three supplied cleanup photographs show SWMO field crews at work between the introduction and app showcase. They use descriptive alternative text, responsive sizes, lazy loading, and hover lift/zoom interactions. They are editorial photos of field work rather than evidence attached to named live EcoPin reports.

The full-width navigation is fixed at the top while the hero remains in view. Below it, an icon rail appears on the right with accessible labels and hover/focus tooltips. Both use the same link definition and order: Home, Explore, About, Download (Download App in the rail), followed by theme and account controls. Signed-in account buttons show only the avatar in both locations. The inactive navigation is inert and hidden from assistive technology. Account information uses the existing token-change subscription and authenticated `/api/auth/me` endpoint, so account changes and sign-out update without a page reload.

Map photo pins use publicly available evidence from the existing batch endpoint when available. Otherwise they use the same category photographs as the full map, explicitly marked as category illustrations in the popup. Their cached HTML icons, dimensions, anchors, status dots, and selected appearance mirror PublicMap. Report clusters and coincident coordinates are grouped at overview zooms; zooming above 14 separates overlapping pins radially with dashed connector lines, using the full map's radius rule. Stable report IDs prevent positions from shuffling when data rows reorder. A pin selection highlights the pin, centers it with popup clearance, and opens the existing compact popup without Leaflet's competing automatic pan. Photo loads no longer remount the marker group. Private storage references are not placed in raw marker HTML.

## Verification

Run `npm test`, `npm run build`, and lint the changed public components. In a real browser, check widths of 320, 768, 1024, and 1440 pixels; map dragging and filtering; report popups; map/gallery switching and browser history; app-section links; theme switching; and keyboard focus. Check the preview's empty and unavailable states as well as live reports.

The repeatable browser check is `node tests/public-landing.browser.cjs` with the preview running. It requires Playwright and an installed Chromium browser. If these are supplied by the workspace runtime, set `ECOPIN_PLAYWRIGHT_PATH` to the Playwright package directory and `ECOPIN_CHROMIUM_PATH` to the Chromium executable. `ECOPIN_TEST_URL` optionally overrides `http://localhost:4001`. The check uses synthetic responses for empty, unavailable, and reviewed-only scenarios, without changing server data.


The implementation lives in app/explore. Legacy /map and /gallery links redirect to the corresponding Explore mode. Explore and Downloads share the landing navigation; login uses the same theme tokens with a back button and no navbar. Login photos crossfade every eight seconds with a Pause/Play control and are omitted on mobile. Shared themed dropdowns replace native highlight menus, and the map popups use the landing component and Outfit font. The extended rules are in DESIGN.md; run tests/public-pages.browser.cjs and tests/public-refinements.browser.cjs for their combined runtime checks.
