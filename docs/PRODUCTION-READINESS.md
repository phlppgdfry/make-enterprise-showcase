# Current readiness and remaining work

Version 2.4 adds an owner-approved HubSpot test-contact adapter and a ten-check desktop/mobile browser CI gate. The account/service key and encrypted secret are configured; final real destination evidence is added after publication in [HubSpot integration](HUBSPOT-INTEGRATION.md). The dated 2.3.1 audit below remains historical. These changes do not activate cleanup, customer-data writes, Slack messages or the legacy scenarios.

Audited 24 November 2026. This is the current completion checklist; older acceptance reports retain their original dates and measurements.

**The public showcase has working agent, company-metadata research, persistent receipts and private export paths. The complete enterprise integration mission is not finished.** Adding more decorative features is lower priority than completing the external connections, recovery and operational ownership below.

## Completed in this audit

- Fixed a privacy inconsistency: expired execution data was hidden from history/direct lookup but could still be returned through a retained idempotency key. Expired replay now returns 410 without private results or repeated upstream work. Queued/running duplicates return 202.
- Replaced full buffering before Make's response-size check with a byte-bounded stream reader. Oversized success bodies are canceled; upstream error bodies are canceled without reading. Existing safe errors and rate-limit behavior are preserved.
- Added three meaningful regression tests, bringing the suite to **117 Node tests** (including 21 production-boundary tests), plus the existing local pattern experiments. These deterministic tests do not run a cloud model.
- Expanded the free scheduled public smoke to verify binary icon signatures, social preview, manifest and anonymous denial for backup/history/workflow reads, alongside HTTPS health, D1, CSP and metered-request denial.
- Corrected stale test/credit totals and linked this checklist from the application and README. The retained 22 November live receipts establish ten provider executions and 15.19 reported credits. This audit requires zero new model calls.
- Re-inspected Make: five scenarios, one active/four inactive; CRM scenario 8199351 remains inactive and reports an empty connection list. No scenario was run, activated, modified or deleted. No CRM data or messages were written.

Publication and free live-verification receipts for this patch are linked in the final delivery section below. Historical live agent, website-research and recovery evidence is in [version 2.3](RELEASE-2.3.0.md).

## Required to finish the original enterprise mission

| Priority | Task and current state | Exact prerequisite | Acceptance criterion |
| --- | --- | --- | --- |
| P0 | CRM integration — missing destination configuration and adapter | Authorized CRM sandbox, scoped credentials, required fields/duplicate policy, explicit approval for test writes | Validated create/read/update adapter; duplicate and error tests; approved test record read back from the actual destination; no communications |
| P0 | Remaining legacy scenarios — templates, not verified production flows | Intended business systems, scoped connections, gateway/schema configuration and safe fixtures per scenario | Review each actual Make blueprint and mapping; prove a real successful run, failed run and duplicate behavior against the chosen systems |
| P0 | Managed recovery — private export/local restore exists, hosted recovery unverified | Hosting-admin recovery capability, approved isolated restore target and recovery objectives | Restore a current snapshot in isolation; verify data and lifetime budget; document measured recovery time, rollback and responsible operator |

The active webhook/datastore scenario must also be reviewed before testing: its fixed fallback order key can affect existing records. Do not treat its enterprise name as proof of HMAC, DLQ or exactly-once behavior. This checklist does not authorize destructive tests, customer-data writes, paid services or outbound messages.

## Before real customers or several operators

| Priority | Improvement | Why and completion criterion |
| --- | --- | --- |
| P1 | Individual sign-in, roles and ownership | Current access is a shared single-operator bearer key, not SSO or tenant isolation. Choose the identity provider; add per-user authorization, revocation and audit attribution before multiple operators/customer records |
| P1 | Dedicated Make token and rotation procedure | Existing token may be broader than necessary. Owner creates an appropriately scoped token; securely rotate, redeploy, verify and revoke the previous token after success |
| P1 | Retention decision and capacity monitoring | Seven-day visibility is **not** seven-day physical deletion. Cleanup is explicitly deferred; expired rows and minute-rate buckets accumulate. Private exports reject more than 1,000 rows/table or 5 MB. Select an approved cleanup/archive policy before growth; preserve lifetime credits and any required idempotency tombstones |
| P1 | Backup custody and schedule | Downloadable JSON is not an encrypted, independently retained backup policy. Select approved encrypted storage, access/retention and restoration ownership; no extra secret/storage service is provisioned by this audit |
| P1 | Monitoring ownership and incident alerts | The six-hour public smoke is useful but is not an SLA, runtime log drain or paging system. Name an owner and alert destination; agree latency/error/cost thresholds; exercise failure notification only after communication approval |
| P1 | Stale or interrupted execution handling | Provider timeouts are retained as uncertain and never auto-retried. A Worker interruption may leave queued/running records. Review with correlation/iteration IDs; design an authorized reconciliation mechanism without silently replaying paid or write operations |
| P1 | Review knowledge freshness | Seven documents intentionally describe pinned commit `885c72b6…`, not current runtime. Keep that label, or approve a reviewed version refresh with new citation and injection acceptance; never silently replace knowledge |
| P1 | Broader lead research, if required | Current pipeline extracts public homepage title/description from three approved domains. Contact discovery, independent company facts and ICP scoring require an authorized evidence provider, terms/privacy review and new adapters/tests |
| P1 | Reliable release/browser gate | Current CI tests/builds/audits; Sites publishing is authenticated/manual and browser acceptance is recorded separately. Reuse a stable browser acceptance suite in CI and link an expected canonical release SHA when a scoped deployment mechanism is available |

