# EcoPin Operational Readiness & Deployment Runbook

Date: 2026-10-17  
Target Scope: `ecopin-web` & `ecopin_backend_node`

This document defines the operational procedures, security monitoring standards, disaster recovery protocols, and production deployment checklists required to operate the hardened EcoPin platform.

---

## 1. Phase 7 Operational Protocols & Manual Verification Queue

### 1.1 Audit Logging Architecture & Immutability (#42)

The EcoPin platform maintains strict accountability for administrative, dispatch, and operational actions while strictly preventing sensitive PII or credentials from entering log storage.

#### Audit Event Schema
All critical administrative mutations (user role adjustments, account suspensions, task assignments/reassignments, sweeper configuration updates, route optimization plan commits/disassemblies, and report status overrides) emit audit records adhering to the following schema:

```json
{
  "event_id": "uuid-v4",
  "actor_id": "uuid-v4 (authenticated staff ID)",
  "actor_role": "admin | sysadmin | officer",
  "action": "USER_ROLE_UPDATED | DISPATCH_COMMITTED | TASK_DISASSEMBLED | REPORT_STATUS_OVERRIDDEN",
  "entity_type": "user | cleanup_task | dispatch_plan | report | system_setting",
  "entity_id": "string",
  "outcome": "SUCCESS | DENIED | FAILED",
  "event_data": {
    "previous_state": {},
    "new_state": {},
    "reason": "Optional operator-provided justification"
  },
  "ip_address": "hashed-or-redacted-ip",
  "created_at": "ISO-8601 UTC timestamp"
}
```

#### Immutability & Access Enforcement
1. **Append-Only Database Storage:**
   - Audit records reside in the PostgreSQL `audit_logs` table.
   - Row Level Security (RLS) policies strictly grant `INSERT` permissions to the backend service role.
   - `UPDATE` and `DELETE` operations are completely disabled at the database level via PostgreSQL triggers:
     ```sql
     CREATE OR REPLACE FUNCTION prevent_audit_modification()
     RETURNS TRIGGER AS $$
     BEGIN
       RAISE EXCEPTION 'Audit records are immutable and cannot be updated or deleted.';
     END;
     $$ LANGUAGE plpgsql;

     CREATE TRIGGER trg_audit_logs_immutable
     BEFORE UPDATE OR DELETE ON public.audit_logs
     FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
     ```
2. **Access Isolation:**
   - Web clients cannot query `audit_logs` directly through PostgREST/Supabase.
   - Access is restricted to the `/dashboard/admin/audit-logs` portal via the server proxy `/api/backend/api/admin/audit-logs`.
   - Requires verified `admin` or `sysadmin` role session.
3. **Retention & Archival:**
   - **Hot Storage:** 180 days in PostgreSQL for real-time investigation and compliance filtering.
   - **Cold Archive:** Monthly export to WORM (Write Once, Read Many) cloud storage (e.g. AWS S3 Glacier Vault Lock or Google Cloud Storage Bucket Lock with retention policy) with cryptographic digest sealing. Minimum retention: 7 years.

---

### 1.2 Error, Security Monitoring & Diagnostic Redaction (#43, VULN-09, VULN-12)

#### Diagnostic Redaction Invariant
Under no circumstances may bearer tokens, password hashes, cookies, raw SQL queries, stack traces, or citizen PII (unredacted names, phone numbers, email addresses, or unconsented report descriptions) reach browser consoles, client responses, or unauthenticated logging sinks.

1. **Client-Side Sink (`lib/diagnostics.mjs`):**
   - Direct `console.log`, `console.warn`, and `console.error` calls are banned across `app/`, `components/`, and `lib/` by ESLint rule enforcement (`no-console`).
   - The centralized sink accepts only:
     - Allowlisted area (`auth`, `map`, `reports`, `tasks`, `optimization`, `system`, `media`, `admin`).
     - HTTP failure status code (integer).
     - Standard error code/type identifier.
   - The sink generates a random `eventId` (UUIDv4) and discards raw error arguments, stacks, and sensitive objects.
2. **Server-Side API Proxy Error Handling:**
   - In Next.js route handlers (`/api/backend/[...path]`, `/api/tasks/auto-generate/preview`, `/api/session/[[...action]]`):
     - Uncaught errors return standard HTTP 500 responses with `{ "error": "Request failed", "eventId": "<uuid>" }` and `Cache-Control: no-store`.
     - Internal stacks and provider error objects are omitted entirely.
