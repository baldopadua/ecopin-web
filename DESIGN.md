# EcoPin Web Design Contract

Updated: 19 October 2026

This document defines EcoPin's public web experience and the shared visual and interaction contract for administrator and officer workspaces. Sections 1–20 preserve the public landing, Explore, login, download, and citizen-guide design in detail. Section 21 defines the role-workspace contract; later sections retain route-specific staff requirements.

Scope: public web routes described in sections 1–20 and the administrator/officer web routes described in section 21 and later staff sections. Public/landing pages and field-crew pages are excluded from the role-workspace redesign. Their existing routes, behavior, and page-specific design constraints remain intact.

This is a target contract, not a claim that every route already meets it or that the listed acceptance checks have passed. Public implementation details remain documented as existing behavior where stated; staff requirements and acceptance checks are prospective unless separately verified. Source links point to the files that own shared decisions; unused CSS selectors are not evidence of an active feature.

## Contents

1. [Direction and nonnegotiable rules](#1-direction-and-nonnegotiable-rules)
2. [Information architecture and public routes](#2-information-architecture-and-public-routes)
3. [Color, theme, and brand](#3-color-theme-and-brand)
4. [Typography and iconography](#4-typography-and-iconography)
5. [Spacing, shape, and elevation](#5-spacing-shape-and-elevation)
6. [Hero composition and full viewport map](#6-hero-composition-and-full-viewport-map)
7. [Navigation and account identity](#7-navigation-and-account-identity)
8. [Live map controls, data, and states](#8-live-map-controls-data-and-states)
9. [Photo pins, clustering, and compact popups](#9-photo-pins-clustering-and-compact-popups)
10. [SWMO photo story](#10-swmo-photo-story)
11. [App showcase, guide, and supporting sections](#11-app-showcase-guide-and-supporting-sections)
12. [Scrolling, animation, and interaction](#12-scrolling-animation-and-interaction)
13. [Responsive layout](#13-responsive-layout)
14. [Accessibility and content integrity](#14-accessibility-and-content-integrity)
15. [Implementation boundaries and performance](#15-implementation-boundaries-and-performance)
16. [Regression constraints](#16-regression-constraints)
17. [Verification and maintenance](#17-verification-and-maintenance)
18. [Login page contract](#18-login-page-contract)
19. [Explore page contract](#19-explore-page-contract)
20. [Android installation page contract](#20-android-installation-page-contract)
21. [Administrator and officer workspace contract](#21-administrator-and-officer-workspace-contract)
22. [Password recovery and staff feedback](#22-password-recovery-and-staff-feedback)
23. [Officer analytics](#23-officer-analytics)
24. [Admin sweeper settings](#24-admin-sweeper-settings)

## 1. Direction and nonnegotiable rules

### Audience and purpose

Design for Pasig citizens who may have little technical experience. The page must explain EcoPin before asking people to use it: see local environmental concerns, understand the public reports, and learn how to report from an Android phone.

The visual direction is civic, welcoming, and calm. The innovative element is the composition: a large centered headline over a map that gradually emerges, followed by a compact navigation rail and a photographic account of field work. Familiar links, labeled dropdowns, recognizable icons, and plain language keep the experience easy to use.

The supplied real estate landing reference informed the large centered headline, fading map, floating filter bar, and generous space. EcoPin uses its own identity, Pasig context, public report data, and environmental language. Reference branding, property listings, commercial claims, and unrelated imagery are not part of this design.

### Core rules

- Introduce the service on the home page; retain the detailed report browser at `/explore`.
- Use civic blue for actions and green for environmental and community accents.
- Give the map the full viewport width. Reading sections may have a maximum width.
- Keep the upper hero calm and readable; reveal more map detail lower down.
- Keep the map genuinely draggable and its reports genuinely public.
- Make map and gallery two ways to explore reports, with familiar switching between them.
- Integrate the Android showcase and citizen guide into the landing page.
- Use meaningful differences in section layout rather than repeating a uniform card grid.
- Use restrained borders and shadows. Gradients serve the map fade and photo legibility.
- Keep motion noticeable but brief, with one entrance per component per page mount.
- Keep navigation available while scrolling and reflect the current signed-in account.
- Never invent incident counts, impact statistics, testimonials, completion times, or product capabilities.
- Identify the supplied cleanup workers as SWMO field crews. Do not describe them as random citizens or link their photos to a named live report without evidence.
- Sections 1–20 govern the public landing and related public routes. Administrator and officer workspace rules are defined in section 21 and later staff sections; they do not authorize changes to public behavior or field-crew screens.

Avoid neon accents, purple gradients, decorative charts, excessive glass panels, large shadowed cards everywhere, technical dashboard copy, and decorative movement that obscures the task.

## 2. Information architecture and public routes

### Route contract

| Destination | Responsibility |
| --- | --- |
| `/` | Landing page, interactive preview, About, SWMO story, Android showcase, and guide |
| `/explore` | Full public report browser with map mode and gallery mode |
| `/map` | Compatibility redirect to `/explore`, preserving query parameters |
| `/explore?view=gallery` | Gallery mode in the same Explore page |
| `/gallery` | Compatibility redirect to `/explore?view=gallery`, preserving report links |
| `/landing` | Redirect to `/` |
| `/mobile` | Redirect to `/#mobile-app` |
| `/mobile-app` | Redirect to `/#mobile-app` |
| `/downloads` | Existing APK download and installation help |
| `/ecopin-app-release.apk` | Direct Android download from an explicit download link |
| `/auth` | Anonymous account action |
| `/dashboard` | Signed-in account action; dashboard design is outside this scope |

The home page is an introduction and usable preview. Explore map and gallery modes retain the detailed report experience rather than being replaced by promotional content.

### Page sequence

| Order | Section | Role |
| --- | --- | --- |
| 1 | Header | Brand, four primary destinations, theme, account |
| 2 | Hero | “A cleaner Pasig starts with us.”, map exploration, app action |
| 3 | Promise strip | Rooted in Pasig, reviewed reports, made for citizens |
| 4 | About | Explain the service; offer map and gallery paths |
| 5 | SWMO photo story | Show the field crews collecting waste and clearing debris |
| 6 | Android showcase | Explain photo, location, description, and tracking benefits |
| 7 | Citizen guide | Three reporting steps and a review/privacy note |
| 8 | Closing invitation | Repeat the app action in a quiet green section |
| 9 | Footer | Brand, short tagline, Map, Gallery, Citizen guide, Pasig identity |

Section anchors are `#main-content`, `#about`, `#mobile-app`, and `#how-it-works`. The guide remains on the page even though “How it works” is removed from the primary navigation.

The hero's strongest action is “Explore the map”; its secondary action is “Get the EcoPin app.” Later sections repeat these choices in context. Avoid introducing competing primary actions.

## 3. Color, theme, and brand

Source: [LandingPage.module.css](components/landing/LandingPage.module.css), [usePublicTheme.js](components/landing/usePublicTheme.js), and [root layout](app/layout.js).

### Landing tokens

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| `--landing-bg` | `#ffffff` | `#121212` | Page, floating controls, navigation |
| `--landing-soft` | `#f5f7fa` | `#1c1c1c` | Quiet cards and app showcase |
| `--landing-text` | `#17212e` | `#f5f5f5` | Main headings and body emphasis |
| `--landing-muted` | `#59636e` | `#b0b0b0` | Supporting copy and secondary labels |
| `--landing-blue` | `#0052cc` | `#82b6ff` | Links, emphasis, focus, blue line icons |
| `--landing-green` | `#27754d` | `#83cba0` | Environmental labels and green icons |
| `--landing-green-bg` | `#eef6f0` | `#1a2920` | Environmental notes and closing band |
| `--landing-border` | `#e5e9ee` | `#333333` | Dividers and surface edges |

Primary filled actions retain `#0052cc` with white text in both themes. Hover uses `#003d99`. The lighter dark-theme blue token is for readable links and accents, not the filled button background.

Dark surfaces are neutral charcoal. Do not replace them with blue-gray slate. Change semantic tokens together rather than introducing isolated hardcoded surface colors.

### Theme behavior

The root layout initializes the existing `dark` class from the saved `theme` preference, falling back to the operating system's color scheme. The landing hook observes that class using `useSyncExternalStore` and a `MutationObserver`. Toggling updates both the class and `localStorage.theme`.

Use this existing theme mechanism; do not add a second independent theme state or persistence key for the landing page. Theme controls name the destination state: “Switch to light mode” or “Switch to dark mode.”

### Brand assets

Use the existing full EcoPin logo in the header and footer and the solo logo inside the phone illustration. Header and footer logos render at approximately 30px high, with the header reduced on mobile. Their width remains proportional.

The dark header/footer treatment applies `brightness(0) invert(1)` for a white silhouette. Keep the logo clear on both surfaces and preserve the accessible home link name. The navigation logo has no supporting tagline at any viewport width.

## 4. Typography and iconography

Use the existing Outfit family through `next/font/google` and `--font-outfit`, with a sans-serif fallback. The root loads weights 400, 500, 600, and 700; landing headings primarily use 500. Do not introduce another display font.

| Element | Current treatment |
| --- | --- |
| Desktop H1 | `clamp(44px, 5.2vw, 72px)`, weight 500, line height 1.08, tracking `-0.045em` |
| Mobile H1 | `clamp(40px, 8vw, 56px)`; 38px below 375px |
| Section H2 | `clamp(28px, 3.4vw, 44px)`, weight 500, line height 1.15, tracking `-0.035em` |
| Feature/guide H3 | 20px, weight 500, line height 1.3, tracking `-0.02em`; feature headings 18px on mobile |
| Hero description | 17px, line height 1.65; 15px on mobile |
| Main explanatory paragraphs | 16px, line height 1.75, typically capped at 440px |
| Feature and step descriptions | 14px, line height 1.7; compact feature copy 13px on mobile |
| Main navigation | 14px |
| Section labels | 13px, weight 500, usually green |
| Primary actions | 15px, weight 500; compact Android action 13px on mobile |
| Text actions | 15px, weight 500; underline on hover with 4px offset |
| Toolbar labels / values | 11px / 14px; select values 13px on mobile |
| Captions, notes, footer | Generally 12–13px; never substitute these sizes for main explanatory text |
| Popup title | 17px, line height 1.25 |

Keep one H1. Use H2 for sections and H3 for feature/step titles. Preserve semantic heading order rather than choosing headings for their size. The hero's desktop line break is deliberate; auxiliary desktop breaks are removed at very narrow widths.

Use Lucide line icons consistently, generally 16–24px. The hero pin is 32px on desktop and 24px on mobile. Pair unfamiliar icons with text or an accessible name. Decorative icons should not repeat the control's spoken name.

The green inline pin capsule is a distinctive hero accent: 80 × 48px on desktop, 56 × 36px on mobile, rounded as a pill, rotated `-8deg`. The word “us.” uses blue emphasis.

## 5. Spacing, shape, and elevation

### Rhythm and reading width

Use a 4px/8px spacing rhythm: 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, and 96px. Use smaller values inside controls and larger values between sections.

Map anchors, icon geometry, the phone drawing, and viewport calculations are intentional geometric exceptions. They are not a reason to add arbitrary content padding.

- Promise strip, About, and guide: maximum 1184px.
- SWMO story, app showcase, and footer: maximum 1280px.
- Header and hero map: uncapped, full viewport width.
- About and guide: 96px vertical padding on desktop, 56px on mobile.
- App showcase: 64px desktop padding and gap.
- Reading paragraphs should stay comfortable rather than stretching across the entire page.

### Shape

| Element | Radius |
| --- | --- |
| Primary actions, header sign-in, side rail, hero capsule | Pill / `999px` or greater |
| Feature cards and photo frames | 16px |
| App showcase | 24px |
| Notes, icon tiles, map caption and controls | 12px |
| Rail tooltips | 8px |
| Mobile map toolbar | 20px |
| Phone chassis | 36px, as an illustration-specific exception |

Use 1px borders for ordinary surfaces and dividers. Photo-pin borders and the phone frame deliberately use thicker outlines to remain recognizable.

### Elevation

Use shadows to indicate floating controls or lift, not to decorate every section. Current examples include `0 8px 32px` with low-opacity color for the rail/toolbar and `0 4px 16px` for quiet map controls/captions. The phone and map pins use stronger shadows because they are isolated objects over a background.

The header and rail use 16px backdrop blur with theme-colored backgrounds at 90% and 94% opacity respectively. Keep blur confined to navigation rather than applying it to the whole page.

## 6. Hero composition and full viewport map

### Geometry

The map begins behind the header and hero copy and stretches to both screen edges. It must reach the bottom of the visible screen on tall displays.

| Measurement | Desktop | Mobile, up to 767px |
| --- | --- | --- |
| Navigation spacer | 104px | 76px |
| Hero minimum height | `max(880px, calc(100svh - 104px))` | `max(800px, calc(100svh - 76px))` |
| Map section top | `-104px` | `-76px` |
| Map section remaining edges | Bottom, left, right: 0 | Same |
| Hero copy padding | 64px 24px 0 | 40px 16px 0 |
| Floating filter bar top | 568px | 496px |
| Filter bar width | 520px, maximum `calc(100% - 32px)` | Same maximum |
| Zoom/reset controls | Right 32px, top 680px | Right 16px, top 608px |

The minimum-height calculation allows a hero longer than a short screen, while growing to cover a tall one. Do not restore a fixed hero height that leaves a white strip below the map. Do not cap the map at the text reading width or round it into a contained card.

The map preview fills its parent with `height: 100%`. The copy's wrapper uses `pointer-events: none`, while its links restore `pointer-events: auto`. The gradient also ignores pointer events, so the map remains usable underneath.

### Long fade from the top

The fade is a full-size overlay using the current page background, including in dark mode.

| Position down the map | Page-color opacity |
| --- | --- |
| 0% | 100% |
| 22% | 98% |
| 40% | 85% |
| 62% | 35% |
| 82% onward | Transparent |

Use `color-mix(in srgb, ...)` for intermediate stops. The extended fade protects the headline and gently introduces geographic detail farther down. Do not shorten it into a hard transition immediately beneath the title.

Light tiles use grayscale, contrast 0.85, and opacity 0.75. Dark tiles use grayscale, inversion, brightness 0.75, and opacity 0.8. The subdued tiles give photos, controls, and the headline visual priority.

### Layering

The preview establishes `isolation: isolate`. The Leaflet map itself uses `z-index: auto`; its internal panes manage tile, marker, and popup layering. Setting the entire map to `z-index: 0` previously trapped popups behind the fade.

The fade is at 400 inside the map composition; floating toolbar, caption, status, and full-map link are at 450. Hero copy has its own positioned layer above the map composition. Header and rail are at 1000. Selected markers also receive a Leaflet `zIndexOffset` of 1000.

Keep OpenStreetMap attribution visible and usable. Moving controls or altering height must not clip it.

## 7. Navigation and account identity

Source: [LandingNavigation.js](components/landing/LandingNavigation.js) and [usePublicAccount.js](components/landing/usePublicAccount.js).

### One destination list, two presentations

| Order | Header label | Rail name / tooltip | Destination |
| --- | --- | --- | --- |
| 1 | Home | Home | `#main-content` |
| 2 | Explore | Explore | `/explore` |
| 3 | About | About | `#about` |
| 4 | Download | Download App | `#mobile-app` |
| 5 | Theme icon | Destination theme | Toggle existing theme |
| 6 | Account control | My account / Sign in | `/dashboard` / `/auth` |

Both presentations derive the first four destinations from one shared definition. Do not restore “Explore reports,” “About EcoPin,” or a primary “How it works” link. Do not reorder the rail independently.

Use native anchors for same-page hashes and Next.js `Link` for routes. This allows Lenis to handle anchors without competing router scrolling.

### Hero header to right-side rail

The full-width header is fixed at the top while the hero intersects the viewport. An `IntersectionObserver` activates the rail only when the hero is no longer intersecting and its bottom has passed above the viewport.

The header moves upward by `translateY(-110%)` and fades over 500ms. The icon rail sits on the right at vertical center. It enters from `translate(100px, -50%)` to `translate(0, -50%)`, using a 600ms eased transform and 400ms opacity transition.

The inactive presentation is `inert`, `aria-hidden`, and ignores pointer events. This prevents duplicate invisible navigation in the keyboard and assistive-technology experience. Returning to the hero restores the header.

Rail controls are 44 × 44px. Tooltips appear to the left, on hover and keyboard focus, with a 200ms fade/translation. Every icon has an accessible label even when the tooltip is not showing.

On mobile, a menu button opens the four text destinations below the header at 76px. It exposes `aria-expanded`, changes its open/close name, and closes after a selection.

### Current account, avatar only

Anonymous visitors see “Sign in” in the header and a profile icon in the rail. A session changes both controls to the current account avatar. Both use the same photo source and destination.

- Header account target: 44 × 44px, avatar 40px.
- Rail account target: 44 × 44px, avatar 32px.
- Source: `user.avatar_url`, falling back to `/icons/users.png`, rendered with `SecureImage`.
- No visible account name, truncated text, or initials beside the avatar.
- The full name remains in the accessible label, for example “Open account for Ava Mendoza.”

The account hook subscribes to the existing token store using `readAuthToken`, `subscribeAuthToken`, and `useSyncExternalStore`. It fetches `/api/auth/me` through the configured backend with the existing bearer token.

Requests are abortable. Results are associated with the token that requested them, so changing accounts cannot keep showing the previous user's identity. A 401 response invalidates the displayed session state. While account details load for an active token, the generic account avatar may appear.

Do not expose tokens in rendered HTML or logs. This UI reads the existing session; it does not introduce a new authentication policy.

## 8. Live map controls, data, and states

Source: [LandingMap.js](components/landing/LandingMap.js) and [public-report-page.mjs](lib/api/public-report-page.mjs).

### Interaction

Use Leaflet/React Leaflet for the real map. The component loads dynamically on the client with `ssr: false` and a map loading placeholder.

- Allow dragging, keyboard map navigation, photo-pin selection, and dedicated zoom buttons.
- Disable scroll-wheel map zoom so wheel scrolling continues through the page.
- Provide a reset control named “Return map to Pasig City.”
- Provide labeled PublicSelect controls for Neighborhood and Concern type.
- Keep both the toolbar's full-map action and the lower “Open full map” link.
- Keep a quiet caption: “Pasig City, through your eyes,” with “Drag to explore · Tap a pin” where space allows.

Reset returns the location selection and map view to All of Pasig. It does not clear the concern-type selection.

Tiles use `https://tile.openstreetmap.org/{z}/{x}/{y}.png` with the visible contributor attribution. Do not substitute a tileset that requires an unavailable API key or returns warning tiles.

### Neighborhood choices

| Choice | Center: latitude, longitude | Zoom |
| --- | --- | --- |
| All of Pasig | 14.5802, 121.085 | 14 |
| Ortigas Center | 14.5862, 121.061 | 15 |
| Rosario | 14.5875, 121.092 | 15 |
| Maybunga | 14.5775, 121.0965 | 15 |
| Kapasigan | 14.5595, 121.0805 | 15 |

Concern choices are All concerns, Waste, Flooding, Pollution, Infrastructure, Illegal logging, and Other concerns. Keep internal keys such as `illegal_logging` out of visible labels.

### Public data contract

Fetch from the existing `public_reports` projection through `fetchPublicReportPage`, bounded to the viewport. The landing requests a limit of 100; the helper fetches one additional row to determine `hasMore`.

Refresh after map movement, issue filtering, or retry. Debounce requests by 250ms and abort stale work. Preserve deterministic ordering by descending `created_at`, then descending `id`.

Only display rows with finite coordinates and a normalized validation status of approved, validated, or verified, or a normalized stage of verified. Retain public location precision instead of using private coordinates to make a pin appear more exact.

The status count describes retained reviewed reports in this view. A “+” indicates additional rows in the bounded public query, not a verified city-wide total or an exact count of all remaining reviewed reports.

Fetch report evidence in batches only for uncached reports whose public location precision is exact. Cache results by report ID, including empty results. Do not issue a separate evidence request for every marker on each render.

### State design

| State | Presentation |
| --- | --- |
| Map module loading | “Loading the Pasig map…” |
| Report request loading | “Finding public reports…” |
| Available reports | Correct singular/plural reviewed count, qualified “in this view” |
| Empty | “No reviewed reports in this view. Try another area.” |
| Unavailable | “Reports couldn’t load.” and a named “Try again” action |
| Evidence absent | Category imagery, with “Photo: category illustration” in the popup |

Use `role="status"` for report feedback. Do not fill empty/error states with invented incidents. Category imagery is a visual fallback, not report evidence.

## 9. Photo pins, clustering, and compact popups

Source: [PhotoReportMarker.js](components/landing/PhotoReportMarker.js), [pinIcon.js](components/landing/pinIcon.js), and [public-pin-layout.mjs](components/landing/public-pin-layout.mjs). The visual and grouping rules mirror the preserved [PublicMap](app/explore/PublicMap.js).

### Photo marker construction

Markers use cached Leaflet `divIcon` HTML with a circular crop, pointed base, border, shadow, and optional status pip. Public report imagery takes priority over the same category photographs used by the full map.

| State | Circle | Pointer height / width | Border |
| --- | --- | --- | --- |
| Normal | 42px | 7px / 10px | 3px white |
| Overview cluster | 46px | 7px / 10px | 3px civic blue |
| Selected | 50px | 8px / 12px | 3.5px civic blue, with selection glow |

Anchor at `[size / 2, size + pointerHeight]`. Popup anchor is `[0, -(size + pointerHeight) - 4]`. Images use `object-fit: cover`, circular clipping, lazy loading, and empty image alt text; the marker supplies the report title.

Cluster pins use the blue ring rather than a numeric badge. Selected pins grow slightly and receive a stronger blue glow. Normal pins retain enough white edge and shadow to stand out over the map.

| Status | Pip color |
| --- | --- |
| Urgent | `#ef4444` |
| Resolved | `#10b981` |
| In progress | `#3b82f6` |
| Unresolved / submitted / pending | `#f59e0b` |

Pips are 9px, or 11px when selected, with a 2px white border. Other statuses have no pip. Always include written status in the popup; color alone is insufficient.

### Safe, stable icons

The cache key includes image URL, selection, theme, status, and cluster state. Cache HTML-backed icon definitions rather than sharing a single live DOM node or mounting React portals inside Leaflet icons.

An image must resolve to HTTP(S), pass the existing private-media check, and not contain a quotation mark or `<` before entering raw marker HTML. Private storage references fail closed to category imagery. Report titles and descriptions remain React-rendered text.

Keep stable report keys. A later evidence photo must update the icon without remounting the marker collection, losing selection, or leaving duplicate/blank markers.

### Grouping and separation algorithm

This preview uses explicit report groups and coincident coordinates, not a generic pixel-distance clustering plugin.

1. Group by `cluster_id` when available; otherwise group coordinates rounded to four decimal places.
2. Sort each group's report IDs for stable representative and radial positions.
3. At zoom 14 or below, render one cluster for groups containing two or more reports. Use the mean coordinate and the first stable member as the representative.
4. Above zoom 14, display each member separately. For a group, the radius is `0.00035 * 2 ** (16 - zoom)`.
5. Place each report at an angle `2 * Math.PI * index / memberCount`, offsetting latitude with sine and longitude with cosine.
6. Connect displaced markers to their original coordinates using blue dashed lines: weight 1.5, opacity 0.6, dash pattern `3 3`.

The separation radius is a geographic display offset, not a pixel distance. Never mutate report coordinates or persist the displaced positions as incident locations. Unrelated single reports stay at their original positions. Invalid coordinates are excluded.

### Selection and popup clearance

Clicking an overview cluster zooms to 15 so its members separate. Clicking a single pin pans with a 450ms animation. Project/unproject calculations offset the center by `max(0, mapHeight / 2 - 80)` to keep the compact popup below the hero copy.

Selected markers receive `zIndexOffset: 1000`. The selected marker opens its popup after a short 50ms delay only if it is not already open; the timer is cleaned up. Popup `autoPan` is disabled to prevent a competing pan from fighting the deliberate centering.

Keep the popup minimal: 220px content width, concern label, title, short description, written status, fallback-image disclosure where needed, and a full-map link. Description overflow is limited to 100px and scrolls within the popup. The link has a minimum 44px target.

Do not turn the popup into a large photo card, duplicate the full detail panel, or add technical metadata unrelated to a citizen's next step. Popups follow the page theme: background and text use the landing tokens, and dark-theme links use `#82b6ff` rather than the darker filled-button blue.

### Dashboard and specialized detail view map pins (WT-84)

Sources: [ReportPhotoMarker.js](components/map/ReportPhotoMarker.js), [ReportPhotoMarker.module.css](components/map/ReportPhotoMarker.module.css), [EcoPinMarker.js](components/map/EcoPinMarker.js), [OperationsMap.js](components/map/OperationsMap.js), [useMapPhotoEvidence.js](components/map/useMapPhotoEvidence.js).

Specialized map views in the authenticated staff portals (Officer & Field Crew: `HotzoneDetail`, `OperationsMap`, and single-report operation views) unify on the modernized photo pin design rather than legacy unanchored flat dots.

1. **Modernized Photo Pin Architecture**:
   - **Dimensions & Anchor**: 50px wide × 58px tall total marker footprint. Base anchor is `[25, 58]` (the bottom-center tip of the downward pointer), and popup anchor is `[0, -62]` (floating cleanly above the frame).
   - **Visual Structure**: 50px circular photo frame with 3px solid `--pin-color` border, 2px white outline, and `box-shadow: 0 3px 12px #00000033`. The photo thumbnail renders via token-safe `SecureImage` with a smooth shimmer skeleton to prevent layout jumps.
   - **Downward Pointer**: Built via CSS `::after` triangle (12px wide × 8px tall, `left: 19px, top: 49px`) colored with `--pin-color`, providing precise needle pinning on coordinates across zoom levels.
   - **Status Badge / Pip**: 24×24px circle anchored at the top-right corner (`right: -4px, top: -3px`) with a 2px white border, filled with `--pin-color`, displaying a dedicated Lucide icon matching the report lifecycle state:
     - `unresolved`, `submitted`, `pending`: `AlertCircle` with tone `--error` (`#d32f2f`)
     - `in_progress`: `Clock3` with tone `--warning` (`#b45309`)
     - `resolved`: `Check` with tone `--success` (`#2e7d32`)
     - `waiting_for_feedback`: `MessageSquare` with tone `--info` (`#0369a1`)
     - `pending_owner_consent`: `LockKeyhole` with tone `--info` (`#0369a1`)
     - `closed`: `CheckCheck` with tone `--muted` (`#59636e`)
     - Unknown / fallback: `HelpCircle` with tone `--muted` (`#59636e`)
   - **Selection Highlight**: `outline: 3px solid #0052cc`, `box-shadow: 0 0 0 6px #0052cc33, 0 4px 16px #00000033`, and `zIndexOffset: 1000`.

2. **Detail View Consistency**:
   - **`OperationsMap`**: Defaults `modern = true`, automatically passing `photoPins={true}` and the unified `#0052cc` route color to `CrewTaskLayer`.
   - **`HotzoneDetail` (`/dashboard/officer/hotzone-intel/[id]`)**: Renders `EcoPinMap` with `photoPins={true}` so officers inspecting clustered constituent reports see immediate photographic evidence and status badges rather than flat colored dots.
   - **Single-Report Operation Detail (`/dashboard/field-crew/operations/[id]/[report_id]`)**: Enables `photoPins={true}` on the static map view.
   - **Shared Map Grid (`/dashboard/(shared)/map-grid`)**: Passes `photoPins={true}` to both `EcoPinMap` and `CrewTaskLayer`.
   - **Evidence Loading Safety**: `useMapPhotoEvidence` queries photo evidence for all reports whose location precision is not `'approximate'`, preserving privacy for private-property reports while ensuring internal task and cluster reports reliably resolve images. `ReportPhotoMarker` and `EcoPinMarker` safely fall back to preloaded `report.photo_url` / `report.image_url` / `report.image` attributes.
   - **Fallback Marker**: `createEcoPinIcon` aligns with the unified status palette (`error`, `warning`, `success`, `info`, `muted`) whenever photo rendering is disabled or unsupported.

## 10. SWMO photo story

Source: [LandingPage.js](components/landing/LandingPage.js) and the community styles in [LandingPage.module.css](components/landing/LandingPage.module.css).

### Context and assets

The section label is “SWMO field crews in action.” The heading is “From reports to response.” Supporting copy names Pasig's Solid Waste Management Office and describes collection and street-clearing work.

These are editorial photographs of SWMO field work. They do not establish that a specific live EcoPin report caused the pictured response. Do not introduce report IDs, dates, locations, citizen identities, or completion claims that the photos do not establish.

| Project asset | Supplied source filename | Use |
| --- | --- | --- |
| `public/images/community/street-cleanup.jpg` | `800115217_1436713281719141_1777894718904852379_n.jpg` | Large lead image of roadside waste collection |
| `public/images/community/neighborhood-team.jpg` | `821523241_3378548689015049_2398023452438630577_n.jpg` | Supporting crew photo |
| `public/images/community/working-together.jpg` | `821486927_1735060638626216_1608732792607754027_n.jpg` | Supporting bulky-debris photo |

Three supplied photos are used; using every attachment is not a requirement. Preserve the workers and useful context in crops. Do not edit the scene into an unrelated cleanup narrative.

### Editorial layout

Desktop uses a `1.6fr 1fr` composition: one tall lead image and two stacked supporting images, with 24px gaps. The lead minimum height is 520px, reducing to 432px at tablet widths and 360px on mobile. Supporting images use aspect ratios 2.15, then 1.7, then square on mobile.

Mobile places the lead first, followed by two supporting squares in a two-column row. Captions remain visible, readable, and attached to their images.

Use Next.js `Image` with `fill`, responsive `sizes` (65vw lead / 35vw support on desktop and 100vw on mobile), meaningful alt text, and default lazy loading. Frames use cover cropping and 16px radii. The lead crop is centered at 54%.

The lead caption sits over a gradient from transparent to `#101e2bd9`, with white text. Desktop padding is 80px 32px 32px; mobile is 64px 24px 24px. The lead caption headline is 28px, or 24px on mobile, at weight 500.

### Interaction

Supporting images scale to 1.04 on hover; the lead scales to 1.08. Image transforms take 1 second with `cubic-bezier(0.16, 1, 0.3, 1)`. Figures lift 8px with a subtle drop shadow over 500ms; the lift uses `cubic-bezier(0.22, 1, 0.36, 1)`. The lead caption's bottom padding grows to 40px.

Keep clipping inside the frame so zoom does not shift surrounding layout. These figures are editorial content, not fake buttons; do not add keyboard stops or imply a click action unless a real action is implemented.

## 11. App showcase, guide, and supporting sections

### Promise strip and About

The promise strip uses three icon-and-copy pairs separated from the next section by a quiet border. These are service characteristics, not statistics: “Rooted in Pasig,” “Reviewed reports,” and “Made for citizens.”

About uses an explanatory column beside two compact feature cards and a full-row green community note. The cards offer map and gallery paths; the note reinforces shared care without inventing impact numbers. Cards use a soft surface, 24px padding, 16px radius, and a 44px icon tile.

### Android showcase

The showcase uses a soft 1280px-wide surface, a two-column layout, 64px padding/gap, and 24px radius. One side is an illustrative phone; the other has the section label, heading, explanation, three benefits, download action, direct-APK note, and installation help.

The benefits are adding a photo and location, describing the issue in one's own words, and tracking reports. Keep the copy aligned with actual Android capabilities. Do not claim iOS availability, an app-store listing, offline functionality, a fixed file size, instant response, or guaranteed cleanup.

The phone is a CSS illustration, named “Illustration of the EcoPin mobile reporting app.” It is not a live application, a form, or a verified product screenshot.

- Desktop phone: 232 × 464px, 7px `#253040` frame, 36px radius, `-5deg` rotation.
- Mobile phone: 190 × 420px, with the map area reduced to 160px.
- Components: camera cutout, brand header, static `pasig.svg` map, static location pins, report prompt, and home indicator.
- Decorative orbit: subdued circular borders behind the phone.
- The illustration's tiny labels stay inside the illustration; they are not the page's reading-text standard.

Use a native `download` link for the APK. Say “Free Android app · Direct APK download,” and link installation help to `/downloads`. Do not trigger an APK download merely by scrolling to the showcase.

### Citizen guide and closing

The guide is an ordered list, not three unrelated decorative cards:

1. See it. Capture it.
2. Put it on the map.
3. Send it. Stay updated.

Display 01–03, recognizable icons, top dividers, short headings, and plain-language instructions. Desktop uses three columns with 48px gaps; mobile uses one column with 24px gaps.

The green guide note explains that reports are reviewed before becoming public and asks citizens to avoid including other people's personal information. Keep this note near the instructions.

The closing green band repeats the app action with “A better Pasig begins with the people in it.” The footer stays simple: existing logo, short tagline, Map, Gallery, Citizen guide, and “EcoPin · Pasig City.”

## 12. Scrolling, animation, and interaction

Source: [useLandingMotion.js](components/landing/useLandingMotion.js).

### Current motion policy

The landing renders `data-motion="full"` and enables motion by default. The old `ecopin-motion` preference does not control this page, and there is no animation preference button in the current UI. The current implementation also does not suppress these entrances when the operating system requests reduced motion.

Record this behavior explicitly rather than claiming reduced-motion compliance. Reintroducing a user motion preference would be a product change requiring an intentional update to this contract and its browser assertions.

### Smooth scrolling

Use the existing Lenis dependency only while the landing is mounted:

| Option | Value |
| --- | --- |
| `autoRaf` | `true` |
| `lerp` | `0.075` |
| `smoothWheel` | `true` |
| `anchors` | `true` |
| Nested-scroll prevention | Elements inside `.leaflet-popup` |

Import the library's CSS. Add the `ecopin-smooth-scroll` class to the document while active and set native `scroll-behavior: auto` in that scope to avoid two competing smooth-scroll systems.

The easing should be perceptible without making the page feel detached from the wheel. Native scrolling inside popup descriptions must remain available. Do not initialize duplicate scrolling instances or extend the landing's scrolling behavior into the full map, gallery, or role pages.

### One-time staggered entrances

Reveal targets are explicitly marked with `data-reveal`. Use a Web Animations API entrance:

| Property | Value |
| --- | --- |
| Observer threshold | 0.12 |
| Start | Opacity 0.15, `translateY(24px)` |
| Finish | Opacity 1, `translateY(0)` |
| Duration | 820ms |
| Easing | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Delay | Numeric `data-reveal` value, commonly 0, 100, or 200ms |
| Fill | `both` |

Prepare only initially below-fold targets with opacity 0 and a 24px downward offset. The hero remains readable immediately. Content that is already on screen may still animate, but is not hidden while waiting for initialization.

On first intersection, set `data-revealed="true"` and unobserve the target. After finishing, commit visible styles and cancel the completed animation object. Components stay visible when scrolling back up; they do not replay on each reentry. A fresh page mount creates a new entrance lifecycle.

Apply reveals to meaningful groups: hero copy, About introduction/cards/note, story heading/photos/footer, phone/copy, guide heading/steps, and closing content. Stagger siblings, not every word. Do not animate the whole live map or repeatedly move report pins during page scrolling.

### Cleanup and visibility

On leaving the landing, stop Lenis before destroying it, disconnect the observer, cancel active animations, remove temporary inline styles and reveal flags, and remove the document class. This prevents leftover velocity/timers from affecting the next route.

Static content is visible before the hook initializes. A focused descendant forces its reveal wrapper visible using `:focus-within`; keyboard users must not focus a hidden link.

A full-page screenshot taken without scrolling can include intentionally prepared, unrevealed below-fold content. Visual review must scroll each section into view and let its entrance settle before judging visibility.

Buttons and text links use 200ms color/background transitions. Use the explicit photo and navigation transitions described above. Do not add continuous bobbing, forced scroll snapping, full-screen wipes, or excessive scroll-linked parallax.

## 13. Responsive layout

Source: the cascade in [LandingPage.module.css](components/landing/LandingPage.module.css). Later mobile rules intentionally override earlier defaults; document the final computed behavior.

| Breakpoint | Changes |
| --- | --- |
| Up to 1280px | Reading-section side margins 48px; showcase margins 24px; About and navigation gaps tighten |
| Up to 1024px | Header padding 24px; navigation gaps 16px; showcase padding 48px 32px and gap 32px; photo proportions tighten |
| Up to 767px | Header/menu/spacer use mobile layout; hero/map offset uses 76px; sections stack; guide becomes one column; showcase copy precedes phone; rail becomes compact |
| Below 375px | H1 38px; hero actions stack; feature cards become one column; auxiliary desktop breaks disappear |

### Space for the rail

The rail is fixed, so the content must reserve room for it. Do not simply place it over text.

At tablet widths, About, guide, and promise strip use a 104px right margin; the showcase uses a 96px right margin; the story uses 104px right padding.

On mobile the rail sits 8px from the right edge with 4px padding and no inter-item gap, while maintaining 44px targets. Reading sections reserve approximately 72px on the right through their final margins/padding. The closing band and footer also reserve right space.

The mobile Android action uses compact 12px padding and 13px type; its trailing arrow is hidden to avoid overflow. The phone is reduced rather than clipped. The photo story stacks the lead above two supporting squares.

The hero map stays full width even though later reading content reserves a rail gutter.

### Viewport checks

Check widths 320, 768, 1024, 1440, and 1920px, including tall pairs 320 × 900, 768 × 1366, 1024 × 900, 1440 × 1200, and 1920 × 1500.

Required outcomes: no horizontal overflow, no map side gutters, no uncovered bottom strip on tall screens, no rail over reading text, no clipped attribution, no overlapping toolbar/hero actions, and usable controls in both themes.

## 14. Accessibility and content integrity

These are quality constraints and current behavior, not a blanket certification of the entire website.

- Use landmarks, one H1, logical headings, labeled sections, and a real ordered reporting guide.
- Keep “Skip to content” as the first keyboard destination and visibly reveal it on focus.
- Provide meaningful photo alt text; keep decorative images/icons from repeating nearby text.
- Give icon-only controls accessible names and show rail tooltips on keyboard focus.
- Hide and make the inactive navigation inert; do not leave duplicate links in tab order.
- Use labeled select-only comboboxes with associated IDs, expanded/selected state, keyboard selection, and an accessible listbox.
- Provide visible focus outlines: 3px in the blue token with a 4px offset for landing links, buttons, and selects.
- Keep map control actions reachable and let users scroll past the map without wheel-zoom capture.
- Use written status alongside colored pips. Never communicate report state through color alone.
- Preserve attribution and data-source disclosures.
- Maintain readable line lengths and adequate text contrast in light and dark themes.
- Preserve content visibility before motion initialization and when focusing a reveal group.

Use 4.5:1 for ordinary text and 3:1 for large text and essential control boundaries as contrast verification targets. Test actual combinations after changing tokens, transparency, or image overlays.

Primary actions are at least 48px high; map buttons, rail controls, account controls, dropdown buttons/options, and many text actions have 44px targets. Verify actual rendered targets rather than making a blanket accessibility certification.

The current full-motion policy is described in Section 12. The browser checks do not constitute a complete accessibility audit, reduced-motion compliance, or legal/government certification.

### Copy and truthfulness

Write directly to citizens: “Neighborhood,” “What’s happening,” “Open full map,” and “Try again.” Avoid internal database fields, acronyms without explanation, staff workflow terminology, or promotional superlatives.

Use reviewed-report wording accurately. An empty view is not evidence that a neighborhood has no environmental concerns. Editorial photos are not live incident evidence. Category photos are illustrations. The phone drawing is an illustration. Counts are bounded to the current map query. Keep these distinctions intact.

## 15. Implementation boundaries and performance

### Ownership

| File | Owns |
| --- | --- |
| [app/page.js](app/page.js) | Home route and landing metadata |
| [LandingPage.js](components/landing/LandingPage.js) | Section composition, copy, actions, editorial assets |
| [LandingPage.module.css](components/landing/LandingPage.module.css) | Landing tokens, geometry, surfaces, responsive rules, interaction styling |
| [LandingNavigation.js](components/landing/LandingNavigation.js) | Shared destinations, header/rail transition, menu and account presentation |
| [usePublicTheme.js](components/landing/usePublicTheme.js) | Existing public theme observation and toggle |
| [usePublicAccount.js](components/landing/usePublicAccount.js) | Reactive session/account identity |
| [useLandingMotion.js](components/landing/useLandingMotion.js) | Lenis lifecycle and one-time reveals |
| [LandingMap.js](components/landing/LandingMap.js) | Public preview, filters, data states, evidence, selection |
| [PhotoReportMarker.js](components/landing/PhotoReportMarker.js) | Marker instance, icon update, compact popup lifecycle |
| [pinIcon.js](components/landing/pinIcon.js) | Safe photo HTML, cached icons, size, anchors, status and selection |
| [public-pin-layout.mjs](components/landing/public-pin-layout.mjs) | Pure grouping and geographic separation |
| [public-report-page.mjs](lib/api/public-report-page.mjs) | Shared bounded public query |
| [PublicMap.js](app/explore/PublicMap.js) | Preserved full map/gallery experience |
| [public-landing.md](docs/public-landing.md) | Short route/implementation overview |

Use the project's Next.js App Router, React, CSS Modules, Leaflet/React Leaflet, Lucide, and existing Lenis. The landing does not require another animation framework, a second router, or a new map provider.

Keep server metadata in the route wrapper; load browser-only map code dynamically. Preserve the current title, “EcoPin | A cleaner Pasig starts with us,” and an accurate description of public environmental reports and Android reporting.

Use responsive image sizes and lazy loading for below-fold editorial photos. Bound map requests, cancel stale requests, batch/cache evidence, and memoize/cache icons. Use stable report IDs, avoid photo-triggered group remounts, and isolate map behavior from unrelated landing renders.

Keep public projection and private-media protections intact. Do not query private report tables to improve the appearance of a public preview. Do not alter authentication, role access, database schema, or other-role pages as part of a cosmetic landing change.

Read the applicable local Next.js guides before future framework changes, as required by [AGENTS.md](AGENTS.md). Existing unused styling such as old account-name, motion-button, icon-pin, or numeric-cluster selectors does not define current behavior; trace rules to rendered components.

## 16. Regression constraints

These constraints preserve the final design choices and the fixes made during iteration.

| Concern | Required behavior |
| --- | --- |
| Home looks like a report dashboard | Keep the introductory hero and explanatory sections; keep detailed browsing at `/explore` |
| Map or header becomes contained | Both span the viewport; reading-width caps belong to later content |
| Hero fails on tall screens | Preserve viewport-aware minimum height and negative map offset |
| Navigation disappears during reading | Keep fixed hero header and switch to the right icon rail after the hero |
| Header and rail diverge | Derive destinations from one list and preserve their order/labels |
| Sign-in ignores an active account | Subscribe to token changes and render the current account avatar in both presentations |
| Account text crowds navigation | Keep visible account identity avatar-only; retain full accessible name |
| SWMO photos imply random citizen work | Keep SWMO attribution and avoid unsupported incident correlations |
| Entrances are invisible | Prepare below-fold elements before observation and retain the 820ms staggered entrance |
| Animations replay on scrolling up | Reveal once per mount, unobserve, and commit visible styles |
| Old motion preference silently disables the requested effect | Current landing uses explicit full motion; do not silently restore the old toggle or preference dependency |
| Scrolling feels too floaty | Keep the intentional Lenis easing and test actual wheel/anchor behavior |
| Tiles return provider-warning images | Use the working OSM tiles and attribution |
| Photos load into broken or duplicate markers | Use cached HTML icons and stable marker instances, not shared live DOM or photo-keyed group remounts |
| Query order shuffles separated pins | Sort group members by stable report ID |
| Popup fights map centering | Preserve deliberate selection pan and disable popup automatic pan |
| Rail covers mobile copy | Preserve the responsive right gutter |
| Hash navigation scrolls twice or jumps | Use native anchors and one active smooth-scroll owner |
| Editorial imagery becomes live evidence | Keep editorial, category, and report imagery clearly distinguished |
| Styling changes leak into other roles | Keep landing styling scoped and respect public-page boundaries |

## 17. Verification and maintenance

### Repeatable checks

Run from `ecopin-web` after changing landing behavior:

```text
npm test
node --test --test-isolation=none tests/public-pin-layout.test.mjs
npx eslint components/landing app/auth app/explore app/page.js app/landing/page.js app/map/page.js app/gallery/page.js app/mobile/page.js app/mobile-app/page.js
npm run build
node tests/public-landing.browser.cjs
node tests/public-pages.browser.cjs
node tests/public-refinements.browser.cjs
node --test --test-isolation=none tests/explore-url.test.mjs tests/public-gallery.test.mjs
```

The pin-layout tests are a separate command; they are not included in the current `npm test` script. Existing tests cover public queries, private media, response behavior, and report access; the four pin-layout checks cover grouping, radial separation, stable ordering/source immutability, and coincident/invalid locations.

The browser check needs the preview running, Playwright, and an installed Chromium browser. Set `ECOPIN_PLAYWRIGHT_PATH` to a supplied Playwright package directory and `ECOPIN_CHROMIUM_PATH` to a Chromium executable when using workspace-provided tools. `ECOPIN_TEST_URL` optionally overrides the default `http://localhost:4001`.

Browser fixtures use synthetic reports and accounts without changing server data. The check covers account changes and avatar consistency, navigation labels/order and header/rail switching, full viewport width/height and overflow, anchors and menu closure, theme changes, route transitions, empty/error/retry states, photo popups, cluster expansion, one-time entrances, and landing scrolling cleanup. It deliberately exercises the current motion behavior with both an old reduced preference and a system reduced-motion setting.

### Visual and interaction acceptance

- [ ] Inspect all five viewport widths and the tall viewport pairs in Section 13.
- [ ] Inspect both themes, including logo, fade, text, controls, photos, and popup contrast.
- [ ] Drag the map, use keyboard navigation, zoom, change both filters, and reset the view.
- [ ] Select a photo pin; confirm highlight, popup clearance, written status, and full-map action.
- [ ] Select a cluster and confirm member separation and connector lines.
- [ ] Check report loading, empty, unavailable/retry, and absent-photo states.
- [ ] Confirm wheel scrolling moves the page and nested popup scrolling remains usable.
- [ ] Scroll through the sections, observe stagger, then return upward; content stays visible.
- [ ] Confirm header remains fixed in the hero and the rail takes over after it.
- [ ] Confirm mobile menu closes on selection and rail tooltips work on focus.
- [ ] Switch accounts/sign out and confirm the correct account action updates without a reload.
- [ ] Follow map/gallery paths, return with browser history, and check app/guide anchors.
- [ ] Confirm the direct download action and installation-help destination.
- [ ] Check keyboard order, skip link, focus visibility, target sizes, and actual contrast.
- [ ] Confirm SWMO context, descriptive alt text, readable captions, and undistorted photo hover.
- [ ] Confirm no uncaught browser exceptions or leaked scrolling behavior after navigation.

For a documentation-only edit, verify factual correspondence, links, and Markdown structure; a fresh production build is not needed solely to change this file.

When changing a design decision, update the owning source and this contract together. Record the resulting behavior, its reason, and any changed constraint. Do not weaken these rules to describe a regression as an intentional redesign.

## 18. Login page contract

Login uses the public palette and Outfit typography without the main navbar. The top bar contains “Back to EcoPin” linking to `/` and the theme control. The form retains one H1, “Welcome back.” The photo column has no promotional heading, tagline, or “Behind every response” paragraph.

At desktop sizes, a 1280px container with 48px horizontal padding uses two equal columns and a 64px gap. The form is capped at 420px. The photo stretches alongside the form, with a 480px minimum height and 16px corners; the “Explore public reports” link remains below it. Tablet padding and gap are 24px and 48px respectively. Below 768px the form comes first and the photo component does not render, fetch images, or run a slideshow timer; the Explore link remains available.

The slideshow cycles three supplied SWMO editorial photos every eight seconds. Opacity crossfades over 1.6 seconds, with restrained image scaling over eight seconds. Keep the SWMO attribution and photo counter. A named 44px Pause/Play button controls movement. System reduced motion starts it paused and removes transitions; visitors can explicitly play it. Do not misrepresent these editorial photos as evidence for a particular live report.

Keep associated email/password labels, username/current-password autocomplete, native validation, and a named show/hide-password button. Errors use a visible alert in both themes. Submission exposes loading and blocks duplicate submissions. Preserve the personnel-only login policy, Android citizen/field-crew path, workspace redirects, and temporary-token password-change flow. Do not log credentials or invent reset/registration flows.

Sources: [login](app/auth/page.js), [slideshow](app/auth/AuthPhotos.js), and [styles](app/auth/Auth.module.css).

## 19. Explore page contract

### Layout and modes

The canonical implementation is `app/explore`. Map and gallery are modes of one browser: `/explore` and `/explore?view=gallery`. Mode changes preserve report/filter parameters and respond to browser history. Legacy `/map` and `/gallery` redirect while preserving their query parameters.

The shared public header stays at the top. Remove the visible “Explore Pasig” introduction box; retain a screen-reader H1 and conditional report-loading/error feedback. The Map view/Gallery view switch occupies the right side of the map filter bar where Saved Reports formerly appeared. Give both modes explicit labels, icons, and pressed states. Stretch the map/report content to the remaining viewport height, with no bottom submission/export strip.

Saved reports, bookmark controls, export reports, and web submission actions are removed from both Explore modes. Do not restore their storage state, dialogs, filtering, or icons. Public reporting guidance belongs to the Android installation and citizen-guide paths.

### Map and popups

Explore uses the landing's cached photo-pin renderer and batch-evidence endpoint. Maintain secure public media handling, stable report IDs, grouping, and existing viewport filters. Dark mode changes the actual tile layer: its theme key remounts the Leaflet layer so the appropriate CSS class takes effect. Dark tiles are grayscale/inverted with brightness .8 and contrast .9; light tiles have grayscale .3 and contrast .9. Preserve attribution and readable map controls.

Landing and Explore render the same PublicReportPopup: category, 17px Outfit title, description, written status, illustration disclosure where applicable, and a single View report action. Keep the compact 220px content width, theme surface, 8px content gaps, and 44px action. No bookmarks or conflicting popup font/shape overrides. Explore opens the report detail panel; landing links to its canonical public report URL.

The report panel heading is “Reports.” Its sort control uses the shared dropdown with Newest first, By priority, and By status; do not concatenate a crowded “Sort by:” prefix into the value. Details retain readable metadata and written statuses, with secure evidence handling.

### Gallery controls and search

The gallery toolbar separates status/category/priority and mode controls from the search/sort/layout row. Grid and Showcase are labeled buttons in a named group with pressed states and matching icon sizes, 44px targets, subtle borders, and selected surfaces. Wrap controls on narrow screens; the search becomes a full-width row. At 400px and below, sort and layout each take a full row to keep values readable.

Search has a label, a leading search icon, an explicit clear button, and a matching-count status. Normalize case, diacritics, whitespace, and category underscores. Match every query word across public title, description, and category. Cache report search text and defer filtering so typing stays responsive. Do not search private fields. Keep explicit loading/error/retry, empty-search, and truncated-query feedback.

Gallery photo buttons open the new photo viewer; report-title buttons still open details. Category fallback images must say “Category illustration,” never report evidence.

### Photo viewer

Delete the old Inspector layout and state. The replacement is a centered, theme-aware modal card with a readable title, close control, an uncropped contain-fit image stage, Previous/Next photo buttons, photo count, caption, and selectable thumbnails. Show public description, category, written status, report date, and truthful photo source beside the image. Retain View on map and Previous/Next report actions when applicable.

Fetch missing exact-report evidence with cancellation and report-bound resource state. Keep before/after evidence labels. A fallback illustration remains explicitly disclosed; do not infer a resolved status or an incident relationship from a photo. Mobile stacks the picture and information and scrolls within the dialog.

Use useDialogFocus to trap focus, make the background inert, close with Escape, and restore the opener. Arrow keys navigate photos; thumbnails and navigation are real buttons. Loading failures have visible feedback. Public report deep links use the fixed public projection and exclude unreviewed rows; missing/unavailable reports remain explicit.

### Shared dropdowns and transitions

PublicSelect replaces the native OS-highlight menus in the landing filters, gallery filters/sort, and Explore sort. Use Outfit, theme tokens, 12px control/list corners, 8px option corners, 44px targets, and a subtle blue selected/active surface with a checkmark. Support arrows, Home/End, Enter/Space, Escape, Tab, and initial-character selection. Expose combobox/listbox roles, expanded state, active descendant, selected state, and readable labels. Close outside the control; selection restores focus.

Measure available viewport space and open above when needed. Limit list height and scroll only the list, never jump the page while navigating options. Lenis excludes data-native-scroll surfaces as well as Leaflet popups.

PublicLoadingState uses a quiet branded pin and status within the content area. Public pages use short fade/translation entrances rather than a fullscreen wipe. PublicMotion applies a 450ms, 12px page entrance and reduced-motion overrides; Explore fades over 300ms. Do not alter private dashboard loading behavior as part of this scope.

Sources: [Explore wrapper](app/explore/ExplorePage.js), [report browser](app/explore/PublicMap.js), [toolbar](app/explore/GalleryToolbar.js), [mode switch](app/explore/ViewModeSwitch.js), [styles](app/explore/Explore.module.css), [photo viewer](app/explore/PhotoViewer.js), [focus](app/explore/useDialogFocus.js), [popup](components/landing/PublicReportPopup.js), [dropdown](components/ui/PublicSelect.js), [search](lib/public-gallery.mjs), and [URL helper](lib/explore-url.mjs).

## 20. Android installation page contract

`/downloads` is a useful installation-help destination, with the shared public header, reactive account control, theme, and Outfit typography. Visiting it never starts an automatic download. Only the native Download for Android link requests `/ecopin-app-release.apk`; show a download-requested status without falsely claiming installation success.

The desktop layout pairs an introductory heading with a green-tinted download card, followed by three ordered steps and a help section. Keep the reading container at 1184px with 48px horizontal padding; narrow layouts use 24px padding and a single column. The download card uses 24px corners, while steps rely on spacing and thin dividers rather than repeated heavy cards.

Explain downloading the APK, finding it in Downloads, and following Android's installation prompts. Mention that the installation permission can be disabled afterwards. Do not invent file size, version, iOS availability, or automatic-update guarantees. Native details/summary FAQs cover missing files, permission prompts, non-Android devices, and the first report; link to Explore and the landing guide. Summaries have visible focus and 44px targets.

Sources: [downloads](app/downloads/page.js) and [styles](app/downloads/Downloads.module.css).

The refinements browser check verifies feature removals, map theme changes, popup font parity, dropdown keyboard behavior without page jumps, search/layout controls, photo and report navigation, download behavior, mobile layouts, and slideshow timing/pause. Use synthetic browser fixtures; do not mutate production reports to verify visual changes.

## 21. Administrator and officer workspace contract

This section sets the shared visual and behavior contract for administrator and officer web routes, including deep pages and details. It carries the civic EcoPin identity into task-oriented workspaces. It does not redesign the public experience described in sections 1–20 or field-crew pages. A shared route that also serves field crew must retain that role's existing behavior and presentation.

### Route coverage

Apply this contract across the officer command center, map grid, spatial scan, hotzone intelligence and details, operations list/create/details, optimization and run details, reports, metrics, sweeper analytics, and crew management. Apply it across the admin dashboard, Users, system and infrastructure views, optimization settings, sweeper settings, audit logs, and system logs. Shared profile and raw-report routes follow the same shell typography, theme, header, controls, and table rules when rendered for an administrator or officer. Route guards, data access, lifecycle, and existing workflows remain authoritative.

The Users workspace has **Users** and **Create user** tabs. Changing tabs must preserve entered user drafts, validation feedback, and the create form's current state. Switching tabs must not silently submit, reset, or discard the draft.

### Shared ownership and visual language

Use [DashboardShell.module.css](components/layout/DashboardShell.module.css) for workspace tokens, shell behavior, and common page, panel, input, button, focus, and table rules. Use [PageHeader.js](components/layout/PageHeader.js) for page headings and breadcrumbs, [PageTabs.js](components/ui/PageTabs.js) with [PageTabs.module.css](components/ui/PageTabs.module.css) for tab strips, and [useTablePageSize.js](components/ui/useTablePageSize.js) for viewport-aware table pagination. Make cross-page changes in these shared owners; do not create slightly different page-local versions of the same pattern.

The visual direction is civic, friendly, and calm: Outfit typography, neutral charcoal dark surfaces, quiet borders, restrained elevation, and meaningful semantic status colors. Dashboard theme tokens are scoped to the shell and must not redefine the public landing palette globally. Use the semantic shell tokens (`--surface`, `--surface-elevated`, `--background`, `--border`, `--text-primary`, `--text-secondary`, `--workspace-link`, `--success`, `--warning`, `--error`, and `--info`) instead of scattered theme-specific values.

- Primary actions use `#0052cc` with white text in both themes; hover may use `#003d99`.
- Links and non-filled blue emphasis use `#0052cc` in light mode and `#82b6ff` in dark mode through `--workspace-link`.
- Dark surfaces remain neutral charcoal. Do not shift them to blue-gray slate.
- Status colors are readable display colors: success `#2e7d32` / `#83cba0`, warning `#b45309` / `#fcd34d`, error `#d32f2f` / `#fca5a5`, and information `#0369a1` / `#82b6ff`. Pair color with written status; never change workflow meaning to fit a color.
- Use sentence case. Reserve monospace for identifiers or actual machine-formatted values. Avoid all-caps tracking, neon status overrides, decorative slashes, gradients, and heavy shadows.

### Page frame, header, and controls

Use a consistent page frame with 24px desktop padding, 16px narrow-screen padding, and a 20px vertical gap. Panels use 20px inner padding, a 1px semantic border, a 16px radius, and a theme surface. Inputs and buttons have a 44px minimum height; inputs and menus use 12px corners, dialogs use 24px corners, and primary/secondary actions use the shared pill treatment. Keep captions at least 12px and ordinary body text at 14–16px.

Every page uses the same heading hierarchy and dimensions; do not shrink a heading to make a crowded page fit. The shared header uses a 28px medium-weight title (24px below 768px), 14px subtitle, and 12px breadcrumb. Long titles wrap cleanly. Keep page actions next to the heading where they fit, then wrap them without reducing targets or text size. Never override the shared header with page-local margins, negative offsets, hidden subtitles, or a smaller type scale.

The sticky header preserves its initial top gutter while the workspace scrolls: 24px, or 16px below 768px, measured from the workspace scrollport. Its shared background extension covers that gutter so scrolling content cannot show above the breadcrumb. Keep this inside `PageHeader.module.css`; do not add padding that increases header height or reduces fitted-page capacity.

### Tabs and panel semantics

All workspace tab strips use `PageTabs`. The track has a tinted elevated surface, 1px border, 16px radius, 4px inset, and 8px gap. A selected tab has a surface fill, 1px border, 12px radius, and blue text; each tab has a 44px minimum height. On narrow screens the strip scrolls horizontally without shrinking or wrapping tab labels.

Use the shared tab keyboard behavior: Left/Right Arrow moves between tabs, Home selects the first, End selects the last, and focus follows selection. Keep the tablist named. Each tab's `aria-controls` points to a matching `tabpanel`; each panel names its tab with `aria-labelledby`. Only the active panel is exposed. Preserve focus and panel state when changing tabs.

### Fitted workspaces and natural flow pages

For fitted workspaces at widths of at least 1024px and heights of at least 700px, use the shell's available height with a `.workspace-page` frame. Keep the page header, primary controls, filters, tabs, and pagination visible. Put overflow in the relevant table/list region using `.workspace-scroll`; do not scroll or clip the whole page to fit a dense table. Nested lists may have their own bounded scroll region when needed.

Use `.workspace-page--flow` for pages whose content is expected to grow, including generated proposals, operation details, profile content, and long forms. These pages scroll naturally. At small widths, short window heights, browser zoom, or text enlargement, allow the page to grow and scroll. Never clip controls, compress text, or hide content to simulate a fit. Do not force every record or every detail onto one screen at the cost of readability.

A typical fitted page is structured as follows; the actual content can vary while retaining the shared frame and contained scrolling:

```jsx
<main className="workspace-page">
  <PageHeader title="Reports" subtitle="Review submitted reports" />
  <div className="workspace-fill">
    <section className="workspace-panel workspace-fill">
      <PageTabs ... />
      <FilterBar ... />
      <div className="workspace-scroll" ref={containerRef}>
        <DataTable ... />
      </div>
      <Pagination ... />
    </section>
  </div>
</main>
```

### Tables and viewport-aware pagination

Keep real table semantics. Headers use 13px Outfit, body cells use 14px Outfit with 1.5 line height, and cells use 12px vertical by 16px horizontal padding. The header may remain sticky inside the table viewport. Hover uses the elevated surface while preserving status text and badges. Use an intentionally horizontally scrollable, keyboard-focusable named region when columns cannot fit.

Rows keep natural content height with a 56px minimum for readable, clickable records. Controls or wrapped content can increase that height. Do not set the whole table, `tbody`, or rows to `height: 100%`; do not use tall stretched rows or fake blank rows to fill the screen. Empty states use only the content height they need and explain the next useful action when one exists. Loading and failure states remain explicit.

Attach `useTablePageSize` to the allocated table viewport, with pagination outside that viewport. The helper measures rendered rows and uses `rowHeight` only while rows are unavailable. Pass a stable `resetKey` built from the active filters so an earlier tall row does not reduce capacity after filtering. The visible page capacity should increase on tall fitted monitors and use a readable baseline on smaller/shorter windows. Recompute when the viewport is resized. Clamp the current page after filters, data changes, or a capacity change so it never points past the final page. Keep the scrollbar in the table/list region rather than expanding the entire page.

Sorting uses real buttons and `aria-sort`; pagination has a named control, current-page state, and stable focus. If an entire row opens a detail, provide a visible or screen-reader-accessible button/link and prevent nested actions from also opening the row. Prefer stable record IDs for keys.

All dashboard data tables use `DataTable`, including operation report lists, infrastructure replication, and the spatial trend value disclosure. The canonical styles live in `app/globals.css`; the shell does not override table cells. Keep headers and column structure during loading and empty states. Empty-state rows are excluded from viewport page-size measurements.

WT-83: only rows with `onRowClick` get a pointer cursor and a trailing Details column. Its 44px chevron button appears with the subtle civic-blue row highlight on hover or keyboard focus, and remains visible on touch devices. Nested links, buttons, selects, and other controls retain their own actions and colors. The detail action occupies its own cell rather than covering the title. Reduced-motion preferences remove transitions. Non-navigable user-management and log rows do not advertise detail navigation. Map popup facts use a definition list rather than a layout table.

`tests/table-design.browser.cjs` checks the shared design across officer/admin tables in both themes, narrow-screen scrolling, keyboard detail navigation, and independent nested actions using synthetic data.

### Shared interaction states and accessibility

Make hover, selected, focus, disabled, loading, empty, error, stale, and success states legible in both themes. Use written labels alongside color or icons. Errors and stale data must not look like empty results; offer retry where the operation supports it. Keep form values and validation feedback after recoverable failures. Controls need visible keyboard focus, clear accessible names, and 44px targets. Dialogs preserve modal semantics, Escape behavior, and focus return. Respect reduced motion.

### Acceptance checks

Treat these as required checks for future dashboard UI changes; this list does not assert that they have already passed. Review officer and administrator routes, including deep details and Users/Create user, at `1366×768`, `1280×720`, and `1440×900`, in both light and dark themes. At these desktop sizes, fitted pages keep the header and primary controls visible, with only their designated table or nested-list areas scrolling. Also review widths `320px`, `768px`, and `1024px`, short windows, browser zoom, keyboard-only tab navigation, and enlarged text. Narrow and short layouts must scroll naturally without clipped or compressed content. Check representative loading, empty, error, stale, and success states as well as hover and focus. Keep synthetic fixtures for browser checks; do not mutate live reports or staff records for visual verification.

Public page requirements remain the existing public behavior documented in sections 1–20. The shared shell, tabs, and table patterns above describe implementation ownership and the intended staff target; a listed component or CSS rule is not proof that every route currently conforms. Track route completion and any remaining page-specific work separately in the UI backlog.

## 22. Password recovery and staff feedback

The forced password-change page uses the login palette, Outfit, the same labeled input/password-control anatomy, and a 480px reading container. It shows the server-configured password requirements, mismatch feedback, retained values after rejection, named visibility controls, a real updating state, and a submission lock. Back navigation clears the temporary token immediately; successful change preserves the existing token promotion and workspace destination. No artificial wait, continuous button pulse, blue wipe, or tiny uppercase loading text remains.

Staff notifications announce outcomes. Errors/warnings persist until dismissed; routine information/success may expire after six seconds. Messages wrap within the viewport and include a named 44px dismiss control. Photo deletion uses a themed confirmation that identifies the selected report evidence and irreversible removal; Cancel receives initial focus. The confirmed operation uses the existing endpoint/role conditions.

Shared report/evidence dialogs use native modal stacking plus explicit Tab cycling and opener focus restoration. Closing a nested viewer returns to its report; closing the report returns to its opener. Photo stage backgrounds are intentionally black for uncropped inspection, while report information follows the theme. Viewer actions have 44px targets, written captions/counts, arrows, zoom, and Escape. On mobile, Close and Expand occupy opposite upper corners; details share the remaining height below the photo rather than being clipped. Evidence thumbnails are keyboard buttons. Batch evidence requests can opt into explicit failure reporting; retry distinguishes failed loading from a genuinely empty photo set. Existing callers retain their previous API helper behavior.

These behaviors are verified by `tests/password-recovery.browser.cjs` and `tests/staff-media.browser.cjs` using synthetic staff data. Verification of other page-specific dialogs remains in the backlog.

## 23. Officer analytics

Analytics use Outfit, sentence case, 14px labels and summaries, quiet 16px cards, and wrapping actions. Group charts by the question they answer. Every chart has a named canvas and native written values with units; the written legend remains useful without color or canvas access. Chart axes follow the theme and avoid decorative animation. Keep current report status separate from review state. The native progress indicator includes its denominator and uses civic blue.

Report analytics uses shared **Overview**, **Report breakdown**, **Trends**, and **Feedback** tabs. Overview shows the eight summary figures in four desktop columns, with calculation notes and the detailed progress bar in a disclosure. Report breakdown holds current categories/statuses, Trends holds creation-week volume/outcomes, and Feedback holds resident satisfaction. Keep default summary content in the laptop viewport; detailed panels can scroll as their real values and legends grow. Cards retain readable chart stages and written values. Inactive chart panels remain mounted, absolutely positioned, and `visibility: hidden` so their canvases remain measurable for PDF export before their tabs are opened. Using `display: none` produces zero-size canvases and breaks that export. Sweeper settings similarly uses **Service deadline** and **Work time estimates** tabs, with all per-issue save controls in the latter.

Report analytics identifies the creation-date coverage of the loaded public projection. Creation-week outcome percentages describe current states of those cohorts, rather than claiming past daily performance. Group year-boundary dates under the correct week year. Invalid timestamps cannot create fictitious chart dates or negative/NaN durations. Preserve the existing resolution/closure/latest-update fallback, explain it, and identify the 48-hour age indicator separately from configured SLA policy. Satisfaction comes from its separate service and has independent failure/retry feedback; its scope can differ from public-report coverage.

Failed report requests show a retryable error rather than an empty dashboard. Retain last-loaded figures during refresh failures, identify them as stale, and disable exports until a current successful load. PDF exports include source scope, metric values, chart-value tables, and available charts with readable theme backgrounds. Download feedback says the browser download started; it never claims a file was saved successfully on the user's device.

Sweeper analytics separates the current global flagged-report snapshot from date-bounded report/task totals. Explain the source date field and distinguish estimated route time from measured response duration. Zero samples are an honest empty observation, not proof of 100% compliance. Missing values stay unavailable. The existing service has no daily series and ignores region, so do not generate trends or offer a working regional filter. The supported CSV uses the applied full local-day bounds; unsaved date drafts cannot silently change an export. Its independent live map has an explicit date-scope disclosure and loads on opening.

Preserve officer route guards and server permissions. The current sweeper endpoints authorize administrators while their page is an officer route; show the permission restriction and an existing report-analytics destination. Do not grant extra access or alter backend policy to make the UI appear operational. Verification uses intercepted synthetic data, never live staff mutations. See `tests/report-analytics.browser.cjs`, `tests/sweeper-analytics.browser.cjs`, and the shared backlog for remaining live and cross-platform acceptance.

## 24. Admin sweeper settings

Sweeper settings retains the service-level deadline and per-issue cleanup work-time estimates used by the current lifecycle and dispatch planner. Remove the global shift-duration editor and CSV importer. Crew schedules and capacity belong to Optimization Settings, linked from the page; keep the existing settings route and administrator guard.

Use a compact, divided settings surface with explanatory copy beside labeled controls, Outfit typography, sentence case, theme-aware surfaces and readable status text. Inputs have 12px corners, actions have 44px targets, and the layout stacks on narrow screens without a horizontally scrolling table. Each issue type has an independent save action; successful saves update the saved baseline and disable unchanged actions. Failure retains edits and announces the backend validation message through the shared notification.

Loading hides forms until configuration is available. A failed load shows an explicit Retry action. Deadline changes greater than 25% use the shared native modal with initial Cancel focus, Escape dismissal, and focus return. Confirm sends the backend confirmation flag; Cancel sends no write. The server remains authoritative for relationships between maturation periods and the SLA threshold. Policy changes must not be presented as rewriting historical deadlines. The page does not alter role access, database schema, or crew scheduling.

Verification: `npm run test:sweeper-settings` and `node tests/sweeper-settings.browser.cjs` (workspace Playwright paths may be required). Browser checks intercept synthetic administrator data and cover retry, save/cancel/confirm, retained edits on rejection, both themes, and 320/768/1024/1440px layouts.
