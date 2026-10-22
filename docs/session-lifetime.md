# Web session lifetime

Full web sessions expire 30 days after sign-in. This is an absolute deadline:
inactivity does not end the session, and activity or access-token refresh cannot
extend it. The server-side session record and browser cookie use this deadline.
The legacy `session_timeout_minutes` setting no longer controls web sessions.
Admin settings show the fixed lifetime instead of an editable inactivity timeout.

Temporary sessions for required password changes retain their five-minute limit.
Explicit logout and server-side revocation still end a session immediately.
Temporary session-check outages preserve existing, unexpired metadata without
granting additional API access or extending expiry.

Existing sessions retain their original deadlines; sign in again to receive the
30-day lifetime. Mobile session policy is unchanged.

Verification: `node --test tests/web-session-routes.test.mjs
tests/web-session-store.test.mjs tests/session-credentials.test.mjs` and
`node --test tests/session-lifetime.browser.cjs` (Playwright on NODE_PATH).
