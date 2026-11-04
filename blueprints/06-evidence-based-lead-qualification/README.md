# Lead qualification

Status: **integration template; not deployed or import-verified in Make**.

The executable implementation lives in [agent-core.js](../../docs/lib/agent-core.js), served by the [authenticated gateway](../../scripts/server.js). The browser demo runs the same code over synthetic fixtures.

## Flow

Authenticated webhook → JSON serializer → tenant-bound gateway `/api/leads` → JSON response.

JSON serialization avoids putting unescaped customer input inside hand-written JSON. Tenant identity is bound by the gateway configuration, never selected by the agent. The gateway performs no external writes.

## Configure before import or deployment

1. Host `npm start` behind a private HTTPS reverse proxy. The server listens on loopback; GitHub Pages only hosts the static demo.
2. Set `SHOWCASE_API_TOKEN` and `SHOWCASE_TENANT_ID`. Use a separate instance/token per tenant.
3. Create a Make JSON data structure for the mapped input fields; replace `__REQUEST_DATA_STRUCTURE_ID__` and resolve its schema in Make. Missing `action` defaults to `answer`; if supplied, use one of `answer`, `refund`, `cancel`, `upgrade`. Amount must be numeric.
4. Replace the `.invalid` gateway URL. Bind authentication securely in Make, replacing `__GATEWAY_TOKEN__` without committing the result. Enable webhook authentication as well.
5. Verify the current HTTP and JSON module versions, response JSON serialization, and webhook payload schema in the builder. The UI blueprint and flat manifest describe the same flow, but local structural checks do not validate Make's module schemas.
6. Test all cases in `npm test` against the hosted gateway, including missing credentials, tenant mismatch, no evidence and malformed input. Configure HTTP errors to stop the scenario; never resume with a successful answer.

The previous speculative agent/vector manifests were replaced by this smaller integration boundary. Native Make AI Agents are configured separately using the [agent guide](../../docs/MAKE-AI-AGENTS.md). No arbitrary connection IDs, vector isolation claims or pre-policy mutation tools are supplied.
