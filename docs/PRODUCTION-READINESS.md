# Current readiness and remaining work

Updated 25 November 2026 after fresh scoped-key inference, authenticated local backup/recovery and live scenario preflight. The public showcase is deployed and its controlled operational flows are verified. The full enterprise mission still has external dependencies; no complete-production claim is made.

## Verified and completed

| Capability | Evidence and boundary |
| --- | --- |
| HubSpot CRM | Real create, duplicate lookup, separate update and readback passed for marked test contact `936971617524`; independently observed in the owner's logged-in account. Customer operations remain blocked by the application policy |
| Credential handling | Dedicated HubSpot key has only contact read/write scopes and is an encrypted Sites serversecret. No key in Git/browser; temporary transfer file removed |
| Browser CI | Ten desktop/mobile Chromium checks passed locally and in GitHub Actions. Provider fixtures are explicit; actual HubSpot proof is separate |
| Regression/build/security | 132 Node tests passed, Worker built, formatting passed and dependency audit reported zero vulnerabilities for the current code. Actual HubSpot/Make/operator credential scan found zero matches |
| Agent and research | Eight real current-version agent cases passed; current source citations and an actual RAG step were verified. Seven uploaded archive documents are preserved, with a separate immutable current-release addendum. Bounded public website research remains configured |
| Scoped Make credential | Dedicated organization-bound token with only agent read/write and scenario read. Encrypted runtime secret; general CLI token retained; actual permitted/denied read checks and fresh bounded model inference passed |
| Persistence and recovery tooling | D1 receipts/ledger and authenticated AES-256-GCM local backups are verified, including actual stored-artifact recovery, wrong-key/tamper rejection and preserved credits. Key and artifact are owner-only in separate local directories; no offsite or hosted restore is claimed |

Live: https://make-enterprise-workbench-phlppgdfry.kippieg.chatgpt.site

Evidence: [current acceptance](PRODUCTION-ACCEPTANCE.md), [current runtime, model and recovery evidence](evidence/release-2.4.2.json), [scoped credential and deployment](evidence/make-runtime-credential.json), [HubSpot integration](HUBSPOT-INTEGRATION.md). Runtime source is `21038894ca4ec9331fe2b51c4519d1b7493e5d29`, Sites saved version 15, environment revision 3. Test/documentation-only follow-ups do not change that runtime.

## Still required for the full enterprise mission

| Priority | Remaining task | Exact prerequisite and acceptance |
| --- | --- | --- |
| P0 | Remaining legacy Make scenarios | Live preflight confirms a literal shared datastore key on the active scenario and missing external connection references on the inactive scenarios. Approve an isolated datastore/key policy, actual provider connections and Slack destinations/messages, then prove success/failure/duplicate behavior. No unsafe test was dispatched |
| P0 | Managed hosted recovery | Sites/hosting-admin recovery capability and an approved isolated restore target. Current connected Sites tools expose database reads, not managed restore. Restore and verify data/lifetime credits without overwriting production; document recovery objectives and ownership |
| P1 | Backup custody and alerts | Approved encrypted storage, key custody, retention and incident destination. Manual encrypted capture/local restore now passes; independent offsite custody is still missing; no unapproved storage upload, paging or scheduled deletion is activated |
| P1 | Future model usage | Explicit new allowance decision before further inference. Lifetime reported use is 46.07/50 credits; 3.93 remaining is below the five-credit fixed verification and seven-credit normal allocations. Existing answer replays are free. No credit purchase or automatic increase |

The active webhook/datastore example has a literal shared write key and must be reviewed before any test that could modify existing records. The legacy HubSpot scenario includes Slack; the direct HubSpot approval does not authorize sending Slack messages. No scenario was silently activated or deleted.

## Conditional extensions

- Multiple operators/customer records: choose an identity provider, individual sign-in, roles, revocation and per-user audit attribution. Current architecture intentionally has one operator and test records.
- Broader prospecting: requires an authorized enrichment source, reviewed terms/privacy and evidence validation. Current research is public homepage metadata, not contact discovery or independent firmographics/ICP scoring.
- Future knowledge updates: the agent uses an explicit version-pinned capability source, not automatic ingestion of every commit. New backup/probe operations are documented in the repository; expanding agent coverage requires a reviewed source refresh and funded acceptance.
- Dutch interface/custom domain: useful optional presentation changes after the operational prerequisites. No domain or subscription is purchased.

## Important limits

Seven-day visibility is not seven-day physical deletion. Automatic cleanup remains **off**, explicitly deferred by the owner. Expired rows/rate buckets accumulate, and private export fails beyond 1,000 rows/table or 5 MB. Local receipt expiry does not delete HubSpot contacts. An approved cleanup/archive decision is required before growth.

The raw backup checksum checks integrity, not authenticity. The new encrypted envelope provides authentication against tampering with a secret key, but is not a signature or independent key escrow. Local SQLite recovery is not hosted D1 point-in-time recovery. Source quotations establish provenance, not automatic semantic truth of an AI answer. A zero-vulnerability dependency audit is not a security certification or SLA.

The approved 50-credit verification allowance is unchanged. Knowledge refresh attempts used 28.97 credits, earlier verification 15.19 and the fresh scoped-key probe 1.91: total 46.07. The fixed probe and its cost-free replay passed without a budget increase. No messaging API calls were made. The ledger controls this application's allocations, not unrelated Make account activity.

Full enterprise verdict: **PARTIALLY COMPLETE — FURTHER WORK REQUIRED**. Controlled HubSpot CRM, browser CI, versioned knowledge and the dedicated Make credential are verified within the documented boundaries; the remaining prerequisites above stay explicit.
