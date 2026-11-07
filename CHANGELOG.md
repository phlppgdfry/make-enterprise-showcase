# Changelog

## 2.2.0 — 2026-11-07

- Provisioned a real standalone Make repository knowledge agent using the existing Make AI Provider and seven pinned repository documents.
- Verified seven real cloud acceptance cases with independently checked citations and recorded iteration IDs, token usage and timings.
- Added credential-safe provisioning/query commands, opt-in live evaluation, a source allowlist and immutable source hashes.
- Used four scalar Make output fields to avoid nested-schema and JSON-in-text failures; normalized the result into a source-checked response.
- Added local regression tests for source provenance, source extraction, API authentication, malformed output and contradictory acceptance answers.
- Kept the static demo, standalone knowledge assistant and optional drafting gateway clearly separated. Existing Make scenarios remain unchanged.

## 2.1.0 — 2026-11-05

- Fixed short SLA queries and withheld final lead scores when company data or evidence is incomplete.
- Enforced the published agent-output contract, including citation limits, duplicate IDs and unexpected fields.
- Bounded streamed agent responses by bytes during receipt; tightened media-type and draft-URL validation.
- Added real local HTTP workflow tests and failure-path coverage for deployment preconditions, concurrency conflicts and mismatched saved configurations.
- Added private deployment-file selection, preserving public templates; verified saved graph structure and values rather than only the scenario name.
- Displayed unknown criterion values clearly, cleared stale results after errors and formatted the stylesheet for maintenance.
- Reverified the reference implementation with 78 regression tests and desktop/mobile browser checks. Live Make provisioning and real business data remain separate configuration work.

## 2.0.0 — 2026-11-04

- Replaced scripted success logs with executable support, knowledge and lead workflows sharing one policy core.
- Added tenant-scoped synthetic sources, customer lookup, transparent ICP scoring, abstention and explicit review reasons.
- Added a token-authenticated API and an optional Make agent adapter with bounded requests and quote validation. Model drafts require review.
- Rebuilt the static workbench with responsive forms, evidence, traces, accessible tabs and JSON export; removed third-party CDN runtime dependencies.
- Replaced speculative manifests for 01/05 with documented gateway integration templates and added 06. Templates require account configuration and Make schema verification.
- Added regression/API/blueprint-validator tests and CI execution of the complete local suite.
- Made probes dry-run by default and deployment a readiness plan by default. Fixed failing local experiments to return a failing exit code.
- Removed heuristic compliance scores, clarified historical reports and corrected unsupported production claims.

No Make cloud scenario was mutated, activated or executed as part of this repository update.
