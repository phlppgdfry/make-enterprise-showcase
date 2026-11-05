# Current verification — 2026-11-05

This document supersedes the historical audit scores and production-readiness claims elsewhere in the repository.

## Reproducible local checks

| Check | Observed result | What it establishes |
| --- | --- | --- |
| `npm test` | 78 regression tests passed; six blueprint directories passed structural checks | Tested core/API/validator/deployment-plan behavior and local JSON graph integrity |
| `npm run test:all` | Passed, including five legacy local pattern experiments and static audit | Local checks only; pattern experiments do not execute cloud scenarios |
| `npm run test:e2e` | Passed against the local HTTP server | Actual support, knowledge and lead request/response journeys; not a live Make run |
| `npm run simulate` | Six fixture workflows executed with actual tool/policy traces | Support draft, sensitive-action review, tenant-specific knowledge, missing evidence, known/unknown lead behavior |
| `npm run deploy` | Offline readiness plan; no cloud writes | Explicit placeholders and configuration gaps are visible |
| `npm run probe` | Dry run; no requests sent | Probe defaults do not broadcast to live webhooks |
| `git diff --check` | Passed | No whitespace errors in the patch |

Regression coverage includes cross-tenant customers/documents/companies, sensitive actions, missing evidence, fabricated document IDs and quotes, malformed model output, wrong credentials, tenant spoofing, input size limits, provider failures, path traversal, and invalid blueprint references/cycles. The final pass additionally covers short SLA queries, incomplete company facts, strict output/citation shapes, streamed response byte limits and cancellation, exact JSON media types, private deployment plans, concurrency conflicts, and incorrect saved module configuration or order. Model calls in these tests use injected test responses, not a live model. The adapter records one outbound agent request; actual internal model-call counts are unknown.

## Browser verification

Playwright was used because the Browser plugin was not available. Local URL: `http://127.0.0.1:4173/`. Desktop viewport: **1440 × 1000**. Mobile viewport: **390 × 844**.

- Page title and meaningful content loaded; no error overlay.
- Support request produced a source-backed draft with the expected North SLA.
- Refund request required human review and did not execute an action.
- Switching knowledge to South returned the South SLA and excluded North's SLA.
- Missing knowledge produced an insufficient-context state.
- Lead examples produced qualified, low-fit and research-needed states.
- JSON export downloaded a `.json` result.
- A one-word SLA query retrieved a source. Unknown lead criteria displayed “Unknown”; an invalid domain cleared the previous score and disabled export, and a corrected request recovered normally.
- HTML-looking input produced no injected image element.
- Mobile layout had no horizontal overflow (`scrollWidth === clientWidth === 390`).
- No JavaScript page errors were observed. Desktop/mobile screenshots were inspected; two presentation issues (an offscreen skip link in full-page captures and missing mobile word spacing) were corrected.

Screenshots and browser session files are local verification artifacts, excluded from the repository. Browser checks exercise the deterministic fixture demo; they do not verify a live model, Make account writes, remote API hosting or third-party data access.

## Make read-only observation

The existing team was read on **2026-11-04** using its existing CLI login; this historical account observation was not refreshed on 2026-11-05. Scenario **8199349 (02)** was active; **8199345, 8199351, 8199353 and 8199357** were inactive. The default Make AI Provider connection was present. Those are configuration observations, not successful-run evidence. Existing AI scenarios had historical errors; no new cloud execution or error remediation is claimed.

No Make scenario was modified or activated for this update. The new 01/05/06 files are gateway **configuration templates**, not Make-schema-validated exports. JSON structure validation does not prove that Make accepts a module's fields, version, JSON data structure, authentication or connection settings. The native Make AI Agents draft workflow is documented but has not been provisioned or run in the cloud.

## Publishing boundary

GitHub Pages is configured to publish the `main` branch's `/docs` directory. It hosts the workbench, fixture data and shared browser core. It does not run the authenticated Node API. The API and an authenticated Make drafting webhook require separate hosting/configuration. The workbench requires no paid providers or secret credentials.

## Remaining implementation boundaries

The data adapter is synthetic; retrieval is lexical; there is no live web research, persistent conversation memory, vector index, queue, rate limiter or production approval/audit store. All model drafts require review because quote matching cannot prove semantic correctness. The historical SDK snippets and scenarios 02/03/04 have documented limitations. Compliance certifications, exactly-once guarantees and enterprise availability are not established by this repository.
