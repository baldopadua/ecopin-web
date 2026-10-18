# Admin Audit Logs Layout & Design Alignment

## 1. Overview
The Admin Audit Logs page (`/dashboard/admin/audit-logs`) has been refined to strictly adhere to `DESIGN.md` Section 21 and the modern zero-scrolling dashboard specifications.

### Key Refinements
1. **Zero-Scrolling Viewport (`AuditLogs.module.css`)**:
   - `.page` utilizes `height: 100%; overflow: hidden;` so `#workspace-content` never scrolls on the outer page level.
   - The `.tableWorkspace` flexibly occupies remaining height (`flex: 1; min-height: 0;`), with internal scrollable table container (`overflow: auto;`).
   - Sticky table headers maintain visibility during internal scrolling.

2. **Modernized Export CSV Button**:
   - Upgraded `ExportButton` to a modern 44px pill button (`border-radius: 9999px; min-height: 44px; px-5 py-2.5;`).
   - Replaced outdated sharp rectangular borders and tracked uppercase typography (`tracking-widest`) with clean sentence-case `Export CSV` in Outfit font.

3. **Typography and Spacing Consistency (`DESIGN.md` Section 21)**:
   - Monospace is strictly reserved for real identifiers, hashes, and JSON payloads (e.g. truncated `user_id`, `entity_id`, and `event_data`).
   - Standard textual content (timestamps, actor names, target labels, banner descriptions) uses readable Outfit typography.
   - All uppercase labels and tracking (`font-bold uppercase tracking-wider`) converted to sentence case.
   - Captions are kept at or above 12px (eliminated sub-12px `text-[10px]` and `text-[11px]`).
   - Event actions rendered as standardized status pill badges (`border-radius: 9999px;`).

4. **WORM & Immutability Compliance Banner**:
   - Refined with standard 16px corner radius (`--radius-card`), clean semantic borders, and sentence case headings.
   - Seal WORM batch button uses a standard pill button with smooth hover effects.