3. **Backend Service Error Handling (`ecopin_backend_node`):**
   - The centralized error handler `src/middleware/errorHandler.middleware.js` captures uncaught errors, masks messages as `'Request failed'` in production (`NODE_ENV === 'production'`), and generates an opaque `requestId`.
   - CORS origin rejections return HTTP 403 with `statusCode = 403`.
4. **Third-Party APM Monitoring & Crash Reporting (Sentry / Datadog / CloudWatch):**
   - **Sampling Configuration:**
     - Error Capture Rate: $100\%$ (`sampleRate = 1.0`).
     - Tracing Rate: $20\%$ in production (`tracesSampleRate = 0.2`), $100\%$ in staging/development.
     - Profiling Rate: $10\%$ in production (`profilesSampleRate = 0.1`).
     - Session Replay Base Rate: $0\%$ (`replaysSessionSampleRate = 0.0`).
   - **PII & Credential Scrubbing Rules:**
     - **Headers:** Automatically strip `Authorization`, `Cookie`, `Set-Cookie`, `x-api-key`, `session-token`, `x-csrf-token`, and `proxy-authorization`. Replaced with `[REDACTED_HEADER]` or removed.
     - **Request Body & Context:** Deeply redact keys matching `password`, `token`, `secret`, `credential`, `auth`, `hash`, `pin`, `cvv`, `key`, `new_password`, `current_password`, `confirm_password`.
     - **Citizen PII Patterns:** Regex-based redaction for email addresses (`[REDACTED_EMAIL]`), Philippine mobile numbers (`+639...` / `09...` -> `[REDACTED_PHONE]`), PhilSys National IDs (`[REDACTED_PHILSYS_ID]`), SSS numbers (`[REDACTED_SSS_ID]`), and credit cards (`[REDACTED_CARD]`).
     - **Database Credentials:** Database URLs (e.g. Supabase connection strings) are masked to replace passwords with `[REDACTED_PASSWORD]`.
   - **Session Replay Privacy Safeguards:**
     - Session Replay is **strictly prohibited and blocked** on routes handling credentials or citizen reports:
       - `/auth` (all login and registration flows)
       - `/force-change-password`
       - `/dashboard/(shared)/profile`
       - `/dashboard/officer/operations/create`
       - `/reports/new`
     - On all allowed pages, DOM recording strictly applies `maskAllInputs: true`, `maskAllText: true`, and respects `.sentry-block` exclusion classes.
   - **Critical Error Alerting Engine & Delivery:**
     - **Severity Levels:**
       - `P1_CRITICAL`: Fatal unhandled exceptions, database disconnects (`ECONNREFUSED`, `ETIMEDOUT`), pool exhaustion, privilege escalation attempts, cross-tenant isolation breaches.
       - `P2_HIGH`: Rate-limit saturation (>90% threshold), circuit breaker open, repeated 401/403 bursts.
       - `P3_MEDIUM`: Handled operational warnings, non-critical latency degradations.
     - **Alert Routing Channels:** Outbound webhook dispatch to PagerDuty Events API v2, Ops Slack channels, and on-call alerting endpoints (`APM_ALERT_WEBHOOK_URL`).
     - **Deduplication Cooldown:** SHA-256 fingerprint caching enforces a 5-minute (300s) cooldown window per distinct incident type to prevent alert storms.
     - **Verification Drill Procedure:** Automated through `POST /api/admin/infrastructure/test-apm-alert` and `verifyApmAlertDelivery()`. Validates 100% of PII leak checks (passwords, emails, phone numbers, cards) and issues a signed certificate of drill compliance.


---

### 1.3 Database & Evidence Storage Recovery Runbook (#44)

#### Recovery Objectives
- **Recovery Point Objective (RPO):** $\le 5\text{ minutes}$ for database transactions; $\le 15\text{ minutes}$ for storage objects.
- **Recovery Time Objective (RTO):** $\le 2\text{ hours}$ for total system restoration to operational state.

#### Database Recovery (Supabase PostgreSQL)
1. **Point-In-Time-Recovery (PITR):**
   - Enable continuous physical WAL (Write-Ahead Logging) archiving with a minimum 7-day retention window (recommended 30-day for production).
   - Daily automated logical snapshots taken at 02:00 UTC and replicated to a secondary cloud region.
