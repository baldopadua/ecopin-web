# Private application diagnostics

Application errors and warnings use `reportDiagnostic` from `lib/diagnostics.mjs` in both browser and server code. It copies only a fixed event name, allowlisted application area, random event identifier, HTTP failure status, and allowlisted error code/type. It never emits messages, stacks, causes, URLs, report/profile/evidence objects or token fragments. Unknown metadata is omitted; payload getters and serialization hooks are not invoked.

The helper returns the event identifier it emitted. Preview server failures return this same opaque `eventId` alongside a fixed error message, with `Cache-Control: no-store`, so an operator can correlate the response with a safe diagnostic. Unexpected errors are caught across the entire handler; authentication, quota and input validation retain their existing statuses/messages. Generic client errors follow [OWASP error-handling guidance](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet).

Direct application console calls are prohibited by ESLint, with the safe sink as the only exception. The standard test suite enforces that boundary across app, components and lib. Next's compiler also removes debug console calls while retaining safe errors and warnings. Third-party library/framework diagnostics are outside this application-source guarantee.

Run `npm run test:diagnostics` for synthetic privacy and source-boundary checks. After a production build, run `npm run test:diagnostics-browser` against the local audit server on port 4017 with Playwright available in NODE_PATH. The isolated browser uses synthetic account responses, blocks external traffic and verifies that a forecast API failure containing private markers produces safe diagnostics without those markers.

This intentionally reduces diagnostic detail: error messages and stack traces must not be reintroduced to investigate failures. Deployment is required before these source changes protect a hosted release. Previously collected logs are not removed by this change.
