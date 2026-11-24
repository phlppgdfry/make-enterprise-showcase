# Deployment and operations

Canonical source: `https://github.com/phlppgdfry/make-enterprise-showcase`, branch `main`.

The operational application uses Sites (Cloudflare Worker + provisioned D1). The existing GitHub Pages laboratory remains available. `production/.openai/hosting.json` pins the Site ID; never create a duplicate project to republish.

## Local development

Node 22.13+ (Node 24 recommended) and npm are required. Run `npm ci`, `npm run test:all`, `npm run build:production`. `npm run start:production` opens an isolated local in-memory SQLite preview at `http://127.0.0.1:4179`. Its documented key is `local-preview-only`; it has no Make credentials. Its database is ephemeral. The original synthetic reference runs with `npm start` on port 4173.

The build reads seven archived public documents and a separate inline current-release source from their pinned Git commits, preserving source-version metadata; clone full Git history (`fetch-depth: 0` in CI). Esbuild bundles the Worker, HTML/CSS/JS and public source-validation catalog into `production/dist/server/index.js`. There are no source maps or secrets in that output. `SOURCE_COMMIT` can explicitly set the canonical build SHA when packaging an already reviewed release. Never point it at unrelated or untested source.

## Runtime settings

Set `MAKE_API_KEY`, `MAKE_ZONE` and `OPERATOR_API_KEY` through Sites runtime environment management. All are marked secrets. The dedicated Make runtime token was created and transferred only after explicit owner approval. It is limited to organization 9433554 and agent read/write plus scenario read. Make requires agent-write for inference; that scope also permits agent-configuration changes. See [credential replacement and rollback](MAKE-RUNTIME-CREDENTIAL.md). The general CLI token remains separate and unchanged. The application itself exposes no Make mutation route. Never put secrets in `.openai/hosting.json`, static assets, Git, CLI arguments or query strings.

`RESEARCH_DOMAINS` defaults to `make.com,cloudflare.com,github.com`; broadening it needs a terms/privacy/SSRF review. HubSpot uses encrypted `HUBSPOT_ACCESS_TOKEN`, `HUBSPOT_PORTAL_ID` and `CRM_MODE=test-only`, approved by the owner. It is excluded from CI/local preview. An operator key remains locally in ignored, owner-readable `exports/production-operator-key.txt`; never publish it. Rotate it through Sites environment management and redeploy if lost or disclosed.

## Publish

1. Pass the complete test suite, Worker build and dependency audit. Review staged files for secrets.
2. Commit/push canonical source. Build with its exact full SHA.
3. Use the Sites source workflow helper with a fresh short-lived credential for the existing project. Keep that credential in process memory/stdin only. The separate Site source repository contains the exact bundled artifact, immutable migration files and `SOURCE.json` canonical provenance. It is not a replacement for the public GitHub source.
4. Package with the Sites helper, save its exact pushed commit/archive with `save_site_version`, then deploy that saved version. Sites applies Drizzle migrations before Worker upload. Keep applied migrations immutable.
5. Check deployment terminal status, HTTPS health, public assets, unauthorized API rejection and operator workflows. `/api/health.sourceCommit` must identify the canonical source used by the artifact. Runtime environment changes require redeployment.
6. Run `POST /api/integrations/verify` under operator authentication to refresh actual Make status without metered inference. Run model acceptance only within the remaining approved allocation. The operator may reconcile known final receipts with `POST /api/budget/reconcile` and `{}`. This preserves lifetime spend, retains unknown charges and never increases the 50-credit approval. Do not reset the budget merely to repeat tests. At the latest acceptance the ledger reports 44.16/50 credits; the remaining 5.84 cannot fund a seven-credit allocation. Existing answers can replay, but new inference requires a new explicit allowance decision.

No GitHub model/API secrets are required: CI runs deterministic provider-boundary tests and builds the Worker. Publishing from this workstation uses authenticated Sites tooling; no unattended GitHub-to-Sites deployment credential is installed.

## Monitoring, retention and recovery

