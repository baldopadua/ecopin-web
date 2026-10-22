# Hotzone Intel Workspace

The Hotzone Intel page preserves PageHeader's title, subtitle, and breadcrumbs. It fills the dashboard viewport: header, compact search and filter controls, a paginated hotzones data table (5 rows per page with compact row height), and pagination controls fit within the screen without causing outer `#workspace-content` scrolling.

## Design and layout rules

- **Viewport fit:** The workspace fits the viewport on all standard desktop, laptop, tablet, and mobile screens (1440×900, 1366×768, 1280×720, 1024×768, 768×844, 390×667, 320px). `#workspace-content` has no vertical or horizontal scrollbars.
- **Header preservation:** PageHeader displays the "Hotzone Intel" title, subtitle ("Spatial intelligence and cluster mapping"), and breadcrumb navigation (`Dashboard / Hotzone Intel`).
- **Static header integration:** Header uses `position: static !important; margin: 0 !important; padding: 0 !important; border: 0 !important; background: transparent !important;` so it does not float stickily over the content or push content down.
- **Filter bar:** Compact non-sticky filter bar (`sticky={false}`) with 38px inputs, 14px border radius, and sentence-case labels (`Pollution type`, `Severity`, `Status`).
- **Compact data table:** 5 rows per page (`itemsPerPage = 5`) with compact vertical cell padding (6px 12px) to guarantee that header + filters + table + pagination fit within 720p/768p viewports with zero overflow.
- **Status and severity design:** Adheres to DESIGN.md Section 21: sentence-case severity badges (`High`, `Medium`, `Low`) using semantic colors (`--error`, `--warning`, `--info`), and readable status labels (`Unresolved (New)`, `In progress (Scheduled)`, `Resolved (Completed)`), avoiding neon overrides and uppercase badge tracking.
