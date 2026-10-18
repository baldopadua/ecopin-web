# Officer Operations Workspace

The Officer Operations page (`/dashboard/officer/operations`) preserves PageHeader's title, subtitle, and breadcrumbs. It fills the dashboard viewport: header with standardized action button, compact search and status filter controls, a paginated cleanup tasks table (5 rows per page with compact row height), and pagination controls fit comfortably within the screen without causing outer `#workspace-content` scrolling.

## Design and layout rules

- **Viewport fit:** The workspace fits the viewport on all standard desktop, laptop, tablet, and mobile screens (1440×900, 1366×768, 1280×720, 1024×768, 768×844, 390×667, 320px). `#workspace-content` has no vertical or horizontal scrollbars.
- **Header preservation:** PageHeader displays the "Cleanup Operations" title, subtitle ("Track and manage cleanup task operations across hotzones"), and breadcrumbs (`Dashboard / Operations`).
- **Static header integration:** Header uses `position: static !important; margin: 0 !important; padding: 0 !important; border: 0 !important; background: transparent !important;` so it does not float stickily over the content or push content down.
- **Standard action button:** The "Create Cleanup Task" button adheres to DESIGN.md Section 21:
  - Solid civic blue action color (`#0052cc`, hover `#003d99`, focus `#002966`).
  - White text with 600 semi-bold weight.
  - Standard pill shape (`border-radius: 9999px`).
  - Minimum 44px touch target height with adequate padding (`10px 20px`).
  - Accompanied by standard 18px `Plus` icon, with smooth hover transition (`transform: translateY(-1px)` and subtle shadow).
- **Filter bar:** Compact non-sticky filter bar (`sticky={false}`) with 38px inputs, 14px border radius, and sentence-case labels (`All statuses`, `Pending`, `Assigned`, `In progress`, `Completed`, `Cancelled`).
- **Compact data table:** 5 rows per page (`itemsPerPage = 5`) with compact vertical cell padding (6px 12px) and 16px panel border-radius to guarantee that header + filters + table + pagination fit within 720p/768p viewports with zero overflow.
- **Status badges:** Adheres to DESIGN.md Section 21: sentence-case badges (`Pending`, `Assigned`, `In progress`, `Completed`, `Cancelled`) using semantic design tokens (`--warning`, `--info`, `--primary`, `--success`, `--muted`), avoiding obsolete neon and uppercase styling.