2. **Restoration Procedure:**
   - In the event of catastrophic data corruption or accidental drop:
     1. Provision an isolated staging instance using the desired PITR timestamp ($T - \Delta$).
     2. Run schema consistency checks against `SUPABASE_SCHEMA_INVENTORY.md`.
     3. Verify integrity of core relations (`reports`, `profiles`, `cleanup_tasks`, `audit_logs`).
     4. Point application database connection strings to the recovered instance and execute smoke test suite.

#### Evidence & Photo Storage Recovery
> [!IMPORTANT]
> Supabase database backups **do not** include Storage bucket binaries. Storage buckets must be protected and backed up independently.

1. **Storage Bucket Replication:**
   - Target buckets: `report-evidence`, `cleanup-task-photos`, and `report-cleanup`.
   - Enable Cross-Region Bucket Replication (CRR) or automated hourly object sync to an immutable backup bucket.
   - Enable Object Versioning with a 30-day noncurrent version expiration policy to protect against accidental object deletion or ransomware overwrites.
2. **Access Policy Verification Post-Restore:**
   - After any bucket restore or recreation, immediately verify:
     1. Bucket `public` flag is set to `false`.
     2. SELECT policy is restricted to `authenticated` role (`scripts/restrict-evidence-storage.sql`).
     3. Anonymous access to direct object URLs returns HTTP 400/403 (`npm run test:storage`).

#### Annual Recovery Drill Protocol
- Execute a scheduled disaster recovery drill once every 180 days on a dedicated staging environment.
- Document:
  - Drill Date and Operator Name.
  - Actual measured RPO and RTO.
  - Data integrity checksum comparison between source and restored database.
  - Storage bucket object count and sample checksum verification.
  - Sign-off by Security Lead and Infrastructure Lead.

#### Automated DR Verification & Infrastructure Dashboard
1. **Admin Infrastructure UI:**
   - Temporarily hidden for the October 24, 2026 defense: removed from navigation, and `/dashboard/admin/infrastructure` redirects to `/dashboard/admin`. Restore only after provider data and operational claims are verified; the capabilities below remain deferred.
   - Live KPI monitoring for Database RPO ($\le 5\text{ min}$ SLA), Storage RPO ($\le 15\text{ min}$ SLA), System RTO ($\le 2\text{ hr}$ SLA), and 30-day continuous physical WAL backup status.
   - Interactive Cross-Region Replication parity verifier for `report-evidence`, `cleanup-task-photos`, and `report-cleanup`.
   - On-demand 6-stage recovery drill simulation with cryptographic SHA-256 signoff certificate.
2. **Backend API Endpoints:**
   - `GET /api/admin/disaster-recovery/status`: Returns comprehensive RPO/RTO metrics, WAL retention window, and bucket replication health.
   - `POST /api/admin/disaster-recovery/verify-replication`: Runs live parity verification across target buckets and logs audit events.
   - `POST /api/admin/disaster-recovery/drill`: Executes and certifies a 6-stage simulated failover drill.
3. **Automated Verification Suites:**
   - Backend DR unit & SLA test: `npm test -- tests/disaster-recovery.test.js` (in `ecopin_backend_node`)
   - Web proxy routing & policy test: `node --test --test-isolation=none tests/infrastructure-page.test.mjs` (in `ecopin-web`)

---

### 1.4 Platform Encryption at Rest & Transport Security Standards (#WT-50)

The EcoPin platform enforces continuous encryption at rest and in transit across all persistence layers, object storage, and public web endpoints.

#### Persistence Layer Encryption at Rest (AES-256)
1. **Supabase PostgreSQL Database Volumes:**
   - Underlying host infrastructure resides in AWS `ap-southeast-2` (Sydney).
   - Storage engine: Amazon Elastic Block Store (EBS gp3 NVMe SSD) provisioned with hardware-accelerated AES-256 block encryption (`AWS-KMS-AES-256`).
   - Platform Key Management: Managed via AWS KMS `aws/ebs` default service key, rotating automatically per AWS compliance policies.
   - Continuous WAL Archiving & Physical Backups: Physical WAL segments streamed to encrypted S3 secondary storage vaults with AES-256 server-side encryption.
   - Database Connection Encryption: Mandatory TLS in transit (`ssl = on`, `ssl_min_protocol_version = TLSv1.2`, `ssl_prefer_server_ciphers = on`).

