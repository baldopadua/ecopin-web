# Web response headers

`next.config.mjs` applies CSP, `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, and
`Referrer-Policy: strict-origin-when-cross-origin` to every web path, including
public assets and error responses. Backend API headers do not replace this policy.

The enforced CSP restricts scripts to this web origin, blocks event-handler
attributes, denies embedded objects/frames/framing, and restricts base URLs and
form destinations to the web origin. Connections and images allow only the
configured public API/Supabase origins and the explicitly inventoried map,
weather, routing, photo, avatar and icon providers. Supabase Realtime uses the
matching WebSocket origin. `data:`/`blob:` support existing icons and protected
image previews. Unlisted external images are blocked; normal fallback images
remain allowed. The experimental page's Google Fonts stylesheet/font origins
are retained. Upstash is server-only and is not a browser connection source.

The policy intentionally permits inline script elements for static Next.js
bootstrap/RSC payloads and the theme initializer. Inline styles are also needed
by React/Leaflet. Production forbids `unsafe-eval`; development permits it for
Next debugging. This is an enforced compatibility policy, **not strict nonce
CSP or a complete XSS defense**. Rendering untrusted content safely remains
required. A nonce-only policy needs a separate dynamic-rendering/caching change.

`NEXT_PUBLIC_BACKEND_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `FRONTEND_URL`
must be set correctly **before building**. URLs are reduced to origins; paths,
query parameters and secrets are not copied into the policy. Invalid schemes
or credential-bearing URLs fail configuration rather than expanding permissions.
Rebuild when those public service origins change.

HSTS is added only when `FRONTEND_URL` declares HTTPS on a non-loopback host:
`max-age=86400`, without `includeSubDomains` or `preload`. Browsers ignore HSTS
received over HTTP. Confirm HTTPS/certificate coverage and headers at the actual
deployment before increasing the duration; local tests cannot certify TLS or
proxy behavior. Production sources should use HTTPS.

`npm run test:headers` checks the policy and cached photo-pin fallback behavior.
The optional `test:forecast-browser` regression also requires zero unexpected
CSP console violations. The image fallback is an event listener attached to
each rendered Leaflet icon, rather than an inline HTML handler.

## Internal Dashboard & Authenticated Route Caching (WT-49)

To prevent public edge CDNs (Cloudflare, Fastly, AWS CloudFront, Akamai) and intermediate
reverse proxies from caching internal HTML shells, dynamic RSC payloads, or authenticated
responses, `next.config.mjs` enforces anti-caching headers on all authenticated paths:
- `/dashboard` and `/dashboard/:path*`
- `/force-change-password` and `/force-change-password/:path*`
- `/api/session/:path*`
- `/api/backend/:path*`
- `/api/tasks/auto-generate/:path*`

Enforced anti-caching response headers:
```http
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
Pragma: no-cache
Expires: 0
Surrogate-Control: no-store
CDN-Cache-Control: no-store
```

### Edge Reverse Proxy Invariant
Production reverse proxies (e.g. Nginx, Caddy, CloudFront) must also enforce:
1. `proxy_cache_bypass 1` and `proxy_no_cache 1` on `/dashboard*` and authenticated API paths.
2. Downstream emission of `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0`.
3. Strict separation of static hashed assets (`/_next/static/*` with `immutable` caching) from internal application shells.
4. Reference Nginx deployment configuration is provided in `config/nginx/ecopin-web.conf`.

Verification test suites:
- `npm run test:caching`: Validates header rules and executes simulated RFC 9111/9211 CDN cache bypass checks across all dashboard routes.
- `npm run test:headers`: Verifies base defense headers alongside dashboard anti-caching rules.

References: [Next.js CSP guide](https://nextjs.org/docs/app/guides/content-security-policy),
[CSP directives](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy),
[HSTS behavior](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security),
[RFC 9111 HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111),
[RFC 9211 Targeted HTTP Cache-Control](https://www.rfc-editor.org/rfc/rfc9211).

