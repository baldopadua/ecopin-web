# Officer Optimization Center Layout

The Officer Optimization Center (`/dashboard/officer/optimization`) preserves PageHeader's title ("Optimization"), subtitle, and breadcrumb navigation. It features an accessible, tabbed layout that completely eliminates outer `#workspace-content` scrolling and fits within standard desktop and laptop screen heights (including 1366×768 and 1280×720).

## Design and layout architecture

- **Viewport fit & No outer scroll:** `#workspace-content` remains overflow-free (`overflow: hidden; height: 100%`). Content fits naturally inside the screen boundaries.
- **Header preservation & static integration:** PageHeader displays "Optimization Center", description, and breadcrumbs (`Dashboard / Officer / Optimization`). It is positioned statically with zero margins, preventing sticky overlap or content occlusion.
- **Tabbed navigation:** An accessible `role="tablist"` navigation divides the screen into two focused modes:
  - **Dispatch settings (`activeTab === 'dispatch'`):** The default view containing target focus selection (`TemplateSelector`), transport mode heuristics, collapsible advanced parameters (`OptimizationSettings`), and the primary route proposal generation action. Any generated draft proposals and route cards are contained within the view's dedicated scroll area.
  - **Previous runs (`activeTab === 'previous'`):** Historic optimization runs displayed in an integrated, scrollable data table with compact cell padding, clear date/weather/traffic/status metadata, pill status badges, and page controls (5 items per page) to prevent viewport stretching.
- **Accessible keyboard interaction:** Tab triggers adhere to WAI-ARIA tab pattern (`role="tab"`, `aria-selected`, `aria-controls`, `tabIndex`).
- **Standardized actions and styling:** Aligned with `DESIGN.md` Section 21:
  - Civic blue actions (`#0052cc`, hover `#003d99`).
  - Standard pill shape (`border-radius: 9999px`) on buttons and status badges.
  - 44px minimum target heights on interactive controls.
  - 12px input corners and 16px panel corners.
  - Sentence case typography in Outfit font.