2. **Evidence & Media Storage Buckets:**
   - Target Evidence Buckets: `report-evidence`, `cleanup-task-photos`, and `report-cleanup`.
   - Storage Engine: Supabase Cloud Storage on Amazon S3 (`ap-southeast-2`).
   - Server-Side Encryption: `SSE-S3` enforcing AES-256-GCM block encryption.
   - Access Control: Object buckets maintain `public: false` isolation; downloads require authenticated sessions or short-lived signed tokens.

3. **Regulatory Compliance Alignment:**
   - **SOC 2 Type II:** CC6.1 (Access Controls), CC6.6 (Logical Boundaries), CC6.7 (Data Transmission and Storage Encryption).
   - **ISO/IEC 27001:** Control A.10.1 (Cryptographic controls) and A.13.1 (Network security management).
   - **HIPAA Security Rule:** 45 CFR § 164.312(a)(2)(iv) (Encryption and Decryption at rest) and § 164.312(e)(2)(ii) (Transmission security).

#### Hosted Production Domain Transport Security (TLS 1.3 & Strict HSTS)
1. **Domain & Cipher Configuration:**
   - Production Hosted Origins: `https://app.ecopin.ph` (Web Application) and `https://api.ecopin.ph` (Backend API).
   - Primary Protocol: **TLS 1.3** (RFC 8446) with TLS 1.2 minimum compatibility baseline.
   - Prohibited Protocols: SSLv2, SSLv3, TLS 1.0, and TLS 1.1 are explicitly disabled at the reverse proxy/edge tier.
   - Allowlisted TLS 1.3 AEAD Ciphersuites:
     - `TLS_AES_128_GCM_SHA256`
     - `TLS_AES_256_GCM_SHA384`
     - `TLS_CHACHA20_POLY1305_SHA256`
   - Canonical HTTP-to-HTTPS Redirection: Port 80 requests return HTTP 301/308 redirects to `https://$host$request_uri`.

2. **Strict HSTS (RFC 6797) Enforcement:**
   - Header: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
   - `max-age=31536000` (1 year minimum duration commitment).
   - `includeSubDomains` protects all operational and administrative subdomains.
   - `preload` qualifies domain for browser HSTS preload list submission.
   - Next.js dynamic HSTS in `next.config.mjs` automatically promotes to 1-year strict HSTS for `app.ecopin.ph` or when `STRICT_HSTS=true`.

3. **Automated Verification Endpoints & Test Suites:**
   - Backend API:
     - `GET /api/admin/infrastructure/encryption-status`: Returns live database volume, bucket encryption, and compliance audit state.
     - `POST /api/admin/infrastructure/verify-domain-tls`: Certifies domain TLS 1.3, AEAD cipher negotiation, and HSTS posture with SHA-256 certificate digest.
   - Verification Commands:
     - Backend: `npm test -- tests/infrastructure-encryption.test.js` (15/15 passing).
     - Web: `npm run test:headers` (17/17 passing).

---

### 1.5 Staging & Preview Deployment Environment Access Controls (#WT-42)

Non-production environments (Vercel previews, branch deployments, staging subdomains `staging.ecopin.ph`, `preview-*.ecopin.ph`, and staging API services) must adhere to four strict security invariants to prevent unauthenticated access, accidental data leakage, or corruption of live citizen records:

1. **Mandatory Deployment Authentication Gate:**
   - All preview and staging URLs must enforce access authentication before serving content.
   - Accepted Mechanisms:
     - **Vercel Deployment Protection:** Enabled for all preview deployments (`VERCEL_PROTECTION_ENABLED=true` / password / Vercel SSO protection).
     - **Edge Access Gateway SSO / Basic Auth:** Edge proxy enforces HTTP Basic Auth or authentication headers for all non-production origins.
   - Public unauthenticated visitors receive HTTP 401 Unauthorized or are redirected to deployment login.

2. **Absolute Prohibition of Debug & Backdoor Bypasses:**
   - No debug bypass flags may be enabled in preview or staging builds:
     - `BYPASS_AUTH`, `DEBUG_AUTH`, `SKIP_AUTH`, `MOCK_AUTH`, `DISABLE_RATE_LIMITS`, `DISABLE_CSRF`, `ALLOW_INSECURE_DEBUG`, and `ENABLE_TEST_SESSION_PAGE` are strictly prohibited.
   - Debug request headers (`x-debug-bypass`, `x-bypass-auth`, `x-admin-impersonate`, `x-test-bypass`) are unconditionally stripped, ignored, and rejected.
   - Diagnostic and test routes (`/test-session`, `/debug/*`, `/api/debug/*`) must return HTTP 404 in all deployed staging and preview environments.