## Optional improvements after the prerequisites

- Add a short business case per real connected workflow: input, reviewed output, actual timing/cost and a source-backed result. Avoid projected savings as measured facts.
- Add Dutch/English interface text if the intended audience needs both; current operational UI is English.
- Add an execution search/filter and accessible result summaries when history grows; keep operator authorization and retention checks.
- Add a custom domain only if an owned domain, DNS access and any costs are approved. The current HTTPS URL is already usable.

No new dashboards, CRM substitutes, providers, databases or agent frameworks are needed merely to make the showcase look more complete.

## Verification boundaries and overlooked risks

Quoted source text and pinned URLs are validated; semantic truth of the entire AI answer is not automatically proven. Inspect sources before acting. The application agent is read-only and cannot write CRM records. The public interface accurately reports CRM as unconfigured and expired Make inspections as stale.

The 50-credit guard is an application allocation policy, not an account-wide billing limit or a guarantee of provider pricing. Unknown charges stay reserved; reconciliation never resets lifetime spend. Other Make activity is outside this ledger. The audit uses no new credits or purchases.

The backup checksum detects changed bytes but does not authenticate an untrusted file. The isolated SQLite restore establishes application-format recovery, not hosted D1 point-in-time recovery. A zero-vulnerability dependency audit is not a penetration-test certificate. No performance/load SLA, independent security assessment or customer-data compliance certification is claimed.

Automatic cleanup remains **off**. No maintenance key, cleanup schedule, new external communication or CRM write is activated by this release.

## Final delivery evidence

- [Live application](https://make-enterprise-workbench-phlppgdfry.kippieg.chatgpt.site) and [health](https://make-enterprise-workbench-phlppgdfry.kippieg.chatgpt.site/api/health): runtime commit `c62e196153aa01484b8e2f0e0e7be0199d43f826`, healthy D1.
- Sites version **9**, source artifact `3a108b76038866f9fcce77cc87b5ac442a8e49ba`, deployment `appgdep_6b04cbc2132881919a3ef04a4d8c5645` returned **succeeded**, environment revision 1 and existing public audience preserved. This documentation-only delivery follow-up leaves tested runtime code unchanged.
- Free live smoke passed: HTTPS/D1, homepage/CSP, actual capability boundaries, icons/social preview/manifest, protected read denial and unauthorized metered-request denial. No model was invoked.
- Authenticated inspection reverified the actual read-only Make agent and seven documents through the new streaming reader. A real retained expired research receipt returned **410 idempotency_expired**, without exposing its private result.
- A real production export restored in isolated SQLite with the lifetime credit ledger unchanged at **1519/5000 centicredits**. No hosted restore or cleanup was performed. The initial verification script sent an internal normalized `url` field and was correctly rejected by input validation; the corrected public-schema request passed. This was a verification-script correction, not a bypass or hidden application failure.
- Public browser checks at 1440 and 390 pixels passed: correct page, meaningful content, no framework overlay, no page/console errors or horizontal overflow; explorer, status refresh and the new checklist link behaved correctly. The checklist's published documentation URL returned HTTP 200. Browser plugin was unavailable; connected Playwright was used. No metered UI action was submitted in this audit.
- Runtime [CI validation/build/security/formatting](https://github.com/phlppgdfry/make-enterprise-showcase/actions/runs/45287778689) and [Pages publication](https://github.com/phlppgdfry/make-enterprise-showcase/actions/runs/45287778535) succeeded. Local Node suite: **117 passed, zero failures**; dependency audit: **zero reported vulnerabilities**.

Machine-readable evidence: [release/deployment/browser receipt](evidence/release-2.3.1.json), [live API/expired replay/recovery receipt](evidence/release-2.3.1-live.json). Raw private database records and credentials are excluded. Screenshots were inspected locally; they are not copies of mocked agent results.

Full enterprise verdict remains **PARTIALLY COMPLETE — FURTHER WORK REQUIRED** until the three P0 items pass. For real customer use, the P1 identity, privacy, recovery custody and operating responsibilities must also be resolved for the chosen scope.
