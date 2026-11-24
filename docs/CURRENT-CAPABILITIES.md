# Versioned current capabilities

Verified business-capability release: 2.4, 24 November 2026, runtime source `46a4eb85d70156258c93020f17e0a7d47c342795`. This is a versioned capability record, not a live health response. The exact current runtime commit is returned by `/api/health` and may be newer after knowledge-only updates. This document describes the operational website separately from the reference laboratory and archived agent documents.

The operational website calls the real Make Repo Kennisagent through an authenticated server-side API. The separate GitHub Pages reference laboratory uses deterministic synthetic fixtures and does not call a language model. Support triage, knowledge search and lead qualification in that laboratory remain reference examples, not proof that every Make scenario is operational.

HubSpot access is limited to application-marked test contacts. The owner approved a contact-read/write service key, stored as an encrypted server secret. The website requires an operator key and explicit confirmation before each test write; it creates, finds, reads and updates marked test contacts and verifies actual provider readback. Existing email duplicates are returned without overwriting them. Customer records, messages, marketing enrollment and deletions are outside this flow. The Make knowledge agent itself remains read-only and cannot execute CRM writes.

The real test contact is `936971617524`, with reserved address `make-showcase-test-release-20261124@example.com`. Its create, duplicate lookup, separate confirmed update and readback passed through the actual public browser/backend/HubSpot path. The same updated test name was observed in the logged-in HubSpot interface, with exactly one search match. HubSpot also displayed an association to `example.com`; the application did not call a companies API and does not claim it created that company.

Company research reads public website title/description and evidence from approved domains: make.com, cloudflare.com and github.com. It does not independently verify firmographics or discover contacts, employee counts or fit scores. Missing facts remain unknown.

The current local code verification has 132 passing Node tests and ten desktop/mobile browser checks. The earlier verified 2.4 business release had 127 Node tests. Browser CI uses explicit local provider fixtures; actual HubSpot proof is recorded separately. Local regression tests do not prove that every Make cloud scenario works. Node validation, build, dependency audit, browser CI and GitHub Pages publication passed for the business-capability runtime source above. Passing checks are not a security certification or an enterprise SLA.

Persistent D1 receipts, input validation, operator authorization, rate limits, request IDs and idempotency are implemented. Ambiguous provider writes remain uncertain and are not automatically retried. Expired local receipts cannot be retrieved or replayed for their old data. Seven-day local visibility does not mean automatic physical deletion or deletion of external HubSpot contacts. Automatic cleanup remains off at the owner's request.

Private database export and isolated SQLite recovery are implemented and tested. Managed D1 point-in-time recovery and a hosted restore drill remain unverified. Local recovery does not establish hosted recovery.

Five legacy Make scenarios were inventoried: one active and four inactive. They were preserved. Their names and active status do not prove successful end-to-end execution, HMAC, DLQ or exactly-once guarantees. Destination-specific connections and safe execution evidence remain required. No Slack messages, payments, refunds or customer business writes were performed by this release.

The owner approved at most 50 existing Make verification credits, with no purchases. Ten earlier real provider executions reported 15.19 credits; the CRM/browser-CI release itself invoked no metered model. That ledger concerns application verification, not unrelated account activity or a provider-wide billing cap.

Evidence: [actual HubSpot acceptance](evidence/hubspot-live-acceptance.json), [2.4 deployment and CI](evidence/release-2.4.0.json), [current readiness](PRODUCTION-READINESS.md). Treat older snapshot claims as historical; do not turn them into current operational claims.