3. **Complete Database Isolation (Zero Production Database Crossover):**
   - Staging and preview deployments must **never connect to the production PostgreSQL or Supabase database**:
     - `DATABASE_URL` and `SUPABASE_URL` must point to isolated staging/test databases (e.g. `staging-db`, `ecopin-staging`).
     - Connection strings targeting production hostnames (`db.ecopin.ph`, production Supabase project refs) immediately trigger automated build and deployment rejection.

4. **Live Citizen Evidence Storage Bucket Quarantine:**
   - Staging and preview deployments must **never read from or write to live citizen photo and evidence storage buckets**:
     - Production buckets (`report-evidence`, `cleanup-task-photos`, `report-cleanup`) contain real citizen photos and geotagged PII.
     - Staging and preview environments must use isolated sandbox or prefixed buckets (e.g., `staging-report-evidence`, `preview-task-photos`, or ephemeral mock storage).
   - Any deployment configuration attempting to bind to production bucket names without sandbox prefixes is flagged as a critical non-compliance violation.

5. **Automated Verification Endpoints & Audit Protocols:**
   - Backend API:
     - `GET /api/admin/infrastructure/environment-audit`: Evaluates live runtime environment against the 4 isolation invariants and issues a cryptographically hashed compliance audit.
     - `POST /api/admin/infrastructure/verify-preview-isolation`: Executes access simulation, debug header rejection, and database/storage cross-contamination checks for custom preview configs.
   - Automated Verification Commands:
     - Backend: `npm test -- tests/staging-preview-audit.test.js` (32/32 passing).
     - Web: `npm run test:preview-audit` (passing).

---

### 1.6 Git Remote History, Deleted Branches & Repository Visibility Audit (#WT-36)

#### Executive Summary & Scope
A comprehensive git security audit was conducted across all four project repositories under the EcoPin organization:
1. `baldopadua/ecopin-web` (Web frontend & Next.js reverse proxy)
2. `klacom/ecopin_backend_node` (Express & microservices backend)
3. `klacom/ecopin_app` (Flutter mobile client)
4. `klacom/ecopin_ml_models` (Machine learning & spatial forecasting models)

#### Repository Visibility & Fork Assessment
- **Visibility:** All 4 repositories are configured as **public** (`private: false`) on GitHub.
- **Forks:** As of the audit timestamp (2026-10-17), zero forks exist across all 4 repositories (`forks_count: 0`).
- **Implication:** Any secret or credential committed to any branch, tag, or historical commit is immediately visible to any public viewer or automated scanner indexing GitHub public commits.

#### Historical Commit & Reflog Audit Methodology
An exhaustive scan was executed across:
- All active local and remote tracking branches (`git log --all -S ...`).
- All git tags and annotated releases (`git tag -l`).
- Reflog entries and historical checkout trees (`git log -g -S ...`).
- Dangling and orphaned objects discovered via `git fsck --lost-found`.

The scan searched for high-entropy tokens and database connection strings, specifically:
- Raw JWT signatures (`eyJhbGciOi...`).
- Supabase `service_role` and `anon` tokens.
- PostgreSQL URI strings (`postgres://...` / `postgresql://...`).
- Cloudinary API secrets and keys.
- Personal access tokens (`ghp_...`, `github_pat_...`).

#### Critical Security Finding & Impact Analysis
> [!CAUTION]
> **CRITICAL VULNERABILITY: Active Supabase `service_role` Key Discovered in Historical Git Commit**
> - **Repository:** `klacom/ecopin_backend_node`
> - **Commit of Introduction:** `6254c94b39532e483c96627db1953b178301f7f5` (Committed on Sat Sep 26 13:28:03 2026 +0800 by `kcom <klarenzcobie99@gmail.com>`).
> - **File Introduced:** `test_supabase.cjs` (37 lines).
> - **Exposed Secret Content:**
>   - `supabaseUrl`: `https://wcruoyygungqxazdwhtv.supabase.co`
>   - `supabaseKey`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcnVveXlndW5ncXhhemR3aHR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTk4Mjc4NCwiZXhwIjoyMDk1NTU4Nzg0fQ.GwFiSXJpD-B5nP7lATUjTJVKJ-6NHbvpuMM37lUAuBw`
> - **Commit of Deletion:** `712de04aa4bd1770f587f5a5a43fcec32b4f4c20` (Committed on Sat Oct 3 12:03:42 2026 +0800).
> - **Exposure Scope:** While the file was removed from the active working tree on Oct 3, 2026, it **remains permanently embedded in git history** on branches:
>   `origin/master`, `origin/HEAD`, `origin/codex/supabase-optimization-audit`, `origin/feature/mixed-workflow-slice-a`, `origin/feature/mixed-workflow-slice-b`, `origin/feature/mixed-workflow-slice-c`.
> - **Live Validity Verification:** Live API testing against Supabase endpoint `https://wcruoyygungqxazdwhtv.supabase.co/rest/v1/profiles?select=count` returned **HTTP 200 `[{"count":9}]`**. The token is **active and valid**, allowing full administrative read/write access and complete bypass of Row Level Security (RLS) policies.
> - **Clean Repositories:** Audits of `ecopin-web`, `ecopin_app`, and `ecopin_ml_models` confirmed zero exposed service-role keys or database credentials in their commit histories.

