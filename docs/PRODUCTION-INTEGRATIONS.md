# Operational integration configuration

## Make API and knowledge agent

- Region: `eu1.make.com`; team: `3365938`.
- Existing agent: `Make Repo Kennisagent`, ID `0a8be23e-73f4-4856-9b7b-f2932f82e84a`.
- Existing provider connection: `12392068`, Make AI Provider, model `medium`.
- Seven documents remain at source commit `885c72b6a247ef9f9aabe7bc540339888397f403`.
- Provider limits: 2,400 output tokens; configured Make timeout 45 seconds, recursion limit five. The backend transport timeout is 65 seconds and the UI allows 90 seconds.

The backend authenticates with `Authorization: Token …` to the [official Make AI Agents API](https://developers.make.com/api-documentation/api-reference/ai-agents). It checks the actual agent, exact instruction SHA-256, token limit and absence of mutation tools before running. `POST /ai-agents/v1/agents/{id}/run?teamId=3365938` uses a new execution UUID as thread ID, one user message and no requested tool overrides. Native output consists of `status`, `answer`, `source` and `quote`; server validation converts it to the public answer/citations contract. There are no browser-visible Make credentials.

Refresh account inspection with authenticated `POST /api/integrations/verify` and `{}`. This does not run scenarios or invoke a model. Detailed scenario names are operator-only; public status exposes an aggregate count and the approved agent summary. Inspection caches are timestamped and do not establish permanent service health.

The seven existing acceptance cases were rerun through the public browser/backend path; [the evidence file](evidence/production-agent-acceptance.json) records actual execution and Make iteration IDs, responses and reported cost. Two additional fresh release smokes bring the total to nine provider executions and 13.63 credits; the final exact implementation smoke and reconciled ledger are in [release evidence](evidence/production-release.json). Pinned source facts (including 78 tests at that older snapshot) must not be confused with the current 111-test suite. Changing knowledge versions requires a reviewed knowledge refresh and new acceptance; the current release preserves the existing agent's document set.

## Credit receipts

No purchase or upgrade is performed. Each request allocates seven existing credits against the approved 50-credit ceiling before dispatch. Failed/uncertain calls are never retried automatically. Actual centicredits come from Make's response. After reviewing known final receipts, the operator can click **Reconcile reported credit usage**. Atomic database bookkeeping releases only the allocation/receipt difference; unknown usage remains allocated, and lifetime spending or the approval ceiling is never reset by reconciliation or retention. This controls this application's dispatches, not unrelated Make account activity or provider-side account billing. Review current model pricing and limits before any future allowance increase.

## Company website research

The configured provider is direct public HTTPS website metadata, not a paid enrichment API. The default allowlist is `make.com`, `cloudflare.com`, `github.com`. Requests accept a root domain only. Redirects remain on that exact domain or its `www` host, with no IPs, arbitrary paths, ports or credentials. Robots and HTML responses have explicit byte/time/redirect bounds. The service parses title/description with parse5, retains source excerpts and observation time, and deduplicates by domain. Missing employee counts, contacts and scores remain null/empty. The actual Make.com and Cloudflare journeys were verified live.

Add a broader research provider only with authorized credentials, reviewed terms and privacy scope, attribution and corresponding adapter tests. Do not relabel this metadata pipeline as verified firmographics or contact discovery.

## CRM

There is **no configured CRM**. Account inspection found only the Make AI Provider connection; the existing HubSpot scenario is inactive/unlinked. The backend returns authenticated `503 crm_unconfigured` for CRM routes. No record is created and no email is sent.

To enable this feature, provide the intended CRM and authorized sandbox, scoped credentials, required contact schema, duplicate policy and explicit approval for test writes. Then implement the provider adapter, idempotent create/retrieve/update behavior and destination readback tests. No unverified HubSpot adapter or invented local CRM is presented as operational.

## Existing scenarios

The account's active three-module webhook → datastore → response scenario is preserved. Its fallback fixed order key makes unreviewed testing unsafe. It was not executed during this release. The four inactive/unlinked scenarios remain unchanged. The operational workflow catalog consists of the real repository-agent and company-research flows; it does not advertise the legacy scenario names as completed business automations.
