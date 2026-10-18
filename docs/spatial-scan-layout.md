# Spatial scan layout

The officer's Hotspot Forecast (Spatial Scan) is a viewport-height workspace that fits entirely within the screen without causing outer `#workspace-content` scrolling.

## Design and layout rules

- **Viewport fit:** The workspace fits the viewport on desktop, laptop, tablet, and mobile screens (1440×900, 1366×768, 1280×720, 1024×768, 899px). All map panels, overview metrics, HUD controls, and feed items adapt without vertical page scrollbars.
- **Header preservation:** `PageHeader` preserves the civic visual design—displaying breadcrumbs (`Officer / Spatial scan`), the "Hotspot forecast" heading, subtitle, a bottom divider border (`1px solid var(--border)`), and header action buttons (`Saved forecasts`, refresh, and status badge pill) styled as standard DESIGN.md pill buttons.
- **HUD & Overview:** Compact horizon selectors (`7d`, `30d`, `90d`), layer toggles (`Forecast map`, `Today's reports`), and summary metrics.
- **Workspace layout:**
  - Desktop shows the interactive map and a responsive 340px hotspot panel side by side (`minmax(0, 1fr) 340px`).
  - Hotspot items use measured row heights and pagination (`DynamicFeed`), keeping the list and navigation within available height.
  - Below 900px, a compact segmented switcher (`Map` / `Areas`) allows toggling between map and feed.
- **Design system adherence:** Adheres to `DESIGN.md` Section 21: Outfit typography, civic blue actions (`#0052cc`), 12px panel borders, pill action buttons (9999px), and 44px minimum interactive targets.

Browser verification: `node --test tests/spatial-scan.browser.cjs`, with Playwright
available through NODE_PATH and a local app at http://localhost:4001 (or
ECOPIN_TEST_BASE_URL). Fixtures mock sessions and forecasts; map tiles are blank
test images. The test checks 1366×768, 1280×720, 1024×768, 1440×900, and compact
widths of 768px, 390px, and 320px at 844px height.