#### Mandatory 3-Step Remediation Runbook

##### Step 1: Immediate Credential Revocation & Secret Key Migration (Zero-Downtime Secret Rotation)
1. Navigate to the Supabase Cloud Management Console for project `wcruoyygungqxazdwhtv`:
   - `Settings -> API -> JWT Settings`.
2. Click **Generate New JWT Secret** / **Rotate Secret** or generate a new **Secret Key** (`sb_secret_...`).
   - This immediately invalidates the compromised `service_role` JWT (signature `GwFiSX...`).
3. Update production environment secrets in backend hosting (PM2 / Docker / Cloud Run):
   - Set `SUPABASE_SECRET_KEY` to the newly generated secret key (or rotated `service_role` key).
   - Deprecate any usage of `NEXT_PUBLIC_SERVICE_ROLE_KEY`.
   - Restart backend instances gracefully: `pm2 reload backend`.

#### Impact of Secret Key Migration on Committed Key Finding
> [!NOTE]
> **Does migrating to the Supabase Secret Key solve the committed service role key finding?**
>
> **1. Live Security & Active Exploitation Threat: RESOLVED**  
> Yes. Migrating to the new secret key and rotating the project JWT secret invalidates the old JWT token. Any subsequent request attempting to use the leaked token (`eyJhbGciOi...GwFiSX...`) will be immediately rejected with `401 Unauthorized` / `invalid JWT signature`. The active vulnerability is fully neutralized.
>
> **2. Git Repository History & Audit Hygiene: STILL REQUIRES GIT-FILTER-REPO**  
> While the token is dead against the live Supabase instance, the literal text remains stored in commit `6254c94b39532e483c96627db1953b178301f7f5` on public GitHub branches. Automated scanners (e.g. GitHub Secret Scanning, GitGuardian, TruffleHog) will continue to flag the repository. Therefore, executing **Step 2 (`git-filter-repo`)** remains mandatory to cleanse the repository history.

##### Step 2: Git History Scrubbing & Cache Purging
1. Install `git-filter-repo` (recommended over BFG for comprehensive tree rewrite):
   ```bash
   pip install git-filter-repo
   ```
2. Clone a fresh mirror of `ecopin_backend_node`:
   ```bash
   git clone --mirror https://github.com/klacom/ecopin_backend_node.git backend-mirror.git
   cd backend-mirror.git
   ```
3. Expunge the sensitive test file and credential pattern across all historical branches and tags:
   ```bash
   git filter-repo --invert-paths --path test_supabase.cjs
   ```
4. Confirm with an automated scan that the string `wcruoyygungqxazdwhtv` no longer appears in any commit:
   ```bash
   git log --all -S "wcruoyygungqxazdwhtv"
   # Output must be completely empty
   ```
5. Force-push the sanitized history to the remote repository:
   ```bash
   git push --force --all origin
   git push --force --tags origin
   ```
6. Contact GitHub Support or file a ticket to purge GitHub's internal dangling commit cache for the repository.

##### Step 3: Forensic Audit of Supabase Access Logs
1. Navigate to Supabase Dashboard -> **Logs** -> **API Logs** or **Edge Logs**.
2. Query all requests containing the compromised JWT ID/issuance timestamp (`iat: 1779982784`) or originating from unknown IP addresses outside the authorized production server cluster (`app.ecopin.ph` and backend host IP).
3. Confirm that no unauthorized data exfiltration or table alterations occurred during the exposure window.

