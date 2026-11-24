# Current readiness and remaining work

Updated 24 November 2026 after the real HubSpot acceptance. The public showcase is deployed and its controlled operational flows are verified. The full enterprise mission still has external dependencies; no complete-production claim is made.

## Verified and completed

| Capability | Evidence and boundary |
| --- | --- |
| HubSpot CRM | Real create, duplicate lookup, separate update and readback passed for marked test contact `936971617524`; independently observed in the owner's logged-in account. Customer operations remain blocked by the application policy |
| Credential handling | Dedicated HubSpot key has only contact read/write scopes and is an encrypted Sites serversecret. No key in Git/browser; temporary transfer file removed |
| Browser CI | Ten desktop/mobile Chromium checks passed locally and in GitHub Actions. Provider fixtures are explicit; actual HubSpot proof is separate |
| Regression/build/security | 127 Node tests passed, Worker built, formatting passed and dependency audit reported zero vulnerabilities for release 2.4. Known credential scan found zero matches |
| Agent and research | Existing real Make knowledge agent and bounded public website research remain available. The seven uploaded agent documents are historical; a controlled current-release addendum is being prepared separately |
| Persistence and recovery tooling | D1 execution/audit/credit ledger, idempotency, expired-result privacy, private export and isolated SQLite recovery are implemented; no managed hosted restore is claimed |

Live: https://make-enterprise-workbench-phlppgdfry.kippieg.chatgpt.site

Evidence: [HubSpot integration](HUBSPOT-INTEGRATION.md), [actual contact receipts](evidence/hubspot-live-acceptance.json), [2.4 deployment and CI](evidence/release-2.4.0.json), [previous hardening evidence](evidence/release-2.3.1.json). Runtime source is `46a4eb85d70156258c93020f17e0a7d47c342795`, Sites saved version 10, environment revision 2. Documentation-only follow-ups do not change that runtime.

## Still required for the full enterprise mission

| Priority | Remaining task | Exact prerequisite and acceptance |
| --- | --- | --- |
| P0 | Remaining legacy Make scenarios | Real destinations, scoped app connections, safe fixtures and explicit authorization for their external writes/messages. Demonstrate success, failure and duplicate behavior per scenario. One active/four inactive is inventory, not execution proof |
| P0 | Managed hosted recovery | Sites/hosting-admin recovery capability and an approved isolated restore target. Current connected Sites tools expose database reads, not managed restore. Restore and verify data/lifetime credits without overwriting production; document recovery objectives and ownership |
| P1 | Dedicated Make server token | Access to Make token management and approval for precisely required scopes; securely replace only the server credential, verify before revoking anything and preserve unrelated CLI/project credentials |
| P1 | Backup custody and alerts | Approved encrypted storage, key custody, retention and incident destination. Manual export/local restore exists; no unapproved storage upload, paging or scheduled deletion is activated |
| P1 | Knowledge freshness | Preserve the seven archived documents and add current version-pinned facts with citation/injection acceptance. Current agent/archive statements must not be mistaken for live deployment status |

The active webhook/datastore example has a fixed fallback key and must be reviewed before any test that could modify existing records. The legacy HubSpot scenario includes Slack; the direct HubSpot approval does not authorize sending Slack messages. No scenario was silently activated or deleted.

## Conditional extensions

- Multiple operators/customer records: choose an identity provider, individual sign-in, roles, revocation and per-user audit attribution. Current architecture intentionally has one operator and test records.
- Broader prospecting: requires an authorized enrichment source, reviewed terms/privacy and evidence validation. Current research is public homepage metadata, not contact discovery or independent firmographics/ICP scoring.
- Dutch interface/custom domain: useful optional presentation changes after the operational prerequisites. No domain or subscription is purchased.

## Important limits

Seven-day visibility is not seven-day physical deletion. Automatic cleanup remains **off**, explicitly deferred by the owner. Expired rows/rate buckets accumulate, and private export fails beyond 1,000 rows/table or 5 MB. Local receipt expiry does not delete HubSpot contacts. An approved cleanup/archive decision is required before growth.

The backup checksum checks integrity, not authenticity. Local SQLite recovery is not hosted D1 point-in-time recovery. Source quotations establish provenance, not automatic semantic truth of an AI answer. A zero-vulnerability dependency audit is not a security certification or SLA.

The approved 50-credit verification allowance is unchanged; the CRM/CI release made zero metered model calls and no messaging API calls. The ledger controls this application's allocations, not unrelated Make account activity.

Full enterprise verdict: **PARTIALLY COMPLETE — FURTHER WORK REQUIRED**. Controlled HubSpot CRM and browser CI are now verified rather than blocked; the remaining prerequisites above stay explicit.
