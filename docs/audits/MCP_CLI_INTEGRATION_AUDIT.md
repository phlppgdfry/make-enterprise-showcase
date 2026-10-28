# Make CLI, MCP Server & Endpoints SDK Technical Audit

**Target Tooling:** `@makehq/cli` (v1.4.0), `@makehq/mcp-server` (v0.5.0), `@makehq/endpoints-sdk`  
**Host Environment:** macOS (Darwin arm64)  
**Date:** October 28, 2026  

---

## 1. Executive Summary
This audit evaluated the local developer tooling, Model Context Protocol (MCP) server integration, and programmatic SDK integration with Make Cloud.

---

## 2. Make CLI (`@makehq/cli`) Audit

- **Binary Location:** `/Users/philippegodfroy/.local/share/mise/installs/node/24/bin/make-cli`
- **Installed Version:** `1.4.0`
- **Authentication Mechanism:** Local credential store at `~/.config/make-cli/config.json`
- **Zone:** `eu1.make.com`
- **Authenticated Identity:** `phlppgdfry` (User ID `9755814`, Email `philippe.godfroy@hotmail.com`)

### Command Capabilities Verified:
- `make-cli whoami` -> Verified active authentication.
- `make-cli organizations get --organization-id 9433554` -> Verified license and quota inspection.
- `make-cli teams get --team-id 3365938` -> Verified team statistics.
- `make-cli scenarios list --team-id 3365938` -> Verified scenario inventory.
- `make-cli data-stores list --team-id 3365938` -> Verified Data Store management.
- `make-cli executions list --scenario-id 8199345` -> Verified audit trail inspection.

---

## 3. Model Context Protocol (MCP) Integration Audit

MCP enables AI coding agents (Claude Desktop, Cursor, Gemini CLI) to inspect and manage Make scenarios directly.

### Configuration Analysis:
1. **Claude Code / Desktop (`~/.claude.json`):**
   - Configured via SSE endpoint: `https://mcp.make.com/claude`
   - Verified active and operational.
2. **Gemini CLI (`~/.gemini/settings.json`):**
   - Remote Endpoint: `"make": { "httpUrl": "https://mcp.make.com/claude" }`
   - Local Subprocess: `"make-local": { "command": "mcp-server-make", "env": { "MAKE_ZONE": "eu1.make.com" } }`

### Critical Defect Identified & Remediation:
- **Defect:** Running `mcp-server-make` without `MAKE_API_KEY` throws an immediate exit error: `Please provide MAKE_API_KEY environment variable`.
- **Remediation:** Gemini CLI should either pass `MAKE_API_KEY` in the environment block or rely exclusively on the authenticated remote HTTP endpoint `https://mcp.make.com/claude`.

---

## 4. Make Endpoints SDK (`@makehq/endpoints-sdk`) Audit

Located in [sdk/call-endpoint.ts](file:///Users/philippegodfroy/make-enterprise-showcase/sdk/call-endpoint.ts).

### Architectural Value:
Allows external backend microservices (e.g. Node.js, Next.js, Express) to invoke Make endpoints programmatically without designing canvases:
- **Type Safety:** Strongly typed input and output contracts.
- **GDPR Article 32 Compliance:** Native support for the `confidential: true` execution flag, suppressing PII logging in Make history.
- **Idempotency Guarantee:** Native support for `idempotencyKey` parameter, preventing duplicate executions across microservice retries.

```typescript
import { MakeClient } from '@makehq/endpoints-sdk';

const client = new MakeClient({ apiKey: process.env.MAKE_API_KEY!, zone: 'eu1.make.com' });

await client.endpoints.call({
  teamId: 3365938,
  app: 'slack',
  endpoint: 'CreateMessage',
  connectionId: 30512,
  confidential: true,
  idempotencyKey: 'req_18210_abc',
  input: { channel: '#ops-alerts', text: 'Transaction committed' }
});
```

---

## 5. Security & Permission Scopes
The Make API token configured for this project possesses targeted scopes:
- `scenarios:read`, `scenarios:write`, `scenarios:run`
- `data-stores:read`, `data-stores:write`
- `organizations:read`, `teams:read`

No dangerous super-admin or billing modification permissions are attached to the token.