#### Automated Audit Tooling & Verification Endpoints
- **CLI Runner:** `scripts/audit-git-history.mjs` (scans current working tree, staged diffs, and historical commits for known secret signatures, including legacy service-role JWTs, modern `sb_secret_` keys, and `sbp_` tokens before push).
- **Backend Admin API:**
  - `GET /api/admin/infrastructure/git-history-audit`: Generates an authoritative git history audit report with repository visibility status, commit health, and remediation instructions.
  - `POST /api/admin/infrastructure/verify-git-cleanliness`: Validates a provided diff, commit SHA, or repository payload against secret leak signatures.
- **Verification Commands:**
  - Backend: `npm test -- tests/git-history-audit.test.js` (passing).
  - Web: `npm run test:service-role-bundle` (passing).

---

## 2. Production Pre-Deployment Checklist

Before deploying `ecopin-web` and `ecopin_backend_node` to production environments, verify the following configuration requirements and post-deployment validation steps.

### 2.1 Server-Only Environment Variables

The following environment variables **must never** be exposed to browser JavaScript (no `NEXT_PUBLIC_` prefix):

| Variable Name | Environment | Purpose & Constraint |
| --- | --- | --- |
| `SUPABASE_SECRET_KEY` | Backend | High-privilege administrative secret key for Supabase DB access. Replaces legacy `service_role` key. Keep strictly confidential. |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Backward-compatible alias for `SUPABASE_SECRET_KEY` if legacy JWT is still temporarily used during cutover. |
| `SESSION_REDIS_REST_URL` | Web Server | Upstash/Redis REST endpoint URL for server session storage. Must be HTTPS. |
| `SESSION_REDIS_REST_TOKEN` | Web Server | Upstash/Redis REST bearer authorization token. Keep strictly confidential. |
| `SESSION_ENCRYPTION_KEY` | Web Server | 64-character hex string representing a 32-byte secret key used for AES-256-GCM authenticated session data encryption. |
| `FRONTEND_URL` | Web & Backend | Canonical production HTTPS origin (e.g., `https://app.ecopin.ph`). Used for CSRF Origin verification, HSTS header emission, and backend CORS allowlisting. No trailing slash. |
| `BACKEND_API_URL` | Web Server | Private URL for `ecopin_backend_node` service (e.g. `http://backend.internal:4002` or private service mesh). |
| `JWT_SECRET` | Backend | High-entropy secret key for signing internal access tokens. |

### 2.2 Client-Facing Public Variables

Only allowlisted public configurations may carry the `NEXT_PUBLIC_` prefix:

