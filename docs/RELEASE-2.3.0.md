# Version 2.3 — visual and recovery update

Published and verified on 22 November 2026. The visual update is live; the broader enterprise mission remains partially complete because CRM destination authorization and a managed recovery drill are unavailable.

## Live delivery evidence

- Public application and API: https://make-enterprise-workbench-phlppgdfry.kippieg.chatgpt.site
- Health: https://make-enterprise-workbench-phlppgdfry.kippieg.chatgpt.site/api/health — HTTP 200, healthy D1, runtime commit `6721997de9e33a74c1fa98b15390a279b9d82740`.
- Sites saved version **8**, source artifact commit `a918054f8e4cbfcff3777bd4e33dddf01eed6629`; deployment `appgdep_6b034f6cd8e881918e1e2185e5edcfec` returned `succeeded`, retaining environment revision 1 and the existing public audience. The artifact's `SOURCE.json` maps it to the runtime commit above. This evidence-only follow-up does not change runtime code.
- Public browser checks passed at 1440, 768, 390 and 320 pixels, with no page errors, failed HTTP responses or horizontal overflow. Explorer and sample-question controls caused zero inference requests. SVG/ICO/touch icon/manifest/social PNG all returned HTTP 200 and the appropriate media type.
- One actual UI agent execution, `92199b13-de52-4441-bc27-d1e1177bab3c`, returned HTTP 201, a successful answer and one rendered, validated pinned-source citation. Make iteration `91b17ba8-5482-4680-8526-3c0e058e16c6` reported **1.56 credits**. Across the previous verification and this release, the reconciled allowance is **15.19 / 50 credits**, with 34.81 remaining; the lifetime allowance was not reset.
- Free Make inspection reverified the existing read-only agent and its seven documents. Scenario 8199349 is active; the other four inventoried scenarios are inactive. Inventory visibility is not evidence of executing every scenario.
- Real allowlisted Cloudflare website research succeeded with source URLs, title and description. Repeating its idempotency key returned the same receipt without another execution. This is public organization metadata, not contact discovery, independent corroboration or ICP scoring.
- A real private D1 backup was downloaded and restored into isolated in-memory SQLite: 1 budget row, 17 executions, 31 audit events, 3 leads and 1 integration-cache row. Its preserved ledger was 1519/5000 centicredits. Anonymous backup access returned 401. The raw backup remains private and ignored by Git; only the verification receipt is published. This does not establish managed hosted recovery or backup authenticity.
- Runtime commit CI: [blueprint and application validation](https://github.com/phlppgdfry/make-enterprise-showcase/actions/runs/45039706790), [Pages publication](https://github.com/phlppgdfry/make-enterprise-showcase/actions/runs/45039705838), and [public health](https://github.com/phlppgdfry/make-enterprise-showcase/actions/runs/45061273815) succeeded.

Machine-readable receipts: [live API, research and backup](evidence/release-2.3-live.json), [public browser](evidence/release-2.3-browser.json), [actual Make answer](evidence/release-2.3-agent.json). Local UI mocks are documented separately below and were not used for these live receipts.

## Changes

- A consistent trace-shaped brand mark; SVG favicon, 16/32/48 ICO, touch and application icons, web manifest and a real PNG social preview. The reference laboratory shares the new branding.
- A keyboard-operable architecture explorer explaining agent, research and execution-ledger paths. Its controls and sample questions never invoke a model.
- Readable execution history, explicit missing-information/review outcomes, replay notices, technical receipts and actual JSON downloads.
- Abortable private requests and session guards: locking or failed reauthentication cannot reveal a late response from an older session.
- Accurate stale-connection labeling, public status refresh, responsive controls and reduced-motion support.
- Protected, bounded, consistent D1 backup export and a checksum/schema/row-count/credit-ledger restore verifier using isolated SQLite. No production restore or automatic cleanup is performed.

## Local verification

- Final `npm run test:all` rerun passed (114 tests, zero failures), formatting passed and `npm audit --audit-level=moderate` reported zero vulnerabilities. The sandbox initially blocked localhost listeners; the full rerun with localhost permission succeeded without code changes.
- 114 Node tests pass, including binary asset bytes/media types/HEAD requests, icon dimensions, protected backup access, restore round-trip, tamper rejection and preserved lifetime credit usage.
- Browser controls checked at 1440, 768, 390 and 320 pixels: no horizontal overflow or application page errors.
- Browser tests for delayed responses and export rendering used an explicitly mocked local agent boundary, with zero paid model calls. These are UI tests, not live Make acceptance claims.
- Diagram/example controls, readable history, JSON content/download, HTML-as-text rendering, lock races, failed-login clearing and form submission without a submitter all passed.
- The private download button produced an actual local export that passed the isolated restore verifier.
- Browser plugin unavailable; the connected Playwright browser was used.

## Remaining configuration

The intended HubSpot CRM scenario is still inactive and has no connections. No CRM writes or messages were sent. CRM destination authorization and approved writes remain prerequisites for finishing that integration. Local backup recovery does not establish a hosted D1 restore drill. Automatic retention activation remains deferred by the owner; no maintenance secret or active cleanup schedule was added.

## Release gates

| Gate | Result | Evidence or missing prerequisite |
| --- | --- | --- |
| Source audit, frontend/Worker build, regression suite | PASS | Runtime commit above; 114 tests and successful build |
| Public deployment and responsive browser acceptance | PASS | Saved version 8, successful deployment, browser receipt |
| Make agent and knowledge citations | PASS | Actual UI execution and seven-document inspection |
| Operational company metadata research | PASS | Real source retrieval and idempotent replay receipt |
| Backup export and isolated restore | PASS | Actual D1 export, SQLite restore and preserved credit ledger |
| Security checks | PASS within tested scope | Authentication, validation, rate limits, SSRF/XSS boundaries and zero reported dependency vulnerabilities; no external penetration-test certification |
| All enterprise scenario templates operational | BLOCKED | Templates still require destination-specific connections, gateway configuration and validation; an active scenario alone is not proof of end-to-end success |
| CRM business-record operations | BLOCKED | CRM sandbox/account connection, scoped credentials and explicit approval for test writes |
| Managed hosted recovery drill | BLOCKED | Hosting-admin recovery capability and an authorized isolated restore target; production restore not attempted |
| Automatic physical retention | NOT ACTIVATED | Owner explicitly deferred activation; expired rows remain until manual cleanup |

Final verdict for the entire enterprise mission: **PARTIALLY COMPLETE — FURTHER WORK REQUIRED**. The public visual release and the operational agent/research/export paths are verified. Missing external integration and recovery prerequisites are not converted into completed claims.
