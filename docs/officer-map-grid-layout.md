# Officer Map Grid Workspace

The Officer Map Grid page preserves PageHeader's title, subtitle, and breadcrumbs. It fills the dashboard viewport: the interactive Leaflet report map and a responsive map controls and legend sidebar fit side-by-side on desktop without causing outer page scrolling.

## Design and layout rules

- **Viewport fit:** The workspace fits the viewport at desktop, laptop, tablet, and mobile breakpoints (1440×900, 1366×768, 1280×720, 1024×768, 768×844, 390×667, 320px). Outer `#workspace-content` has no vertical or horizontal scrollbars.
- **Header preservation:** PageHeader preserves the civic visual design—displaying breadcrumb navigation (`Officer / Map grid`), the "Map grid" heading, subtitle, subtle bottom divider border, active filter count badge, and the "Hide controls" / "Show controls" toggle button directly inside the header actions.
- **Desktop (≥ 900px):** Map panel and Map Controls sidebar share the workspace side-by-side (`minmax(0, 1fr) 340px`). The controls sidebar can be toggled via "Hide controls" / "Show controls" located in the header to maximize map viewing area.
- **Compact screens (< 900px):** A segmented view switcher (`Map` / `Controls & filters`) allows quick switching between full map inspection and full control tuning, while the header toggle button remains accessible and functional.
- **Controls & Legend organization:**
  - 4 map layer toggles (Report pins, Report clusters, Heatmap, Cleanup task pins) arranged in a responsive 2-column grid with 44px minimum touch targets.
  - Report filters with 12px input corners, labeled Location / Area, Report status, and Issue type dropdowns, and an explicit Reset button disabled when inactive.
  - Report pin legend and Cluster legend laid out in a 2-column grid with clear icon indicators and written status labels.
  - Controls body features a compact, high-density layout designed to fit fully within the card without vertical scrolling.
- **Searching capabilities parity with public map grid:**
  - Interactive on-map search bar powered by `MapSearch` supporting multi-word queries across civic street addresses, barangays, landmarks, issue types, and IDs.
  - Comprehensive curated Pasig landmark directory (`PASIG_LANDMARKS_AND_ADDRESSES`) encompassing civic landmarks (City Hall, Mega Market, Cathedral, PLP, RHS, Medical City, RAVE, etc.), all 30 official barangays, and major avenues.
  - Dynamic forward address geocoding search (via Photon API) enabling officers to type arbitrary street addresses and locations in Pasig City.
  - High-visibility pulsating searched location pin with detailed popup showing GPS coordinates, category, civic address, and dismissal options.
  - Quick Points of Interest / Hotspot pill trigger with cluster count badge, formatted landmark proximity, and report counts.
  - Category tabs (`All`, `Landmarks & Addresses`, `Hotspots`, `Reports`, `Tasks`) allowing instant filtering of search results.
  - Direct location and area filtering via `MAP_LOCATIONS` (Ortigas Center, San Antonio, Kapasigan Plaza, Ugong North, Rosario / Tramo, Maybunga Riverbank) both on the map and in the controls sidebar.
  - Interactive selection focusing pins, flying the camera to target coordinates, and opening detail popups automatically.
- **Design system adherence:** Adheres to `DESIGN.md` Section 21: Outfit typography, civic blue actions (`#0052cc`, hover `#003d99`), semantic status colors, 12px input corners, 16px container panels, pill action buttons (9999px), and minimum 44px interactive touch targets.

