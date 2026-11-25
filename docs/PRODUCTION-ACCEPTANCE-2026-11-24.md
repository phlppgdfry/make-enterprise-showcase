> Historical acceptance. See [current acceptance](PRODUCTION-ACCEPTANCE.md).

# Production acceptance — 24 November 2026

**Public deployment verified. Full enterprise/customer production readiness: NO.** The controlled showcase, HubSpot test-contact integration and refreshed knowledge agent have actual execution evidence. Remaining dependencies are listed in [current readiness](PRODUCTION-READINESS.md). The [8–9 November report](PRODUCTION-ACCEPTANCE-2026-11-09.md) is historical.

## Deployed release

- Application/backend: https://make-enterprise-workbench-phlppgdfry.kippieg.chatgpt.site
- Health: https://make-enterprise-workbench-phlppgdfry.kippieg.chatgpt.site/api/health
- Reference lab/docs: https://phlppgdfry.github.io/make-enterprise-showcase/
- Runtime source: `80e63447f6018b3562d6c4cedd1f3e8735e2f8c0`.
- Sites artifact source: `cdd45060867ab2d81d522705736c0d480d512da5`, saved version **14**.
- Latest publication: `appgdep_6b05d01fdf2881918bf0b6f367331454`, **succeeded**, environment revision **3**, 2026-11-24T17:58:04.873401+00:00.
- Current capability source: `21dad08c5aaed036a2057e6f993911d3b051d776`; seven uploaded archive sources remain at `885c72b6a247ef9f9aabe7bc540339888397f403`.

The final delivery commit is the Git commit containing this report. It is a test/documentation-only follow-up, traceably associated with the deployed runtime above. It is not falsely reported as the runtime build SHA.

## Release gates

