# PDT-17: explainable municipal planning proposals

Implemented locally on 29 October 2026 at `/analytics/barangay`. This replaces PDT-16's three highest-count prompts with versioned rule cards. The protected PDT-16 aggregate API supplies the data; no new endpoint, database migration, dependency or external feed was introduced.

## What a decision card contains

Each card identifies a barangay, proposed action, observed numeric evidence, exact trigger, matched rule IDs, missing resource facts, required checks and the source snapshot. Collection proposals show both month counts, percentage change, observed location coverage in both months and current backlog. Rule policy `PDT-17.1` is visible in the page and CSV.

Example: Pinagbuhatan recorded 20 submissions in August and 25 in September (+25%), with 18 open reports now. If both complete months have sufficient location coverage, the card proposes **one additional weekly collection visit for a four-week trial** and assessing **one qualified crew slot** in dispatch planning. It does not claim the existing schedule is once weekly, name an available crew, or predict the resource requirement from case counts alone.

The officer's next step opens existing dispatch planning; administrators open resource settings. Verification/blocker cards open the shared report queue. Links do not prefill, submit or commit an allocation. Existing planner capacity, vehicle load, qualification, shift, safety, consent and assignment checks remain authoritative.

## Draft rule policy

These are explicit first-version review heuristics, not adviser-approved policy, statistical significance thresholds, service deadlines or a claim of optimal allocation. Operational owners should review them before relying on them for planning.

| Rule ID | All required conditions | Proposal |
| --- | --- | --- |
| `collection-growth` | Latest two consecutive **complete Manila months** within the applied range; previous count ≥8; current count ≥10; unrounded growth ≥25%; current open backlog ≥10; known location coverage ≥80% in each month | Assess one extra weekly collection visit for a four-week trial and one qualified crew slot |
| `aged-backlog` | At least 5 currently open reports aged 7+ days | Prepare a focused clearance run; size any additional crew/vehicle plan using real task loads |
| `verification-queue` | At least 10 pending submissions from the selected creation cohort; processed fraction <80% using the actual approved/rejected denominator | Schedule a dedicated review session and inspect AI/manual-review reasons before requesting more field resources |
| `resolution-tail` | At least 10 valid resolution events; 90th-percentile duration ≥72 hours; at least 3 currently open cases aged 7+ days | Inspect access, routing and coordination blockers before increasing trucks/crews |

Resource triggers are merged into **one resource card per barangay**. Matching both growth and aged backlog never creates two independent crew requests. Verification and blocker review cards remain separate actions.

Cards sort by rule order (collection growth, aged backlog, verification, resolution tail), then strongest matching measure, then barangay name/ID. This order is transparent and is not incident severity, statutory urgency or a replacement for dispatch prioritization. The initial view shows six cards; area/type filters and Show all expose every match. CSV includes all matches, independent of visible filters and expansion.

## Evidence and safety boundaries

- Complete-month selection uses the earlier of snapshot month and current Manila month, so a newly completed month cannot be inferred from an older partial snapshot. Current-month growth is never annualized or extrapolated. A one-month selection does not support growth comparisons; other rules can still apply.
- Historical selections that exclude the latest complete snapshot month cannot generate collection-growth or resolution-tail proposals for present-day resources. Current backlog and still-pending verification remain eligible because their state is current.
- Growth uses `(current − previous) / previous × 100` before rounding. Missing, duplicate or nonconsecutive observations, zero/small baselines and insufficient monthly location coverage cannot trigger a growth allocation proposal.
- Location coverage is `(all submissions − unassigned submissions) / all submissions` for each compared month. Missing/zero denominators are unknown. Unassigned/outside/district rows never receive named barangay allocations; only canonical Pasig PSGC codes are evaluated.
- Backlog is the current all-time snapshot, including assigned work. It is not reconstructed historical month-end backlog. Verification states are current states of the selected creation cohort and include automated decisions. Resolution events and open backlog are different cohorts.
- Missing/inconsistent counts do not become zero evidence. Missing age breakdowns are explicitly unavailable. Existing PDT-16 response validation remains in force before the rule evaluator runs.
- Snapshots older than 24 hours, invalid timestamps or timestamps more than five minutes ahead produce no cards. The component rechecks time every minute. Unapplied dates, refresh loading, applied/loaded range mismatch and request failures pause the cards. Retained stale analytics do not silently remain actionable.
- Collection frequency, vehicle availability, named-crew readiness, staff hours and resource cost are not fields in the analytics snapshot. Cards explicitly require confirmation. They never invent “Crew 2 is free” or “1× → 2× weekly” as observed facts.
- Report counts include pending/rejected submissions and are not waste tonnage, population-adjusted incidence or proof that demand caused more waste. Check reporting participation and boundary-reconciliation changes before attributing growth to operational conditions. The proposed four-week review compares backlog and observed service conditions; no impact reduction is forecast.
- The 72-hour rule is an initial planning trigger, not the configured SLA deadline. Existing urgent verification, SLA and dispatch rules remain separate.

## Export and reproducibility

The existing CSV now appends every decision's rule policy, status, area, matched rules, proposal, observed evidence, trigger, prerequisite checks and snapshot timestamp. Ordinary metric/monthly tables remain. Stale snapshots can retain timestamped metric exports, but the decision section records a stale status and contains no stale proposals. UI exports remain disabled for failed/loading/unapplied ranges.

`lib/municipal-decisions.mjs` is a deterministic pure evaluator with an injectable current time. The component performs no resource writes. CSV is a review artifact, not an immutable decision/approval audit log. Rule changes should update the policy version, explanation text, boundary tests and this document together.

## Verification and rollout

- 21 rule tests cover the 25%/18-backlog example, complete-month boundaries, zero/small baselines, unrounded cutoffs, missing/duplicate month observations, location coverage, merged resources, actual review denominators, resolution sample guards, canonical areas, stale/future clocks, deterministic ordering, nonmutation, CSV completeness and missing/inconsistent counts.
- Six existing base analytics helper/proxy tests pass. The old highest-count prompt test was replaced by the rule suite because the product behavior intentionally changed.
- Full web regression: 168 unit cases and 6 deadline cases pass. Scoped analytics/rule lint passes. Production Next.js build passes.
- Browser acceptance uses synthetic protected staff sessions and coherent aggregate fixtures at 1440px light/officer, 768px dark/admin and 320px dark/officer. It verifies numeric evidence, triggers, prerequisites, role-appropriate links, area/type filtering, complete CSV despite filters, paused unapplied dates, failure/recovery, no API writes, no page overflow and no page runtime errors. The existing PDT-16 browser suite also passes at all three widths.
- An initial 320px development load timed out before rendering the decision section. The diagnostic rerun and the subsequent full browser runs passed; no reproducible page error was found. The test retains failure URL/body/error diagnostics.
- Screenshot evidence: `.ui-review/pdt17/`; logs: `unit-tests.log`, `build.log`. Screenshots are synthetic acceptance data, not reported production performance.

Deployment is pending. The existing PDT-08/PDT-16 database migrations and reviewed location reconciliation must precede production use; this task adds only the web rule/UI/export changes. No live scheduling, crew assignment or database mutation was performed. Production metrics, planning-policy sign-off and live staff acceptance remain to be verified.

Checks from `ecopin-web`:

```powershell
npm test
npm run build
node tests/municipal-decisions.browser.cjs
```

The browser script accepts `ECOPIN_PLAYWRIGHT_PATH` and `ECOPIN_CHROMIUM_PATH` for an installed local browser runtime.
