# Repository audit — 2026-11-08

Baseline: `605a5de0e1f9b09c8c530b3a7c30013ee2d499c7`, clean `main` synchronized with origin. Public repository: `phlppgdfry/make-enterprise-showcase`. GitHub Pages serves `/docs`; there was no hosted backend, database, production environment manifest or API connection in the browser.

## Capability inventory at audit

| Capability | Observed state | Source evidence / required work |
| --- | --- | --- |
| Static workbench | Implemented and historically verified | Vanilla HTML/CSS/JS; `workbench.js` calls `AgentCore.run` with JSON fixtures, no server calls |
| Local API | Implemented but not hosted | `scripts/server.js`; token auth, fixed tenant, fixture data, optional draft webhook; no durable execution records or rate limiter |
| Make knowledge agent | Implemented; current configuration reverified read-only | Existing agent ID matches; Medium model, seven documents, no scenario/MCP mutation tools; previous model execution evidence remains historical until rerun |
| Make scenarios | Partial integration templates / existing cloud references | Scenario 02 active; 01/03/04/05 inactive and unlinked. No scenario is changed by this work |
| Live company research | Missing | Existing lead scoring consumes synthetic company profiles; replace operational UI with genuine source retrieval and explicitly unknown fields |
| CRM | Blocked by external dependency | Current Make connection inventory contains only the AI provider. No HubSpot connection is configured. Implement adapter and explicit unavailable state; do not write business records |
| Persistence | Missing | No production execution/audit/idempotency tables; introduce D1 with migrations |
| Hosted runtime | Missing | GitHub Pages is static-only; preserve the existing entry URL and add a server-backed operations workspace |
| Authentication | Partial | Local API bearer token; production operator authorization and bounded budgets needed |
| CI | Implemented | Node 22 local tests and blueprint static checks. Add reproducible build, security, persistence and browser checks |
| Legacy custom app / SDK sketches | Partially implemented, unverified | Custom-app definitions reference an absent circuit-breaker service; SDK snippets are explicitly historical. Do not advertise them as operational |
| Legacy admin scripts | Partial / unsafe assumptions | Data-store setup catches failures as success; shell interpolation in old scripts; export only writes an index. Harden or isolate historical operations |
| Documentation | Extensive but mixed | Superseded reports are marked historical. Current acceptance must distinguish real runtime proof from old simulations |

## Execution priorities

1. Build a Worker-compatible backend using the existing JavaScript stack, durable D1 state, prepared statements, scoped operator authentication, request IDs, rate limits, bounded spend and idempotency.
2. Connect the existing Make agent without mutating it; validate native output against its pinned sources. Make inventory remains read-only.
3. Implement bounded organization-level research from approved public websites with source receipts and duplicate detection. Leave unknown facts unknown.
4. Implement the intended HubSpot contact adapter behind configuration and explicit write confirmation. With no credentials, return a truthful unavailable state.
5. Replace the operational browser flow with backend requests, status, execution history, loading/errors and citations. Preserve a separately labelled reference lab.
6. Run baseline/regression, database, backend, security and browser verification; deploy the actual artifact, configure secrets only with authorization and verify the live URL.
7. Publish evidence, limitations, operations/rollback instructions and the final tested source association. Commit/push without rewriting history.

The user authorized a maximum of 50 existing Make AI credits for verification, with no credit purchase or plan upgrade. Public visitors must not receive anonymous access to metered execution or privileged writes.
