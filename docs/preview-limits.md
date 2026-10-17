# Route-preview admission and work limits

The local preview route verifies the backend session and requires `officer` before
checking a shared Redis quota. It never trusts a client role, token claims or
forwarded IP header as the quota identity. Refreshing a token retains the same
verified-user quota.

Configure these **server-only** environment variables locally and in the web
deployment; never prefix them with `NEXT_PUBLIC_` or paste their values into logs:

- `UPSTASH_REDIS_REST_URL`: the HTTPS REST origin for the dedicated limiter store.
- `UPSTASH_REDIS_REST_TOKEN`: a write-capable token permitted to execute the limiter
  script and its `GET`, `INCR`, `PEXPIRE`, and `PTTL` commands.

Missing configuration, a rejected/redirected/timed-out request, or an unexpected
Redis response returns generic 503 before parsing the body or accessing reports.
There is no in-memory fallback. All web instances must use the same database.

One Redis `EVAL` atomically checks both counters and admits at most five requests
per officer and thirty overall per fixed 60-second window. Keys contain a SHA-256
identity digest, not the bearer token or raw user ID. Counters expire 60 seconds
after their first admission. Denied requests do not extend their expiry. A 429
includes `Retry-After` in seconds. Invalid bodies consume an admitted slot too.
Fixed windows allow boundary bursts; they are not rolling-window limits. Redis
service replication/failover guarantees still apply; this is not a promise of
strict global serialization during a provider partition or failover.

| Boundary | Limit |
| --- | --- |
| Session verification | 5 seconds |
| Shared quota REST request, including response body | 2 seconds / 4 KiB |
| Incoming JSON body | 2 seconds / 4 KiB |
| Each settings/report request | 3-second client cancellation signal |
| Eligible reports | 500; a single bounded 501-row read detects overflow |
| Native target/report comparisons | At most 500 × 500 |
| Solver request and response body | 2 seconds / 512 KiB / 500 tasks |

Report overflow returns 422 and directs staff to the dispatch planner, rather
than computing a silently truncated preview. Only the public fields needed by
this legacy preview are selected. Malformed/unavailable/oversized solver output
uses the bounded native fallback; a cancelled client request stops before that
fallback. These bounds do not certify solver-result semantics, report geometry,
tenant scoping or database-side cancellation after an HTTP disconnect.

Run `npm test` for synthetic handler regressions. After setting the Redis variables
in the ignored local `.env`, run `npm run test:preview-quota-live`. The opt-in live
check uses two independently loaded limiter instances, six concurrent attempts
against one synthetic principal, and 31 attempts against distinct synthetic
principals. It touches only random `ecopin:quota-test:*` namespaces; their keys
expire automatically in 60 seconds. It neither generates routes nor uses a real
staff session. Do not run it against a token/store you are not authorized to test.

Deploy only after that shared-store check passes. Without the variables, the
preview intentionally remains unavailable. Authentication-service/proxy/IP
throttles need their own trusted deployment enforcement; web header values are
not proof of client IP identity.

References: [Upstash REST command and response format](https://upstash.com/docs/redis/features/restapi),
[Redis script execution](https://redis.io/docs/latest/commands/eval/),
[Upstash consistency guarantees](https://upstash.com/docs/redis/features/consistency).
