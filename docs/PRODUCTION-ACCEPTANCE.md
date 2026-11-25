# Production acceptance — 25 November 2026

**Public release verified; unrestricted enterprise/customer production readiness: NO.** The [24 November acceptance](PRODUCTION-ACCEPTANCE-2026-11-24.md) preserves the earlier failures and fixes. The current code/release is delivered; the remaining external prerequisites are explicit in [current readiness](PRODUCTION-READINESS.md).

## Live identity

- Application/backend: https://make-enterprise-workbench-phlppgdfry.kippieg.chatgpt.site
- Health: https://make-enterprise-workbench-phlppgdfry.kippieg.chatgpt.site/api/health
- Runtime source: `21038894ca4ec9331fe2b51c4519d1b7493e5d29` (2.4.2).
- Sites artifact source: `33e9e67616225f70bb0bf7d76d09d025df627de7`; saved version **15**.
- Deployment `appgdep_6b0678c22c9c8191aa52bdf532646fa9`: **succeeded**, environment revision **3**, 2026-11-25T05:57:33.874962+00:00.
- The delivery commit containing this report is a documentation-only follow-up to the exact runtime above; its SHA is available in Git history and the delivery response.

## Verified outcomes

| Gate | Result | Evidence and limits |
| --- | --- | --- |
| Source/build/regression | PASS | 132 Node tests, including expanded encryption and credit-boundary assertions; Worker build and formatting pass |
| Integration/security tests | PASS within scope | Prepared SQL, operator/same-origin access, bounded input/output, safe CRM, provenance/version checks, idempotency, tampering/wrong-key rejection and owner-only file controls; zero reported dependency vulnerabilities, no certification claim |
| Local browser | PASS | Ten desktop/mobile Chromium checks; local provider fixtures are labelled |
| Public browser | PASS | Actual deployed desktop/mobile page, valid current source link, real saved-answer replay, private-state clearing on lock, no overflow, page/console errors or failed requests |
| Fresh Make inference with scoped runtime key | PASS | Actual existing agent call, iteration `f17e9ce5-b905-4df4-8287-5cc906297426`, valid quote, 191 centicredits |
| Idempotent release probe | PASS | Same execution replayed; zero new model calls; ledger unchanged |
| Agent preservation | PASS | Seven archive documents, current inline capability source, unchanged stored prompt/model limits and zero mutation tools verified after the probe |
| CRM | PASS for marked test records | Existing contact `936971617524` read back live; dedicated contact-only key remains configured. Original create/find/update/native-UI evidence is retained; no new CRM writes in this patch |
| Company research | PASS within allowlist/cache policy | Real Cloudflare metadata record reused with its original 22 November observation time; no invented contacts/scores and no model calls. This probe did not falsely claim a new website fetch |
| Encrypted private backup | PASS for local recovery | Actual stored AES-256-GCM file re-read/authenticated/restored, altered ciphertext rejected, 39 executions/three research rows and budget 4607/5000 preserved; key/artifact mode 0600 in separate local directories |
| Public deployment | PASS | Native provider success plus actual public health/D1/assets/auth probes |
| CI/CD for runtime | PASS | [Node/build/audit/format](https://github.com/phlppgdfry/make-enterprise-showcase/actions/runs/45556837809), [browser](https://github.com/phlppgdfry/make-enterprise-showcase/actions/runs/45556837702), [Pages](https://github.com/phlppgdfry/make-enterprise-showcase/actions/runs/45556837287) |
| Legacy scenario execution | BLOCKED | Actual five-blueprint inspection: literal datastore key on the active scenario; absent external connection references on inactive scenarios; Slack destinations/messages not authorized |
| Hosted disaster recovery | BLOCKED | Managed restore capability/admin access and an approved isolated hosted target are required; local restore is not hosted D1 recovery |
| Offsite custody/incident delivery | BLOCKED | Approved storage destination, independent key custody, retention, recovery ownership and incident recipient/channel remain required |
| Further new inference | BLOCKED by unchanged allowance | 3.93 credits remain, below the five-credit fixed-probe or seven-credit normal-request reservation |
| Automatic cleanup | NOT APPLICABLE to this release | Owner deferred activation; remains off |

The eight normal-agent acceptance cases from 24 November remain evidence for the unchanged stored agent instructions and source catalog; they were not falsely reported as eight fresh executions on this patch. The fresh bounded probe verifies the new runtime credential and narrow release profile. Exact source quotations establish provenance, not semantic entailment or flawless generated wording.

## Credit use and bounded probe

Before this patch, reported lifetime use was **44.16/50**. The owner authorized using the remaining existing allowance. A separate protected `POST /api/agent/verify` accepts only `{}` and uses a fixed public HubSpot-restriction question. It cannot accept user-supplied prompts or execution configuration. The per-run configuration caps output at 1,200 tokens and recursion at one iteration, requests no scenario/MCP tools/history, and supplies only the bounded current capability source as its instructions. The existing agent/document configuration is not modified.

This narrower profile reserves **five** credits before dispatch; arbitrary questions still reserve **seven**. Atomic reservation, durable receipts, no automatic retry and lifetime receipt reconciliation remain in force. The [official run API](https://developers.make.com/api-documentation/api-reference/ai-agents) supports per-run token/iteration configuration; [Make usage](https://help.make.com/credit-usage-for-ai-agents) remains dynamic. Reservation is an application control, not a Make account-wide or provider-side billing cap. The actual fresh call cost **1.91**; reported lifetime use is now **46.07/50**, leaving **3.93**. A second invocation replayed the same execution with no added cost. There was no purchase, allowance increase, budget reset or further new inference.

The existing capability source is intentionally pinned at `21dad08c5aaed036a2057e6f993911d3b051d776` and the seven archive documents at `885c72b6a247ef9f9aabe7bc540339888397f403`. New backup/probe operations are documented in the repository; the agent does not automatically ingest every new commit. A later source refresh must retain controlled acceptance and obtain any needed additional model allowance.

## Evidence and custody

- [Release/deployment/tests](evidence/release-2.4.2.json)
- [Fresh real Make response and receipt](evidence/release-2.4.2-agent.json), [free replay](evidence/release-2.4.2-agent-replay.json)
- [Actual encrypted-artifact recovery/tamper checks](evidence/release-2.4.2-encrypted-backup.json), [secure backup operation](SECURE-BACKUP.md)
- [Research/cache provenance](evidence/release-2.4.2-research.json)
- [Live operations/HubSpot/read-only agent inspection](evidence/release-2.4.2-operations.json), [public browser](evidence/release-2.4.2-browser.json)
- [Five live scenario preflights](evidence/release-2.4.2-make-readiness.json), [five-minute provider error review](evidence/release-2.4.2-worker-review.json)

The compiled artifact and 199 tracked/build files were checked for the actual local Make CLI token, operator key and raw/encoded backup key: zero matches. The commit secret scanner remains enabled. The key and encrypted database artifact are excluded from Git. No raw headers/IPs, plaintext backup, real customer records or credentials are part of the published evidence.

The encrypted artifact and key currently reside on the same owner's Mac in separate directories. This is not offsite recovery or independent key escrow. No backup upload, scheduled deletion, Slack/email message, legacy scenario activation/edit or customer-data write occurred. Seven-day visibility still does not physically delete old D1 rows or external HubSpot contacts.

## Final verdict

**PARTIALLY COMPLETE — FURTHER WORK REQUIRED**

The authorized application changes, scoped-key inference, authenticated local backup/recovery, tests and public release are verified. Complete enterprise readiness still requires the documented external scenario/recovery/custody prerequisites and a further budget decision for future new model activity.
