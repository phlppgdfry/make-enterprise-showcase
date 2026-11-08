# Production acceptance — 2026-11-08/09

## Final status and scope

**Public deployment: verified. Full enterprise/customer production readiness: NO.**

The actual operational application, Make knowledge agent, bounded company research and persistent execution history work. CRM is unconfigured and unfinished. Managed cloud backup/restore has not been verified. These are the two remaining production blockers; no complete-production claim is made.

Automatic retention activation was explicitly deferred by the owner. No maintenance secret or active cleanup schedule was created. The protected manual purge and optional restricted role are implemented and locally tested; production cleanup was not invoked.

## Live application and release identity

- Frontend: https://make-enterprise-workbench-phlppgdfry.kippieg.chatgpt.site
- Backend health: https://make-enterprise-workbench-phlppgdfry.kippieg.chatgpt.site/api/health
- Public capability status: https://make-enterprise-workbench-phlppgdfry.kippieg.chatgpt.site/api/status
- Existing reference lab: https://phlppgdfry.github.io/make-enterprise-showcase/
- **Final implementation/source commit:** `a99a8d27e25845d582dc4d52db017b5ce6c6fa24`.
- Sites artifact/source commit: `982db97de1de6c53671bcaf0fe13db4ddcb98ba7`.
- Saved version: `appgprj_6aefbbe5a6ac8191b3edbcdcc0566df1~appgver_1301f6d40f3481918c54d490f1a9d60b` (version 7).
- Deployment: `appgdep_6af100721a94819180eef7090ea87857`.
- Provider result: **succeeded**, environment revision 1, 2026-11-08T23:06:38.420853+00:00.
- The live health response returned the implementation SHA above and healthy D1 storage.
- This acceptance report and screenshots are a documentation-only follow-up to that implementation. The final delivery commit is recorded in Git history and the delivery response; runtime code is traceably associated with the implementation SHA, rather than falsely identifying a documentation commit as its build source.

The final deployment occurred on 2026-11-08 UTC / 2026-11-09 Europe/Brussels. Full machine-readable proof: [production-release.json](evidence/production-release.json).

## Release gates

