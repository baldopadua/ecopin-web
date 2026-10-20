# Cleanup task preview conflicts

The backend rejects custom task creation with HTTP 409 when any selected report is already assigned, terminal, under manual review, blocked, or unavailable for locking. This check remains the final authority and must not be bypassed.

Preview availability reads use the verified server session token, never a browser Authorization header. Task and dispatch-block lookups must both succeed and return arrays before preview generation proceeds. The authenticated proxy permits the existing read-only `/api/optimization/blocks` endpoint.

Preview snapshots include eligible primary cluster members plus validated detours. Confirmation submits these report IDs rather than re-reading the entire cluster, which can include assigned or otherwise excluded reports. Missing cluster report IDs require a new preview; a cluster UUID is never substituted for a report UUID.

The proxy preserves 409 with generic refresh guidance while discarding private upstream error details. A dispatch conflict returns the UI to preview setup. Successfully created proposals are removed as each request completes, so a later failure does not leave those proposals available for accidental retry.

Validation: `npm run test:unit` includes `dispatch-preview.test.mjs` and `web-session-routes.test.mjs`. Browser verification used simulated creation responses to check snapshot payloads and partial-success/conflict recovery without writing cleanup tasks.
