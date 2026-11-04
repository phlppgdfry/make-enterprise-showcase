# Make AI Agents integration

## What works now

The workbench and Node gateway execute the same tenant-scoped retrieval, customer lookup, lead scoring and policy code. The default data is explicitly synthetic. The browser does not run an LLM or contact Make. GitHub Pages cannot host the Node API.

The gateway optionally invokes an authenticated Make agent webhook for **support and knowledge drafts**. Lead scores remain deterministic fixture scores; live company research is not implemented. No workflow sends messages, changes accounts or writes to CRM.

## Connect a native Make AI Agent

Use **Make AI Agents (New) > Run an agent (New)** in the current Scenario Builder. The public REST AI-agent documentation also describes older agent resources; do not assume those endpoints provision the new module. Resolve the provider, model, module schemas and connections in your own team. A read-only check on 2026-11-04 found Make's default AI Provider in the existing team; this does not prove that a model run or billing will succeed.

1. Create a dedicated, authenticated webhook scenario for draft generation. It must be separate from the `/api/support` integration scenario to avoid recursive calls.
2. Learn this request shape: `query` (string), `proposedAction` (string), `context` (array of source objects with `id`, `title`, `quote`, `url`), `customer` (object or null). The gateway sends these fields, not raw billing data.
3. Add the new agent module. Select the provider and a supported model in the builder; do not copy an invented provider ID. Use [support instructions](../agents/support/instructions.md) or [knowledge instructions](../agents/knowledge/instructions.md). Map the whole input with the builder's JSON serializer. Set a short timeout and bounded steps/tokens appropriate to the selected model.
4. Configure a structured response matching [output.schema.json](../agents/output.schema.json). If only text is available, parse and validate JSON before responding. Return the object directly, without a `response` wrapper or Markdown fences. The gateway checks field types and source quotations again.
5. End with Webhooks > Webhook response, Content-Type application/json, serializing the object safely. Protect the incoming webhook with a gateway that checks `Authorization: Bearer <MAKE_AGENT_TOKEN>`. A secret URL alone is not the authentication used by this adapter.
6. Attach no mutation or send-email tools. The gateway already supplies scoped sources. If you later add retrieval tools, bind their tenant on the server and use independent tool scenarios that cannot call this drafting webhook recursively. New Make agents can choose module/scenario tools and supported MCP tools; this repository does not claim those tools have been provisioned.
7. Configure the local gateway environment (values are placeholders):

```dotenv
SHOWCASE_API_TOKEN=replace-with-a-long-random-token
SHOWCASE_TENANT_ID=north
MAKE_AGENT_URL=https://your-authenticated-agent-gateway.example/draft
MAKE_AGENT_TOKEN=replace-with-a-separate-random-token
```

Start `npm start`. A successful provider response becomes a **needs_review** draft. Timeout, bad JSON, missing sources or fabricated quotations become **AGENT_OUTPUT_REJECTED**. A model cannot authorize a refund by returning `escalated: false` or a high confidence score. The gateway allows one bounded outbound draft request per API call. Configure quotas and rate limiting at your reverse proxy before exposing it.

## Connect Make to the policy gateway

The updated blueprints 01/05 and new blueprint 06 call the policy gateway. They are configuration templates, not cloud-validated exports. Import, resolve the request data structure and module versions, authenticate both ends and verify outputs before activation. See each blueprint README.

Example support request, from a server or Make connection (never put this token in browser code):

```http
POST /api/support
Authorization: Bearer <SHOWCASE_API_TOKEN>
Content-Type: application/json

{"query":"What is the P1 incident response time?","customerId":"customer-north","action":"answer","amount":0}
```

Knowledge input: `{"query":"P1 incident response"}` to `/api/knowledge`.
Lead input: `{"domain":"north-logistics.example"}` to `/api/leads`.
The server sets the tenant. A mismatching `tenantId` is rejected with 403.

## Before production

Replace the fixture repository with an authenticated data adapter and enforce document permissions before retrieval. Keep any vector index partitioning server-side. Lexical overlap in this reference is not semantic similarity, model confidence or a guarantee that an answer is correct. The model adapter checks citation provenance; it cannot prove entailment, so drafts require review. The fixture gateway has no persistent conversation memory, queue, retries, audit store, per-user authorization or production rate limiter. It binds to loopback and needs an authenticated HTTPS proxy for remote access. Add those capabilities only with corresponding tests and real execution evidence.

The live Make account was inspected read-only during this update. Existing scenarios were not overwritten or activated. Publishing GitHub Pages does not activate agents in Make.

## Official sources checked on 2026-11-04

- [New Make AI Agents app](https://help.make.com/meet-the-new-make-ai-agents-app)
- [MCP tools in new agents](https://help.make.com/make-ai-agents-new-mcp-tools-are-now-available)
- [Make scenario API and concurrency](https://developers.make.com/api-documentation/api-reference/scenarios)
- [Scenario blueprint API](https://developers.make.com/api-documentation/api-reference/scenarios/blueprints)
- [Public AI agents API](https://developers.make.com/api-documentation/api-reference/ai-agents)

Context7 was used for the current Make API documentation. Account-specific configuration still requires schema resolution in Make.