| Variable Name | Purpose | Safe Scope |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public API URL | Read-only anonymous access to public views (`public_reports`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Anon JWT | Low-privilege anonymous token; strictly bounded by RLS. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public Publishable Key | Modern Supabase publishable key alternative to anon key. |
| `NEXT_PUBLIC_CARTO_API_KEY` | Map Tile Access | Standard public basemap tile fetching. |

---

### 2.3 Post-Deployment Verification Steps (Smoke Test)

Execute these validation commands against the deployed production host:

```bash
# 1. Verify Security Headers & HSTS on Root Document
curl -s -I https://app.ecopin.ph/ | grep -E "(Content-Security-Policy|Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options|Referrer-Policy)"

# Expected:
# Strict-Transport-Security: max-age=86400
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Referrer-Policy: strict-origin-when-cross-origin
# Content-Security-Policy: default-src 'self'; ...

# 2. Verify Session Diagnostic Route is Absent (404)
curl -s -o /dev/null -w "%{http_code}\n" https://app.ecopin.ph/test-session
# Expected: 404

# 3. Verify Untrusted Origin Rejection (CORS & CSRF Gate)
curl -s -X POST https://app.ecopin.ph/api/tasks/auto-generate/preview \
  -H "Origin: https://malicious-site.com" \
  -H "Content-Type: application/json" \
  -d '{"config":{}}' -o /dev/null -w "%{http_code}\n"
# Expected: 403

# 4. Verify Unauthenticated Route Preview Denial
curl -s -X POST https://app.ecopin.ph/api/tasks/auto-generate/preview \
  -H "Origin: https://app.ecopin.ph" \
  -H "Content-Type: application/json" \
  -d '{"config":{}}' -o /dev/null -w "%{http_code}\n"
# Expected: 401

# 5. Verify Backend CORS Rejection
curl -s -I https://api.ecopin.ph/api/auth/me \
  -H "Origin: https://untrusted-origin.org" | grep "HTTP"
# Expected: HTTP/1.1 403 Forbidden

# 6. Verify Dashboard Anti-Caching & Edge CDN Prevention (WT-49)
curl -s -I https://app.ecopin.ph/dashboard/admin \
  | grep -iE "(cache-control|cdn-cache-control|surrogate-control|pragma|expires)"
# Expected:
# Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
# Pragma: no-cache
# Expires: 0
# Surrogate-Control: no-store
# CDN-Cache-Control: no-store

# 7. Verify TLS 1.3 Protocol & Strict 1-Year HSTS Enforcement (WT-50)
curl -s -I https://app.ecopin.ph/ | grep -i "strict-transport-security"
# Expected:
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

openssl s_client -connect app.ecopin.ph:443 -tls1_3 < /dev/null 2>&1 | grep -E "(Protocol|Cipher)"
# Expected:
# Protocol  : TLSv1.3
# Cipher    : TLS_AES_128_GCM_SHA256 (or TLS_AES_256_GCM_SHA384)
```

### 1.7 Report Status vs Operational Lifecycle Stage Taxonomy Disambiguation (#WT-22)

To eliminate ambiguity across citizen interfaces, administrative dashboards, and mobile field-crew views, the EcoPin data model and user interfaces enforce a strict tripartite taxonomy separating **Citizen Review Status**, **Citizen Resolution Status**, and **Operational Lifecycle Stage**:

| Dimension | Database Column / Type | Values | Semantic Meaning | Interface Presentation |
| :--- | :--- | :--- | :--- | :--- |
| **Citizen Review Status** | `reports.validation_status` (`report_validation_status`) | `pending`, `pending_ai_validation`, `manual_review`, `approved`, `rejected` | **Content Moderation & AI/LGU Verification**: Tracks whether a submitted citizen photo/report is legitimate, conforms to platform safety standards, or requires human inspection. | UI Label: **"Review Status"** (`Review: Approved`, `Review: Manual Moderation`, `Review: Pending AI`, `Review: Rejected`). |
| **Report Status (Citizen Resolution)** | `reports.status` (`report_status`) | `unresolved`, `in_progress`, `resolved`, `closed`, `pending_owner_consent`, `waiting_for_feedback` | **Citizen-Facing Issue Resolution**: Tracks whether the reported environmental hazard is open, undergoing action, awaiting property owner consent/citizen feedback, or completed/closed. | UI Label: **"Report Status"** (`Status: Unresolved`, `Status: In Progress`, `Status: Resolved`, `Status: Closed`, `Status: Awaiting Consent`). |
| **Operational Lifecycle Stage** | `reports.stage` (`lifecycle_stage`) | `submitted`, `assigned`, `in_progress`, `resolved`, `closed` | **Field Dispatch & Logistics Lifecycle**: Tracks operational state machine progression across LGU dispatch, field crew routing, on-site cleanup, and post-cleanup inspection. | UI Label: **"Operational Stage"** (`Operational: Logged`, `Operational: Dispatched`, `Operational: In Progress`, `Operational: Field Resolved`, `Operational: Closed`). |

#### Disambiguation Rules:
1. **Never conflate Review with Operational Lifecycle:** An `approved` review does not mean the report is `resolved`; it merely signifies that the report passed content validation and is eligible for spatial clustering and dispatch.
2. **Never conflate Resolution with Field Dispatch:** A report marked `in_progress` under `reports.status` indicates the issue is actively being addressed by the municipality, while `stage = 'assigned'` indicates that a specific field crew and route have been dispatched.
3. **Table & Details Page Clarity:**
   - In table views (`/dashboard/raw-data`, `/dashboard/officer/reports`), columns are explicitly titled **"Report Status"**, **"Review Status"**, and **"Operational Stage"**.
   - In detailed report views (`/dashboard/raw-data/[id]`), badges are visually grouped into categorized semantic badges (`Report Status`, `Citizen Review`, `Lifecycle Stage`) to prevent confusing overlapping terms such as `resolved` and `approved`.

---

### 2.4 Server Session Cookie Verification
Upon successful staff login via `/api/session/login`:
- Inspect the response `Set-Cookie` header:
  - Cookie name: `__Host-ecopin_session`
  - Attributes: `HttpOnly; Secure; SameSite=Lax; Path=/`
  - Ensure **no** `Domain` attribute is present (ensuring host-only binding).
  - Ensure browser `localStorage` and `sessionStorage` remain completely free of auth tokens.


