# Operation creation workspace

The operation-creation page preserves PageHeader's title, subtitle, and all three
breadcrumbs. It fills the dashboard viewport with a compact mode selector and
three desktop panels: map selection, report checklist, and task details. Preserve
DESIGN.md section 21: Outfit, civic blue actions, semantic priority/status colors,
neutral dark surfaces, 12px inputs, 16px panels, pill actions, and 44px targets.

Reports and field crews use measured pagination instead of scroll containers.
Selections remain in the existing page state, independent of which page is
visible. Eligibility, URL preselection, crew-team member resolution, validation,
API payloads, and dispatch handlers remain unchanged.

Auto mode keeps task setup beside the preview. Advanced fields use two columns;
proposed cleanup tasks are reviewed one at a time with retained titles/crew selections.
Confirm & Dispatch continues to validate and dispatch the complete generated set.

Generation defaults to tasks for the eligible backlog. Selecting a single task
keeps only the proposal with the highest primary priority before crew assignment;
its bundled reports remain included. Switching scope clears the old preview.
The preview service still evaluates all eligible reports in either mode.
Travel estimates use the solver's distance at 30 km/h and exclude cleanup time.
Missing distance estimates display as unavailable; the separate shift cap is a
configured limit, not an estimate. The Python solver currently omits distance.

Below 900px, Map / Reports / Task details and Task setup / Proposed tasks switch
the visible workspace panel. Advanced settings use three two-field pages. The
header remains visible and selections persist between panels and modes.

Verification: `node --test tests/operation-create.browser.cjs` with Playwright in
NODE_PATH. Use a local app at http://localhost:4001 or ECOPIN_TEST_BASE_URL. Synthetic
sessions, reports, crews, route previews, and intercepted creation requests verify
the supplied cluster-preselection URL without creating real tasks. Checks cover
desktop 1440×900, 1366×768, 1280×720, 1024×768; narrow widths 768/390/320 at 844px
height; header presence, list/page overflow, advanced-field overlap, retained
selection, error/empty previews, and the manual creation payload.
