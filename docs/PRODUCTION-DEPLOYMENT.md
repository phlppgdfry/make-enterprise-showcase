# Deployment and operations

Canonical source: `https://github.com/phlppgdfry/make-enterprise-showcase`, branch `main`.

The operational application uses Sites (Cloudflare Worker + provisioned D1). The existing GitHub Pages laboratory remains available. `production/.openai/hosting.json` pins the Site ID; never create a duplicate project to republish.

## Local development

Node 22.13+ (Node 24 recommended) and npm are required. Run `npm ci`, `npm run test:all`, `npm run build:production`. `npm run start:production` opens an isolated local in-memory SQLite preview at `http://127.0.0.1:4179`. Its documented key is `local-preview-only`; it has no Make credentials. Its database is ephemeral. The original synthetic reference runs with `npm start` on port 4173.

The build reads the seven public documents from the pinned Git commit; clone full Git history (`fetch-depth: 0` in CI). Esbuild bundles the Worker, HTML/CSS/JS and public source-validation catalog into `production/dist/server/index.js`. There are no source maps or secrets in that output. `SOURCE_COMMIT` can explicitly set the canonical build SHA when packaging an already reviewed release. Never point it at unrelated or untested source.

## Runtime settings

Set `MAKE_API_KEY`, `MAKE_ZONE` and `OPERATOR_API_KEY` through Sites runtime environment management. All are marked secrets. The existing Make token was transferred only after explicit owner approval. It may have broader account permissions than the application needs: rotate to a dedicated least-privilege token when available. The application itself exposes no Make mutation route. Never put secrets in `.openai/hosting.json`, static assets, Git, CLI arguments or query strings.

`RESEARCH_DOMAINS` is optional, default `make.com,cloudflare.com,github.com`. Adding domains changes outbound research scope and requires a deliberate terms/privacy/SSRF review. No CRM secret is configured. An operator key is held locally in ignored, owner-readable `exports/production-operator-key.txt`; retrieve it locally without publishing it. Rotate it with the Sites environment tool and redeploy if lost or disclosed.

## Publish

1. Pass the complete test suite, Worker build and dependency audit. Review staged files for secrets.
2. Commit/push canonical source. Build with its exact full SHA.
3. Use the Sites source workflow helper with a fresh short-lived credential for the existing project. Keep that credential in process memory/stdin only. The separate Site source repository contains the exact bundled artifact, immutable migration files and `SOURCE.json` canonical provenance. It is not a replacement for the public GitHub source.
4. Package with the Sites helper, save its exact pushed commit/archive with `save_site_version`, then deploy that saved version. Sites applies Drizzle migrations before Worker upload. Keep applied migrations immutable.
5. Check deployment terminal status, HTTPS health, public assets, unauthorized API rejection and operator workflows. `/api/health.sourceCommit` must identify the canonical source used by the artifact. Runtime environment changes require redeployment.
6. Run `POST /api/integrations/verify` under operator authentication to refresh actual Make status without metered inference. Run model acceptance only within the remaining approved allocation. Do not reset the budget merely to repeat tests.

No GitHub model/API secrets are required: CI runs deterministic provider-boundary tests and builds the Worker. Publishing from this workstation uses authenticated Sites tooling; no unattended GitHub-to-Sites deployment credential is installed.

## Monitoring, retention and recovery

Worker logs contain request IDs, route, status, duration and sanitized execution failures. Correlate with D1 execution ID and Make iteration ID. Inspect unsuccessful/uncertain records before retrying under a new key. `POST /api/maintenance/retention` with `{}` purges expired records and rate buckets; no scheduled purge is configured. Document an operator schedule before continuous public service. No alerting service is configured.

Rollback deploys a previously saved compatible Site version. A Worker rollback does not undo migrations. Do not restore an old schema or reset the credit ledger. D1 backup/point-in-time recovery availability and restore permissions must be confirmed with the managed hosting owner; no independent restore drill has been verified. Do not treat this showcase as a customer-data system without that recovery plan, SSO/access governance and ongoing monitoring.

## API contract

Public: `GET /api/health`, `GET /api/status`. Protected: `GET /api/workflows`, `POST /api/integrations/verify`, `POST /api/agent/ask` (`question`), `POST /api/leads/research` (`domain`), `POST /api/workflows/:id/execute`, `GET /api/executions`, `GET /api/executions/:id`, `GET /api/leads/:id`, `POST /api/maintenance/retention`. CRM routes return `crm_unconfigured` (503).

Execution POSTs require an `Idempotency-Key` header of 8–100 safe characters. Successful acceptance returns an execution record, whose `status` is authoritative: `succeeded`, `failed`, `uncertain`, or an in-progress record for a duplicate. HTTP 201 means the execution record was created, not that the upstream operation succeeded. Validation/auth failures return `{error:{code,message,requestId}}`. No webhook endpoint or privileged unauthenticated write is exposed.
