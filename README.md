# 🚀 Enterprise Make.com Architecture & AI Automation Portfolio

[![Live Interactive Showcase](https://img.shields.io/badge/Live%20Showcase-GitHub%20Pages-10B981?style=for-the-badge&logo=github)](https://phlppgdfry.github.io/make-enterprise-showcase/)
[![Compliance Score](https://img.shields.io/badge/Security%20Audit-100%25%20A%2B-blueviolet?style=for-the-badge&logo=securityscorecard)](https://github.com/phlppgdfry/make-enterprise-showcase)
[![CI Blueprint Validation](https://img.shields.io/badge/CI-15%2F15%20Passing-success?style=for-the-badge&logo=githubactions)](https://github.com/phlppgdfry/make-enterprise-showcase/actions)
[![Live Webhook Health](https://img.shields.io/badge/Webhooks%20Probe-5%2F5%20Healthy%20(200)-00B4D8?style=for-the-badge&logo=fastapi)](https://phlppgdfry.github.io/make-enterprise-showcase/#dispatcher)
[![Make.com CLI](https://img.shields.io/badge/@makehq%2Fcli-v1.4.0-0078D4?style=for-the-badge&logo=node.js)](https://www.npmjs.com/package/@makehq/cli)
[![Endpoints SDK](https://img.shields.io/badge/@makehq%2Fendpoints--sdk-Typed-blue?style=for-the-badge)](./sdk)
[![Make Custom App](https://img.shields.io/badge/Make%20App%20SDK-v1.0-orange?style=for-the-badge)](./apps/enterprise-circuit-breaker)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

👉 **Experience the Live Web Simulator, Visual Canvas & Webhook Playground:**  
**[https://phlppgdfry.github.io/make-enterprise-showcase/](https://phlppgdfry.github.io/make-enterprise-showcase/)**

An enterprise-grade portfolio of production Make.com (formerly Integromat) automation blueprints, custom integration apps, and AI agent orchestrations designed for high-scale enterprise environments.

Targeted for **Zone `eu1.make.com`**, Organization `9433554` (Team `3365938`), and organizations running mission-critical integration workloads under strict SOC2 Type II, ISO 27001, and GDPR Article 32 compliance.

---

## ⚡ Quickstart: Try It In Your Terminal

Run the automated test suite, security linter, synthetic probe, and runtime pipeline simulator:

```bash
git clone https://github.com/phlppgdfry/make-enterprise-showcase.git
cd make-enterprise-showcase

npm test         # Run 15/15 schema & blueprint validation tests
npm run audit    # Run Enterprise Security & SOC2 Compliance Linter (100% Score)
npm run probe    # Run live synthetic health probe against all 5 Make cloud webhooks
npm run dispatch # Transmit realistic enterprise payloads to live Make scenarios
npm run simulate # Run interactive scenario runtime pipeline simulation
npm run deploy   # Automatically synchronize & deploy to your Make.com team
```

---

## 🏆 5 Live Scenarios Deployed in Make Cloud

All 5 scenarios are organized in Make Cloud under folder **"Enterprise Showcase"** (Folder ID `409722`) with production tags (`Production`, `AI-Agent`, `Enterprise`):

| Scenario | Live Make ID | Live Cloud Webhook Gateway | Architectural Pattern | Primary Technologies |
| :--- | :--- | :--- | :--- | :--- |
| **[01. AI Agent & HITL](./blueprints/01-ai-agent-autonomous-triage)** | `8199345` | `https://hook.eu1.make.com/3ng4qyruhzdvjcyll5bx06pt8yyjibvo` | LLM Tool Calling, Session Memory, Human-in-the-Loop Slack Escalation | Make AI Agent, Data Store, Stripe, Slack |
| **[02. Idempotent Ingestion & DLQ](./blueprints/02-idempotent-webhook-dlq-engine)** | `8199349` | `https://hook.eu1.make.com/evjp003di7qo8rrkuu3v1d1crsyi8srg` | Exactly-Once Execution, HMAC Verification, Dead Letter Queue (DLQ) | Custom Webhooks, Data Store Deduplication, Stripe |
| **[03. CRM Billing Sync](./blueprints/03-bidirectional-crm-billing-reconciliation)** | `8199351` | `https://hook.eu1.make.com/ta9a6c4nfg7m5ux3r9zdce4jrmtahmro` | High-Watermark Delta Sync, Batch Iterators, Array Aggregator | Stripe API, HubSpot CRM, Data Store Cursor |
| **[04. Self-Healing ETL & Governor](./blueprints/04-self-healing-etl-rate-limit-governor)** | `8199353` | `https://hook.eu1.make.com/1rvaq9sziyyo9dlsziixyyu9dgdrjoyu` | Token Bucket Algorithm, Dynamic Backpressure, Compensating Saga Rollback | JSON Schema Validator, Data Store, ClickHouse |
| **[05. Knowledge RAG Engine](./blueprints/05-rag-vector-knowledge-dispatcher)** | `8199357` | `https://hook.eu1.make.com/vn0oi845t18ogb7kd0ghv8veczd915x8` | Retrieval-Augmented Generation, 1536-dim Embeddings, Tenant Isolation | OpenAI Embeddings, Pinecone Vector DB |

---

## 🛰️ Test Live Webhooks with cURL

Every scenario is bound to a live gateway endpoint on `eu1.make.com`. You can trigger them directly:

```bash
# Test Scenario 01: Multi-Tool AI Agent Triage
curl -X POST "https://hook.eu1.make.com/3ng4qyruhzdvjcyll5bx06pt8yyjibvo" \
  -H "Content-Type: application/json" \
  -d '{"customerId":"cust_vip_882","inboundMessage":"Double billed on invoice INV-90412 ($189.50)","amount":189.50}'

# Test Scenario 02: Stripe Idempotent Charge
curl -X POST "https://hook.eu1.make.com/evjp003di7qo8rrkuu3v1d1crsyi8srg" \
  -H "Content-Type: application/json" \
  -d '{"idempotencyKey":"idemp_sample_01","amount":49900,"currency":"eur"}'

# Test Scenario 05: Multi-Tenant Vector RAG Query
curl -X POST "https://hook.eu1.make.com/vn0oi845t18ogb7kd0ghv8veczd915x8" \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"tenant_nl_finance","inboundQuery":"What is our contractual SLA uptime penalty?"}'
```

---

## 🛠️ Make Custom App: Enterprise Circuit Breaker & Guard

Senior Make architects do not rely solely on third-party public apps. This repository includes a production-ready custom Make integration app created with the **Make Apps SDK**:

👉 **[Enterprise Circuit Breaker & Guard App](./apps/enterprise-circuit-breaker)**
- **Guarded Request Action (`guarded-request`)**: Prevents cascading failures with `CLOSED` -> `OPEN` -> `HALF-OPEN` circuit transitions.
- **HMAC Verification Action (`verify-hmac`)**: Constant-time cryptographic signature validation to protect against webhook timing attacks.
- **Dynamic Cluster RPC (`rpcs/list-clusters.json`)**: Remote procedure call populating dynamic region dropdowns.
- **Custom IML Function (`functions/computeHmac.js`)**: In-memory JavaScript function accessible directly inside Make formula expressions.
- Deployable to any Make organization using `make-cli sdk-apps`.

---

## 💻 Programmatic Backend Integration: Make Endpoints SDK

Microservices can invoke Make endpoints typed and programmatically without building canvases:

👉 **[Make Endpoints SDK Integration](./sdk)**
```typescript
import { MakeClient } from '@makehq/endpoints-sdk';

const client = new MakeClient({ apiKey: process.env.MAKE_API_KEY!, zone: 'eu1.make.com' });

await client.endpoints.call({
  teamId: 3365938,
  app: 'slack',
  endpoint: 'CreateMessage',
  connectionId: 30512,
  confidential: true,              // Excludes PII from Make logs (GDPR)
  idempotencyKey: 'req_18210_abc', // Eliminates duplicate execution
  input: { channel: '#ops-alerts', text: 'Transaction committed' }
});
```

---

## 🛡️ Automated Architecture & Security Linter (`npm run audit`)

Every scenario in this portfolio is audited against 8 enterprise iPaaS compliance rules:

```bash
$ npm run audit

================================================================
🛡️  Make.com Enterprise Architecture & Security Compliance Audit
================================================================

┌─────────┬───────────────────────────────────────────────┬────────┬──────────────────┬────────────────┐
│ (index) │ scenario                                      │ score  │ status           │ issues         │
├─────────┼───────────────────────────────────────────────┼────────┼──────────────────┼────────────────┤
│ 0       │ '01-ai-agent-autonomous-triage'               │ '100%' │ '🟢 PASSED (A+)' │ 'None (Clean)' │
│ 1       │ '02-idempotent-webhook-dlq-engine'            │ '100%' │ '🟢 PASSED (A+)' │ 'None (Clean)' │
│ 2       │ '03-bidirectional-crm-billing-reconciliation' │ '100%' │ '🟢 PASSED (A+)' │ 'None (Clean)' │
│ 3       │ '04-self-healing-etl-rate-limit-governor'     │ '100%' │ '🟢 PASSED (A+)' │ 'None (Clean)' │
│ 4       │ '05-rag-vector-knowledge-dispatcher'          │ '100%' │ '🟢 PASSED (A+)' │ 'None (Clean)' │
└─────────┴───────────────────────────────────────────────┴────────┴──────────────────┴────────────────┘

================================================================
🏆 OVERALL ENTERPRISE COMPLIANCE SCORE: 100% / 100%
   SOC2 Type II / ISO 27001 iPaaS Readiness: EXCELLENT
================================================================
```

---

## 🏛️ Senior Architectural Decision Records (ADRs)

- **[ADR-001: Deterministic Idempotency vs Distributed Locks](./docs/ADR-001-IDEMPOTENCY-VS-DISTRIBUTED-LOCKS.md)**  
  Why atomic Make Data Store key-locks with TTL eliminate external Redis dependencies for financial deduplication.
- **[ADR-002: Agentic Dynamic Tool Calling vs Hardcoded Routers](./docs/ADR-002-AGENTIC-TOOL-CALLING-VS-HARDCODED-ROUTER.md)**  
  Replacing combinatorial if/else router explosions with autonomous LLM reasoning loops, tool manifests, and deterministic confidence gates.
- **[ADR-003: Event-Driven Push vs Polling Interval Architecture](./docs/ADR-003-EVENT-DRIVEN-PUSH-VS-POLLING.md)**  
  Why enterprise architectures deprecate interval polling in favor of HMAC-authenticated webhooks and high-watermark delta cursor fallback.

---

## 📖 SRE Runbooks & Operational Standards

- **[SRE Incident Response & Disaster Recovery Runbook](./docs/RUNBOOK-INCIDENT-RESPONSE.md)**  
  Severity matrix (P1–P4), Dead Letter Queue (DLQ) replay procedures, circuit breaker manual resets, and zero-downtime secret rotation.
- **[Enterprise Security, Encryption & GDPR Governance](./docs/SECURITY-AND-GOVERNANCE.md)**  
  SOC2 Type II readiness, GDPR Article 32 confidential execution, and zero-trust perimeter verification.
- **[TCO & Make Operations Cost Optimization Guide](./docs/ROI-AND-COST-OPTIMIZATION.md)**  
  Mathematical proof of operation reduction using array aggregation and delta batching (saving up to 99% in operations).
- **[How to Import into Make Dashboard](./docs/MAKE-DASHBOARD-IMPORT-GUIDE.md)**  
  Step-by-step import instructions via UI or CLI.
- **[Make CLI & MCP Setup Guide](./docs/CLI-AND-MCP-GUIDE.md)**  
  Complete configuration guide for Claude Code, Cursor, and Gemini CLI.

---

## 📄 License
MIT License. Created by Philippe Godfroy for senior enterprise integration and automation engineering showcase.