| Requirement | Result | Observed evidence and scope |
| --- | --- | --- |
| Repository audit/build | PASS | Existing architecture preserved; actual Worker source identified by public health |
| Unit/integration/security/regression | PASS | 132 Node tests, zero failures; includes source validation, CRM, authorization, persistence and generated production source metadata |
| Local desktop/mobile acceptance | PASS | Ten Chromium checks; provider fixtures explicitly identified |
| Live browser acceptance | PASS | Actual public desktop/mobile page, real saved Make answer replay, current citation, lock clearing, no horizontal overflow, no page/console errors or failed requests |
| Make agent acceptance | PASS | Eight distinct real current-version executions; eight pass after independent source and behavioral checks |
| Scoped Make credential | PASS for configuration/read boundaries | Organization-bound three-scope token stored encrypted; production agent/scenario inspection passed, datastore/token administration denied; general CLI token retained |
| New inference after credential rotation | BLOCKED by verification budget | 44.16/50 credits reported; remaining 5.84 is below the seven-credit allocation. No further inference, automatic retry, purchase or budget increase |
| HubSpot | PASS for controlled test records | Actual create/find/update/readback, independent native HubSpot UI observation, and fresh read-only verification after final deployment |
| Research | PASS within documented scope | Approved public website metadata; no contact enrichment or independent firmographic claims |
| Deployment/public URL | PASS | Native publication succeeded; HTTPS health/D1/status/assets and protected endpoint probes passed |
| CI/CD | PASS for runtime | [Node/build/security](https://github.com/phlppgdfry/make-enterprise-showcase/actions/runs/45452277860), [browser acceptance](https://github.com/phlppgdfry/make-enterprise-showcase/actions/runs/45452277831), [Pages](https://github.com/phlppgdfry/make-enterprise-showcase/actions/runs/45452273587) |
| Local recovery | PASS | Actual private export restored into isolated in-memory SQLite; 38 executions, three research rows and lifetime budget 4416/5000 centicredits preserved |
| Hosted recovery | BLOCKED | Hosting-admin restore capability and isolated hosted target unavailable; local restore is not hosted D1 recovery |
| Other legacy scenarios | BLOCKED | Destination-specific app connections, safe fixtures and explicit approval for external writes/messages still required |
| Backup custody/incident delivery | BLOCKED | Approved encrypted offsite destination, key custody, retention and recipient/channel required |
| Automatic deletion | NOT APPLICABLE to this release | Owner deferred activation; remains off |

No coverage percentage, penetration-test certification or enterprise SLA is claimed.

## Knowledge verification and failures

The existing **Make Repo Kennisagent** was reused, with its exact seven archive context IDs unchanged and zero scenario/MCP tools. A version-pinned current source is supplied inline in the instructions; there were no new document uploads or embedding operations.

The initial eight-case refresh passed seven cases and incorrectly used the archived 78-test figure for a current test question. The new version guard withheld two subsequent answers: investigation found that production serialization had omitted the per-source `ref`/`inline` metadata needed by that guard. The build now preserves those fields, and a regression builds the actual production knowledge and verifies it independently. Version priority was also strengthened. These failures remain in the evidence; they were not converted into successes.

The final eight real executions passed: workflow/demo distinction, current 132-test evidence, missing private data, sensitive action, prompt injection, unknown pricing, actual tenant-boundary retrieval and current HubSpot limits. One correct workflow answer used English “no language model”; the original Dutch-only evaluator produced a false negative. The evaluator now checks that exact English negation and rejects its positive opposite. Re-evaluating the same provider executions and the final browser answer replay used **zero** additional inference.

Current successful executions cost **12.63 credits**. All refresh attempts cost **28.97**, including failed/rejected cases. Earlier verification used 15.19; lifetime reported usage is **44.16 of the unchanged 50-credit allowance**. New calls currently fail the seven-credit allocation gate. This is an application verification ledger, not the provider wallet or an account-wide billing cap.

The dedicated runtime credential has only `ai-agents:read`, `ai-agents:write`, `scenarios:read` within organization `9433554`. Make requires `ai-agents:write` for inference and also permits agent configuration changes with that scope; the token is not intrinsically read-only. The application enforces the existing agent identity/instruction hash, no mutation tools and protected routes. Fresh model execution after rotation was not attempted because of the remaining allowance. One unused token from a failed handoff was revoked with explicit owner approval before its same-scope replacement. The general CLI token was not revoked.

## Evidence

- [Release summary and complete credit accounting](evidence/release-2.4.1.json)
- [Eight actual answers, citations and provider iteration IDs](evidence/current-agent-acceptance.json)
- [Initial failed acceptance](evidence/current-agent-acceptance-initial.json), [first withheld attempt](evidence/current-agent-acceptance-version-rejection.json), [second withheld attempt](evidence/current-agent-acceptance-priority-rejection.json)
- [Existing agent update receipt](evidence/current-knowledge-update.json)
- [Scoped credential/publication receipt](evidence/make-runtime-credential.json)
- [Actual public browser receipt](evidence/release-2.4.1-browser.json), [fresh operations/local restore](evidence/release-2.4.1-operations.json)
- [HubSpot write receipts](evidence/hubspot-live-acceptance.json), [independent native UI verification](evidence/release-2.4.0.json)
- [Final five-minute provider-log review](evidence/release-2.4.1-worker-review.json): no HTTP 5xx; deliberate 401/410 probes and a canceled history request after locking. Raw headers/IP addresses were not published.

The credential scan checked tracked source and the compiled Worker against the actual HubSpot, runtime Make and operator secrets: zero matches. Private raw database exports and credential-transfer files are not part of this evidence. Physical cleanup remains manual. Seven-day visibility does not delete external HubSpot records or expired database rows.

## Final verdict

**PARTIALLY COMPLETE — FURTHER WORK REQUIRED**

The public controlled showcase and CRM are demonstrably functional. Full original mission completion still requires safe execution of the other legacy scenarios, managed hosted recovery and approved backup/incident arrangements. New model activity also needs a further explicit budget decision. See [the exact remaining prerequisites](PRODUCTION-READINESS.md); no blocked item is labelled complete.
