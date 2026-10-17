# Draft specification: server-managed staff web sessions

Status: prepared for review; not implemented. Closes the remaining browser-credential portion of VULN-02 only after the acceptance checks below pass. Current implementation/residual risk is documented in `session-hardening.md`.

## Objective and assumptions

Staff sign-in, reload, password change, refresh, media, uploads, preview and sign-out work without exposing access, refresh or temporary backend credentials to browser JavaScript. The existing backend remains the identity/role authority. Implementation stays inside ecopin-web; no mobile/backend source or real account mutation is authorized by this draft. Production uses a declared canonical HTTPS origin. Real token lifetime/revocation contracts remain unverified and must be confirmed through authorized fixtures rather than inferred from decoded JWT claims.

## Web boundary

Use an opaque server session ID in a `__Host-ecopin_session` cookie with HttpOnly, Secure, SameSite=Lax, bounded lifetime, Path=/ and no Domain. Store backend credentials only in a shared server-side session store with expiry and atomic rotation/revocation; never a process-local map. The existing Redis quota database/token was configured for limiting and is not automatically authorized for credential storage. Choose/provision session storage and server-only secrets before activation; never use NEXT_PUBLIC_ names or commit values.

| Proposed web endpoint | Contract |
| --- | --- |
| POST /api/session/login | Validate bounded JSON and exact Origin; call the fixed auth authority; establish a fresh session ID; return safe user/expiry/state metadata only |
| GET /api/session | Return safe session metadata or a generic 401; never credentials; no-store |
| POST /api/session/logout | Revoke the server record and clear cookie; best-effort authority logout must not resurrect the session |
| POST /api/session/password | Accept only a temporary-session state; bounded password input; clear that state on success and require fresh sign-in |
| /api/backend/... | Explicit method/path allowlist for existing JSON, media and upload consumers; require the correct session state, attach the stored bearer server-side and preserve authority authorization |

Route preview must resolve the server session and retain its authoritative officer check, quota and work budgets. Temporary sessions cannot reach staff/preview/media actions. Ordinary browser callers must stop building Authorization headers, reading localStorage credentials or decoding JWTs for session decisions. The public account header consumes safe session metadata. Direct Supabase anon/public and Realtime access must be reviewed separately; the session cookie must never be forwarded to Supabase or arbitrary hosts.

Every cookie-authenticated mutation, including login/logout, needs an exact configured Origin check and defined missing-Origin rejection. Browser cookies/Authorization/forwarded headers cannot choose an upstream host, override the server bearer or bypass the path allowlist. Reject unsafe path encodings/traversal and upstream redirects. Bound deadlines, request bodies, uploads, response bodies and media streaming according to existing consumers; preserve abort propagation and private-media cache protections. Do not blindly forward upstream Set-Cookie or credential-bearing auth responses. Return generic errors plus the existing safe diagnostic correlation ID.

## Acceptance and rollout

- Native Node tests cover cookie flags, missing/expired/revoked/tampered sessions, temporary/full state separation, Origin rejection, fixed upstream routing, header filtering, bounded I/O, response token redaction and concurrent refresh/logout/login races.
- Isolated production browsers use actual sign-in UI with synthetic authority responses. No credentials appear in localStorage/sessionStorage, JavaScript-readable cookies, returned JSON or console output. Verify reload, forced password change, public account navigation, expiry, refresh, logout across tabs, JSON APIs, preview, private media and uploads without real mutations.
- No fallback to browser bearer tokens if the session store or configuration fails. Idle/absolute expiry and refresh rules must be explicit and no more permissive than the verified authority policy; numeric policy and store provisioning remain unresolved configuration decisions.
- Run npm test, focused ESLint, npm run build and the relevant production-browser suites. Keep the existing read-only grant/storage and preview regressions intact. Do not weaken tests or gates to land the migration.
- Switch all credential consumers together; remove legacy storage credentials at cutover and require fresh sign-in. Test staged deployment and rollback behavior without silently re-enabling a vulnerable credential fallback. Hosted verification and authority-side revocation checks are required before VULN-02 is closed.

Sources: bundled Next.js 16.4.2 authentication guidance at node_modules/next/dist/docs/01-app/02-guides/authentication.md; [Next.js authentication](https://nextjs.org/docs/app/guides/authentication); [OWASP HTML5 storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage). This draft makes no claim that the proposed endpoints or store already exist.
