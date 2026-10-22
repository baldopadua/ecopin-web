# Officer Reports Directory Layout

The Officer Reports Directory page provides comprehensive access to raw environmental reports, AI verification status, and one-click dispatch task creation. It fits entirely within the viewport without outer page scrolling.

## Design and layout rules

- **Viewport fit:** The layout fits strictly inside the dashboard viewport across desktop, laptop, tablet, and mobile breakpoints (1440×900, 1366×768, 1280×720, 1024×768, 899px). Outer `#workspace-content` has no vertical or horizontal scrollbars.
- **Header preservation:** `PageHeader` preserves the civic visual design—displaying breadcrumbs (`Officer / Reports`), the "Reports directory" heading, subtitle, and a bottom divider border (`1px solid var(--border)`).
- **Filter bar:** A compact non-sticky filter bar with 38px inputs, 14px container radius, search input, dropdowns for Issue type, Report status, and Review status, and a Reset action.
- **Table workspace:**
  - Standard `DataTable` container with `overflow: auto` and 14px border radius.
  - Exactly 5 items per page (`itemsPerPage = 5`) to comfortably fit within standard laptop and desktop screens without pushing pagination out of view.
  - Compact row padding (`6px 12px`), 13px readable Outfit typography, and subtle zebra/hover treatment.
  - SLA overdue indicators styled with subtle warning/error badges (`AlertTriangle` / `Clock`).
  - Interactive pill cluster IDs linking directly to Hotzone Intel, and standard primary Dispatch action buttons (`min-height: 36px`, pill shape, `#0052cc`).
- **Pagination:** Clean, compact pagination footer (`Pagination`) keeping the total item count and page numbers readily accessible.
- **Design system adherence:** Adheres to `DESIGN.md` Section 21: Outfit typography, civic blue actions (`#0052cc`), 14px container borders, pill action buttons, and minimum touch target requirements.
