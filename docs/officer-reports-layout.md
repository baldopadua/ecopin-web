# Officer Reports Directory Layout

## Report details layout

Officer and admin report details follow the shared workspace header, theme tokens, 20px panel spacing, and consistent 18px section headings. The report title is the content heading; Description is subordinate. A readable metadata sidebar sits beside the main column on wide screens, with a stacked layout on smaller screens. Long identifiers wrap rather than widening panels.

The lifecycle is a named, read-only list with written stage labels, completed-step checkmarks, a marked current step, and visible connectors. Narrow screens use a vertical list. Rejected reports and denied property consent show a stopped state; a missing stage never implies progress. Review actions use the shared primary/secondary buttons, and photo previews are keyboard-accessible buttons. Field-crew layout retains its existing styling. Activity-note saving and evidence-photo loading retain their existing behavior.

The timeline recognizes the backend's Acknowledged and Responded stages. Recorded report status takes precedence for resolution, feedback waiting, and closure because these transitions may leave the crew stage unchanged. An explicit dispatched lifecycle state advances a stale Submitted marker to Assigned. A current-stage text label accompanies the highlighted step. Unknown stages stay explicit unless another recorded status supplies progress; citizen evidence and before/after photos never determine completion.

Verification covers 320px, 768px, 1024px, and 1440px in light/dark themes, long metadata, 44px touch targets, keyboard photo opening and notes navigation, and missing/stopped lifecycle states.

## Report activity notes

Officers and administrators can append notes from Activity Log on Report Details. Notes use `POST /api/reports/:id/agency-responses` and are stored as `manual_note` activity records, preserving the citizen's report explanation. Empty notes are rejected, and failed saves retain the draft. The field crew app loads the same records when report details are opened or refreshed and retains its existing offline cache behavior.

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

## Manual approval and severity

Report Details now requires an explicit 0–100 severity score when approving a manually reviewed report. The dialog offers a slider and an exact-number field, shows the matching severity level, and saves both approval and severity in one update. An already-approved report with no score has a Set severity action. The selected score survives a failed save; cancel sends no request.

The existing PATCH /api/reports/:id/validation endpoint accepts numeric severity_score with validation_status approved. It rejects fractional, missing-required, and out-of-range scores; derives severity_level using the existing server configuration; and records officer_manual provenance, the authenticated actor, timestamp and explanation in severity_factors. Unexpected read failures cannot proceed to approval. The write checks the validation state read earlier, so a concurrent validation change cannot be silently overwritten. Existing automatic scores remain unchanged unless a replacement is supplied. No new database columns or migration are needed.

Verified: 23 focused backend cases and six isolated browser scenarios covering light/dark themes at 1366px and 320px, real pointer dragging, keyboard bounds, exact numeric entry, cancel/focus restoration, rejection/retry, persistence on reload, an already-approved zero-score case, and malformed response handling. All 134 web unit tests and the production build passed. Changed page/component lint passed; the API helper retains an existing unrelated console statement at line 315 that fails its file-wide lint. Three known broader backend failures remain in tenant-isolation/audit checks.

Run the UI checks with node tests/report-manual-severity.browser.cjs against localhost:4001; ECOPIN_PLAYWRIGHT_PATH can select the installed Playwright runtime. All reports and mutations in those checks are intercepted synthetic fixtures. No live report was approved or assigned an invented score.

## Citizen manual review explanations

Citizens explain the environmental concern when requesting manual review of an unverified photo. After submission, the backend saves the numbered photo explanations in reports.notes with the prefix "Reporter requested manual review:". Merely typing in the native form does not save a server record. The authorized report-detail endpoint already returns these notes to desk staff.

Officer/admin web Report Details now shows a named Manual review request section between Description and Evidence Media. It displays the full request as plain, wrapping, multiline text and remains visible after approval/reload. Empty or unrelated internal notes do not appear as citizen requests. The native officer app is unchanged. If an officer rejects an appealed report, the existing citizen notes are retained and the labeled officer rejection reason is appended rather than replacing the request. This uses the existing notes column and requires no schema migration.
