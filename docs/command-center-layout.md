# Officer Command Center

The Command Center fills the dashboard viewport: a compact heading and optimization
action, four operational metrics, then Active Targets, Action Queue, and Critical
Hotzones. All three panels remain visible. Desktop uses three columns; below 900px
the panels share three equal-height rows beneath a two-column metric strip.

Each panel measures the space and its visible rows to choose a page size. Previous
and Next replace scrolling; View all retains access to the dedicated full-list page.
Targets and queue pagination cover their complete loaded lists; Critical Hotzones
retains the three highest-priority clusters. Metric calculations and data loading
are unchanged. Links replace mouse-only clickable containers.

Short compact screens place panel navigation beside the heading and omit metric
helper captions. Metric labels, counts, all three sections, and actions remain
visible. Keep the dashboard's Outfit font, semantic theme tokens, 4/8px spacing,
restrained borders, and 44px control targets.

Run `node --test tests/command-center.browser.cjs` with Playwright in NODE_PATH and
a local server at http://localhost:4001 or ECOPIN_TEST_BASE_URL. The test uses
synthetic sessions/data and checks populated/empty states, pagination, all section
bounds, overlapping controls, and page/panel/list overflow. Screen sizes include
1366×768, 1280×720, 1366×600, 1024×768, 768×844, 390×667, and 320px-wide phones.
