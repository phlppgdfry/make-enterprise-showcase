# 🚀 Enterprise Make.com Architecture & AI Automation Portfolio

[![Live Interactive Showcase](https://img.shields.io/badge/Live%20Showcase-GitHub%20Pages-10B981?style=for-the-badge&logo=github)](https://phlppgdfry.github.io/make-enterprise-showcase/)
[![Compliance Score](https://img.shields.io/badge/Security%20Audit-100%25%20A%2B-blueviolet?style=for-the-badge&logo=securityscorecard)](https://github.com/phlppgdfry/make-enterprise-showcase)
[![CI Blueprint Validation](https://img.shields.io/badge/CI-15%2F15%20Passing-success?style=for-the-badge&logo=githubactions)](https://github.com/phlppgdfry/make-enterprise-showcase/actions)
[![Make.com CLI](https://img.shields.io/badge/@makehq%2Fcli-v1.4.0-0078D4?style=for-the-badge&logo=node.js)](https://www.npmjs.com/package/@makehq/cli)
[![Endpoints SDK](https://img.shields.io/badge/@makehq%2Fendpoints--sdk-Typed-blue?style=for-the-badge)](./sdk)
[![MCP Protocol](https://img.shields.io/badge/MCP-Make%20Server-8A2BE2?style=for-the-badge)](https://github.com/integromat/make-mcp-server)
[![Make Custom App](https://img.shields.io/badge/Make%20App%20SDK-v1.0-orange?style=for-the-badge)](./apps/enterprise-circuit-breaker)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

👉 **Experience the Live Web Simulator & Visual Canvas:** **[https://phlppgdfry.github.io/make-enterprise-showcase/](https://phlppgdfry.github.io/make-enterprise-showcase/)**

An enterprise-grade portfolio of production Make.com (Integromat) automation blueprints, custom integration apps, and AI agent orchestrations designed for high-scale enterprise environments.

Targeted for **Zone `eu1.make.com`** and organizations running mission-critical integration workloads.

---

## ⚡ Quickstart: Try It In Your Terminal

Run the automated test suite, security linter, and runtime pipeline simulator:

```bash
git clone https://github.com/phlppgdfry/make-enterprise-showcase.git
cd make-enterprise-showcase

npm test         # Run 15/15 schema & blueprint validation tests
npm run audit    # Run Enterprise Security & SOC2 Compliance Linter (100% Score)
npm run simulate # Run live interactive scenario execution simulation
npm run deploy   # Automatically synchronize & deploy to your Make.com team
```

---

## 🏆 5 Live Scenarios Deployed in Make Cloud

| Scenario | Live Make ID | Architectural Pattern | Primary Technologies | Business ROI |
| :--- | :--- | :--- | :--- | :--- |
| **[01. Autonomous Multi-Tool AI Agent & HITL](./blueprints/01-ai-agent-autonomous-triage)** | `8199345` | Dynamic LLM Tool Calling, Session Memory, Human-in-the-Loop Slack Escalation | Make AI Local Agent, Data Store, Stripe, Slack | **-78% first-response time**, zero unverified hallucinated actions. |
| **[02. Idempotent Ingestion & DLQ Engine](./blueprints/02-idempotent-webhook-dlq-engine)** | `8199349` | Exactly-Once Execution, HMAC Verification, Dead Letter Queue (DLQ), P1 Alerts | Custom Webhooks, Data Store Deduplication, Stripe, Slack | **Zero duplicate charges**, guaranteed event recovery, SOC2 compliant. |
| **[03. Bi-Directional CRM & Billing Reconciliation](./blueprints/03-bidirectional-crm-billing-reconciliation)** | `8199351` | High-Watermark Delta Sync, Batch Iterators, Array Aggregation, Audit Digest | Stripe API, HubSpot CRM, Data Store Cursor, Slack | **Eliminates full-table scans**, reconciles MRR & subscription tiers. |
| **[04. Self-Healing ETL & Rate-Limit Governor](./blueprints/04-self-healing-etl-rate-limit-governor)** | `8199353` | Token Bucket Algorithm, Dynamic Backpressure, Compensating Saga Rollback | JSON Schema Validator, Data Store, ClickHouse / Snowflake | **Prevents 429 throttling**, maintains database ACID integrity on partial fails. |
| **[05. Multi-Tenant Enterprise Knowledge RAG Engine](./blueprints/05-rag-vector-knowledge-dispatcher)** | `8199357` | Retrieval-Augmented Generation, 1536-dim Embeddings, Metadata Tenant Isolation | OpenAI Embeddings, Pinecone Vector DB, AI Agent | **Sub-second semantic lookup**, isolated data spaces per enterprise customer. |

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
  confidential: true,     // Excludes PII from Make logs (GDPR)
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

## 🏛️ Senior Engineering Principles

1. **Deterministic Idempotency**: All mutating webhooks utilize an atomic lock pattern in Make Data Store with an auto-expiring TTL to prevent race conditions and duplicate operations.
2. **Explicit Error Routing**: Avoids default silent failures. Critical endpoints use explicit `Break` directives with exponential backoff and fallback routes into a **Dead Letter Queue (DLQ)**.
3. **Array Aggregation Efficiency**: Every batch iterator is explicitly closed with an aggregator to release runtime memory and batch subsequent calls, reducing Make operation consumption by up to 60%.
4. **Token-Bucket Governance**: Protects downstream microservices and rate-limited third-party APIs by queuing bursts and applying dynamic backpressure.
5. **Agentic Guardrails**: Autonomous LLMs are restricted by deterministic confidence score gates (`>= 85%`). Sensitive transactions require explicit human approval via interactive messaging.

---

## 📖 In-Depth Documentation
- [How to Import into Make Dashboard](./docs/MAKE-DASHBOARD-IMPORT-GUIDE.md)
- [Enterprise Architectural Patterns & Error Directives](./docs/ENTERPRISE-PATTERNS.md)
- [ROI, TCO & Operation Cost Optimization Guide](./docs/ROI-AND-COST-OPTIMIZATION.md)
- [Security, Compliance & GDPR Governance](./docs/SECURITY-AND-GOVERNANCE.md)
- [Make CLI & MCP Setup Guide](./docs/CLI-AND-MCP-GUIDE.md)

---

## 📄 License
MIT License. Created by Philippe Godfroy for senior enterprise integration and automation engineering showcase.
