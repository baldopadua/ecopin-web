# Spatial scan layout

The officer's Spatial Scan is a viewport-height workspace. Desktop shows the map
and a 320px hotspot panel side by side, with forecast/layer controls above and
historical playback below. Hotspots use measured row heights and pagination,
keeping the list and its navigation within the available height.

Below 900px, Map and Hotspots buttons switch the visible workspace panel. Below
1024px the page subtracts the dashboard's 64px mobile header. Short windows and
enlarged text may scroll to preserve access: the minimum page height is 640px on
desktop and 720px in the compact layout.

Use the dashboard's Outfit typography, theme tokens, 4/8px spacing, restrained
borders, and 44px control targets. Preserve the forecast/source caveat, risk labels,
attribution, and loading/error/empty states. Public landing composition rules in
DESIGN.md do not apply to this operational workspace.

Browser verification: `node --test tests/spatial-scan.browser.cjs`, with Playwright
available through NODE_PATH and a local app at http://localhost:4001 (or
ECOPIN_TEST_BASE_URL). Fixtures mock sessions and forecasts; map tiles are blank
test images. The test checks 1366×768, 1280×720, 1024×768, 1440×900, and compact
widths of 768px, 390px, and 320px at 844px height.