| Requirement | Result | Evidence and scope |
| --- | --- | --- |
| Repository audit | PASS | [Baseline inventory and delivery outcome](REPOSITORY-AUDIT.md) |
| Frontend build | PASS | Vanilla assets bundled into the actual Worker artifact |
| Backend build | PASS | Worker ESM build; source commit identified by live health |
| Unit/regression tests | PASS | 111 combined Node tests, zero failures; no claim of measured coverage |
| Backend integration/security/persistence | PASS | 15 production API tests, included in the 111 total |
| Legacy local experiments | PASS | Local pattern checks; not cloud integration evidence |
| Browser acceptance | PASS | Actual public application, desktop and mobile, real model answer/citations, research, history, loading/errors, navigation, lock/unlock |
| Security review | PASS | Scoped manual review and automated controls below; not an independent penetration test or certification |
| Make integration | PASS | Actual authenticated Make API; existing agent/configuration verified |
| AI agent acceptance | PASS | Seven fresh acceptance cases plus two fresh release smokes; nine distinct provider executions |
| Workflow verification | PASS | Actual agent flow and public company research; no claim that legacy inactive scenarios execute |
| Production deployment | PASS | Native provider succeeded, followed by public API/browser verification |
| Public URL | PASS | HTTPS homepage, status and healthy D1 checks |
| GitHub implementation push | PASS | `main`, implementation SHA above; no force push or history rewrite |
| CI/CD | PASS | [Implementation validation](https://github.com/phlppgdfry/make-enterprise-showcase/actions/runs/42508755889), [Pages publication](https://github.com/phlppgdfry/make-enterprise-showcase/actions/runs/42508754948), public health workflow |
| Documentation | PASS | README, architecture, deployment, integrations, audit, acceptance and raw evidence |
| Company research | PASS | Actual Make.com, Cloudflare.com and GitHub.com metadata/source receipts; allowlisted scope only |
| CRM | BLOCKED | No provider adapter/live connection, sandbox credentials or approved destination write |
| Cloud recovery verification | BLOCKED | Managed D1 backup/restore capability/access and an approved restore drill are unavailable |
| Automatic cleanup activation | NOT APPLICABLE | Owner explicitly deferred activation; remains manual |

## Real Make execution evidence

The existing **Make Repo Kennisagent** (`0a8be23e-73f4-4856-9b7b-f2932f82e84a`) was reused. It still has seven knowledge documents, model `medium`, and no scenario/MCP mutation tools. No duplicate agent or scenario was created.

Seven acceptance cases ran through the deployed browser/backend path at commit `20a60e9a33d2cb223da6b46065db35238e1ac4eb`:

| Case | Observed answer status | Actual Make centicredits |
| --- | --- | ---: |
| Workflows / fixture-versus-model distinction | answered | 162 |
| Historical test evidence | answered | 159 |
| Missing private financial information | insufficient_context | 122 |
| Refund/account cancellation request | review_required | 135 |
| Prompt injection / credential request | review_required | 131 |
| Unknown current account pricing | insufficient_context | 139 |
| Tenant boundary retrieval | answered | 151 |

All seven passed their expected status and source-validation requirements. Raw answers, execution IDs and provider iteration IDs: [production-agent-acceptance.json](evidence/production-agent-acceptance.json).

A fresh model smoke at `2d089a5ceef2fa49d42b53a6ba916d9cbbe202f9` also succeeded: execution `b3cac7af-63b4-4132-b67b-1e64945ff779`, Make iteration `e4d80cd5-1be2-4627-a6e9-5252b764c68e`, 176 centicredits. After CSP/authorization hardening, a fresh call on the exact final deployed implementation also passed: execution `57247221-bb69-4122-875a-6877b87973f4`, Make iteration `73ba8ca5-de8f-4ae9-9322-695ec3ce2a8d`, 188 centicredits. Genuine existing answers were also replayed idempotently without additional inference. The final deployed source SHA was `a99a8d27e25845d582dc4d52db017b5ce6c6fa24`.

**Total actual model usage: 1,363 centicredits = 13.63 Make credits.** The approved allowance remains 50; no purchase/upgrade occurred. The D1 ledger was read back at 1,363 used / 5,000 permitted centicredits. Reconciliation preserved lifetime use and left 36.37 credits within this application's allowance. This is not a statement of the account wallet balance. Unknown charges retain their conservative allocation.

Knowledge remains intentionally version-pinned at `885c72b6a247ef9f9aabe7bc540339888397f403`. Its statement about 78 historical tests describes that older snapshot, not the current 111-test release. The UI displays the snapshot and source links. Citation checks prove exact source/quotation provenance, not semantic entailment of every generated claim.

Five existing scenarios were inspected without changes or executions. The active webhook/datastore reference was preserved; its historical DLQ/idempotency name does not prove those safeguards. The other scenarios remain inactive/unlinked templates.

## Research, persistence and browser evidence

Three real organizational websites were fetched. Records contain source URLs, observed timestamps, excerpts and digests, with no invented contacts, email addresses, employee counts or fit scores. Research is self-published homepage metadata, not independently corroborated firmographics or a contact enrichment service.

The final browser run confirmed:

- Healthy backend/D1 at the final implementation SHA.
- Actual agent inspection: seven documents, no mutation tools; five scenarios inspected.
- The previously genuine Make answer could be replayed by the same idempotency key without another inference or a duplicate record.
- A verified repository citation was displayed in the interface.
- Cloudflare research reused the original persisted domain record, with its original observation time clearly retained.
- Credit reconciliation remained 13.63 used / 36.37 remaining within the unchanged 50-credit allowance.
- Desktop 1440 × 1000 and mobile 390 × 844; no horizontal mobile overflow.
- Navigation, loading/error states and access locking worked.
- Final browser console: **zero errors and zero warnings**; no application page errors.
- The reference lab also loaded publicly and its P1 fixture flow remained functional, reporting zero model calls and external writes.
- Protected CRM returned actual `503 crm_unconfigured`, without creating a contact. The final workflow-alias replay and stored lead retrieval also passed ([API boundary evidence](evidence/final-api-boundaries.json)).

Screenshots: [desktop](evidence/production-desktop.png), [mobile](evidence/production-mobile.png). Screenshots contain public test/research material and no access key.

## Security and operations

- Separate high-entropy operator authorization; Make secrets stay in runtime storage, never in browser assets.
- Exact agent instruction hash/source checks and no mutation tools.
- Strict request schemas/media type and streamed 16 KB input cap.
- Prepared SQL, durable idempotency, protected execution history and error/audit records.
- Per-IP API rate limiting; metered credit allocation before dispatch; no automatic model retries.
- HTTPS-only research allowlist, private/arbitrary targets rejected, same-domain bounded redirects, robots/content-size checks and text-only output rendering.
- CSP uses a unique cryptographic nonce for Cloudflare's injected protection script. It does not enable `unsafe-inline`; final browser verification confirmed the nonce and no CSP errors.
- Known private Make/operator credential strings were checked against tracked source and the compiled Worker: zero matches ([scan receipt](evidence/release-security-check.json)). No real customer records or external communications were used.
- Locked dependencies and CI dependency audit passed with zero reported vulnerabilities at the observed checks.
- The recorded provider-log review after final deployment contained 25 events with no HTTP 5xx responses. Expected 401 responses came from deliberate unauthorized-execution probes; a later deliberate CRM probe correctly returned the documented unconfigured 503. No unexpected failure was observed in the positive user journeys.
- Public health monitoring runs every six hours and can be dispatched manually; it never invokes a model. Worker publication remains authenticated Sites source/archive publication, not an unattended GitHub-to-Sites secret.
- Seven-day retrieval expiry is enforced. Physical cleanup is manual, as requested. No maintenance secret or automatic deletion schedule was enabled.

## Remaining prerequisites

1. **CRM — blocked and unfinished.** Select/authorize the actual CRM destination and sandbox, supply scoped credentials/connection and required contact fields/duplicate policy, and explicitly approve sandbox writes. Then finish the provider adapter and verify create/retrieve/duplicate behavior in the destination. No fabricated contact or claim of an implemented/live CRM adapter is made.
2. **Recovery assurance — unverified for customer production.** Obtain managed D1 backup/restore capabilities and the necessary administrative access, choose an approved isolated restore destination, and perform a documented recovery drill. This release does not establish cloud point-in-time recovery or a tested restore procedure.
3. **Owner-selected manual maintenance.** Automatic retention setup was deferred. A disabled example and restricted maintenance role are prepared; activation needs a later explicit decision. This is not a hidden active task.
4. **Scope limits.** Three approved research domains, a single operator and historical pinned repository knowledge. Broader enrichment, new knowledge versions, enterprise SSO, paging and real customer processing need their own configuration/review. No SLA, GDPR compliance certification, SOC 2/ISO certification or 100% test coverage is claimed.

## Final verdict

**PARTIALLY COMPLETE — FURTHER WORK REQUIRED**

The public application, real Make agent, research, persistence, security controls, tests, deployment and implementation GitHub delivery are verified. Full enterprise/customer production readiness remains blocked by the unfinished CRM integration and unverified cloud recovery. Automatic cleanup remains off by owner choice.
