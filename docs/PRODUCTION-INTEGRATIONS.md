# Operational integration configuration

## Make API and knowledge agent

- Region: `eu1.make.com`; team: `3365938`.
- Existing agent: `Make Repo Kennisagent`, ID `0a8be23e-73f4-4856-9b7b-f2932f82e84a`.
- Existing provider connection: `12392068`, Make AI Provider, model `medium`.
- Seven documents remain at source commit `885c72b6a247ef9f9aabe7bc540339888397f403`.
- Provider limits: 2,400 output tokens; configured Make timeout 45 seconds, recursion limit five. The backend transport timeout is 65 seconds and the UI allows 90 seconds.

The backend authenticates with `Authorization: Token …` to the [official Make AI Agents API](https://developers.make.com/api-documentation/api-reference/ai-agents). It checks the actual agent, exact instruction SHA-256, token limit and absence of mutation tools before running. `POST /ai-agents/v1/agents/{id}/run?teamId=3365938` uses a new execution UUID as thread ID, one user message and no requested tool overrides. Native output consists of `status`, `answer`, `source` and `quote`; server validation converts it to the public answer/citations contract. There are no browser-visible Make credentials.

Refresh account inspection with authenticated `POST /api/integrations/verify` and `{}`. This does not run scenarios or invoke a model. Detailed scenario names are operator-only; public status exposes an aggregate count and the approved agent summary. Inspection caches are timestamped and do not establish permanent service health.

Eight current-version acceptance cases passed through the real protected production backend, with an actual provider retrieval step for the tenant-boundary question. The current local suite has 132 Node tests and ten browser checks. [Current acceptance](PRODUCTION-ACCEPTANCE.md) retains initial failures and the generated-source metadata regression. The seven archive documents remain unchanged, while an inline current-release source is pinned at `21dad08c5aaed036a2057e6f993911d3b051d776`. Exact quotation checks and current-question source-version enforcement run independently of the model. Provenance does not prove semantic truth of every sentence.

The runtime now uses a dedicated organization-bound token in `MAKE_API_KEY`, limited to `ai-agents:read`, `ai-agents:write` and `scenarios:read`. The official run endpoint requires agent-write; this scope also permits agent configuration changes, so it is not intrinsically read-only. The application exposes no such mutation API. See [credential setup/rotation](MAKE-RUNTIME-CREDENTIAL.md). Production agent/scenario inspection and denied datastore/token-admin reads passed after rotation. No fresh inference after rotation was attempted because of the remaining verification allowance.

## Credit receipts

No purchase or upgrade is performed. Each request allocates seven existing credits against the approved 50-credit ceiling before dispatch. Failed/uncertain calls are never retried automatically. Actual centicredits come from Make's response. After reviewing known final receipts, the operator can click **Reconcile reported credit usage**. Atomic database bookkeeping releases only the allocation/receipt difference; unknown usage remains allocated, and lifetime spending or the approval ceiling is never reset by reconciliation or retention. This controls this application's dispatches, not unrelated Make account activity or provider-side account billing. Lifetime reported use after this refresh is 44.16/50 credits. Remaining 5.84 is below the seven-credit allocation; new inference is blocked and stored results can still replay. Review current model pricing and obtain explicit owner approval before any future allowance increase.

## Company website research

The configured provider is direct public HTTPS website metadata, not a paid enrichment API. The default allowlist is `make.com`, `cloudflare.com`, `github.com`. Requests accept a root domain only. Redirects remain on that exact domain or its `www` host, with no IPs, arbitrary paths, ports or credentials. Robots and HTML responses have explicit byte/time/redirect bounds. The service parses title/description with parse5, retains source excerpts and observation time, and deduplicates by domain. Missing employee counts, contacts and scores remain null/empty. The actual Make.com and Cloudflare journeys were verified live.

Add a broader research provider only with authorized credentials, reviewed terms and privacy scope, attribution and corresponding adapter tests. Do not relabel this metadata pipeline as verified firmographics or contact discovery.

## CRM

Version 2.4 adds a direct server-side HubSpot adapter using the owner's explicitly approved contact-only service key and existing EU1 account. `CRM_MODE=test-only` permits only clearly marked test contacts and explicit write confirmation. Create/find/read/update operations persist execution receipts and verify destination readback; duplicate email never silently overwrites a contact. See [HubSpot configuration, limits and live evidence](HUBSPOT-INTEGRATION.md).

The legacy Make HubSpot/Slack scenario remains inactive/unlinked and is not invoked by this adapter. Its Slack messages are not authorized by connecting HubSpot. This does not make the knowledge agent write-capable or enable customer-data automation. Missing/misconfigured HubSpot settings still return `503 crm_unconfigured` without writes.

## Existing scenarios

The account's active three-module webhook → datastore → response scenario is preserved. Its fallback fixed order key makes unreviewed testing unsafe. It was not executed during this release. The four inactive/unlinked scenarios remain unchanged. The operational workflow catalog consists of the real repository-agent and company-research flows; it does not advertise the legacy scenario names as completed business automations.