Worker logs contain request IDs, route, status, duration and sanitized execution failures. Correlate with D1 execution ID and Make iteration ID. Hosting-provider request logs may also contain client IP/HTTP metadata; do not publish raw logs. Provider log retention/access and incident ownership require an approved operational policy. Inspect unsuccessful/uncertain records before retrying under a new key. `POST /api/maintenance/retention` with `{}` purges expired records and rate buckets; automatic purge was deferred by the owner. A disabled workflow template is available in `docs/examples/production-retention-workflow.yml`; no maintenance key is stored in GitHub or Sites. Enabling it later requires explicit owner approval for secret storage and deletion. The optional `MAINTENANCE_API_KEY` is restricted to this one POST route and never receives operator privileges. A public GitHub Actions health workflow runs every six hours and can be dispatched manually; it checks health/storage, the homepage/CSP and unauthorized execution denial without metered model calls. No separate paging service is configured.

Rollback deploys a previously saved compatible Site version. A Worker rollback does not undo migrations. Do not restore an old schema or reset the credit ledger. D1 backup/point-in-time recovery availability and restore permissions must be confirmed with the managed hosting owner; no independent restore drill has been verified. Do not treat this showcase as a customer-data system without that recovery plan, SSO/access governance and ongoing monitoring.

## API contract

Public: `GET /api/health`, `GET /api/status`. Protected: `GET /api/workflows`, `POST /api/integrations/verify`, `POST /api/agent/ask` (`question`), `POST /api/leads/research` (`domain`), `POST /api/workflows/:id/execute`, `GET /api/executions`, `GET /api/executions/:id`, `GET /api/leads/:id`, `POST /api/maintenance/retention`, `POST /api/budget/reconcile`, `GET /api/backup`. The protected [HubSpot routes](HUBSPOT-INTEGRATION.md) support confirmed test-contact operations and return `crm_unconfigured` (503) when runtime prerequisites are absent.

Execution POSTs require an `Idempotency-Key` header of 8–100 safe characters. Successful acceptance returns an execution record, whose `status` is authoritative: `succeeded`, `failed`, `uncertain`, or an in-progress record for a duplicate. HTTP 201 means the execution record was created, not that the upstream operation succeeded. Validation/auth failures return `{error:{code,message,requestId}}`. No webhook endpoint or privileged unauthenticated write is exposed.

Retained records whose seven-day retrieval period has expired cannot be recovered through execution lookups, history or idempotency replay. A retained expired key returns `410 idempotency_expired`, without a private result or another provider dispatch. Review the prior execution before intentionally submitting a new key. Physical cleanup remains manual and may eventually remove the old key; idempotency is not promised forever after deletion. Queued/running duplicates return HTTP 202. Make success responses are limited to 1 MB of bytes during streaming; larger bodies are canceled, and unsuccessful upstream response bodies are discarded unread. This follows [Workers memory/streaming guidance](https://developers.cloudflare.com/workers/runtime-apis/streams/).

## Private export and isolated recovery verification (2.3)

Authenticated `GET /api/backup` exports a consistent D1 batch snapshot of budget, executions, audit events, leads and integration metadata. It includes expired records that are still physically retained because cleanup is manual, and excludes credentials and ephemeral rate buckets. Exports fail explicitly beyond 1,000 rows per table or 5 MB; no partial file is reported as a complete backup. The UI offers **Download private backup** only through operator authentication. The optional maintenance credential cannot access it. No scheduled backup or cleanup was activated.

Run `npm run backup:verify -- /private/path/backup.json` with a trusted private export. It checks format/checksum and restores all rows into a new in-memory SQLite database using the versioned migration, verifying row counts and preserved credit usage/limit. It makes no network request and performs no hosted write. The checksum is a data-integrity check, not a signature establishing an untrusted file's authenticity. The export contains operator data; keep it private and follow your own encryption/storage policy.

This closes the application-level export/local-recovery tooling gap, not the managed platform's point-in-time recovery or hosted restore verification. A production restore still requires an approved destination, hosting administrative access and an isolated drill.
