# 🚀 Enterprise Make.com Architecture & AI Automation Portfolio

[![Live Interactive Showcase](https://img.shields.io/badge/Live%20Showcase-GitHub%20Pages-10B981?style=for-the-badge&logo=github)](https://phlppgdfry.github.io/make-enterprise-showcase/)
[![Architecture Linter](https://img.shields.io/badge/Architecture%20Audit-98%25%20Tier%201-blueviolet?style=for-the-badge&logo=securityscorecard)](./docs/audits/PRINCIPAL_MAKE_ARCHITECTURE_AUDIT.md)
[![CI Blueprint Validation](https://img.shields.io/badge/CI-15%2F15%20Passing-success?style=for-the-badge&logo=githubactions)](https://github.com/phlppgdfry/make-enterprise-showcase/actions)
[![Test Lab Suite](https://img.shields.io/badge/Test%20Lab-5%2F5%20Passing-00B4D8?style=for-the-badge&logo=fastapi)](./scripts/test-runner.js)
[![Make.com CLI](https://img.shields.io/badge/@makehq%2Fcli-v1.4.0-0078D4?style=for-the-badge&logo=node.js)](https://www.npmjs.com/package/@makehq/cli)
[![Endpoints SDK](https://img.shields.io/badge/@makehq%2Fendpoints--sdk-Typed-blue?style=for-the-badge)](./sdk)
[![Make Custom App](https://img.shields.io/badge/Make%20App%20SDK-v1.0-orange?style=for-the-badge)](./apps/enterprise-circuit-breaker)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

👉 **Experience the Live Web Simulator, Visual Canvas & Architecture Explorer:**  
**[https://phlppgdfry.github.io/make-enterprise-showcase/](https://phlppgdfry.github.io/make-enterprise-showcase/)**

An enterprise-grade portfolio of production Make.com (formerly Integromat) automation blueprints, custom integration apps, and AI agent orchestrations designed for high-scale enterprise environments.

Targeted for **Zone `eu1.make.com`**, Organization `9433554` (Team `3365938`), and organizations running mission-critical integration workloads under strict SOC2 Type II, ISO 27001, and GDPR Article 32 compliance.

---

## ⚡ Quickstart: Try It In Your Terminal

Run the automated test lab, blueprint validation suite, architecture linter, and runtime simulator:

```bash
git clone https://github.com/phlppgdfry/make-enterprise-showcase.git
cd make-enterprise-showcase

npm test         # Run 15/15 schema & blueprint validation tests
npm run test:all # Run Master Enterprise Test Lab (Concurrency, Fault Injection, FinOps, Security)
npm run audit    # Run Enterprise Architecture Linter (8 Dimensions, 98% Tier 1 Score)
npm run probe    # Run controlled synthetic health check (supports --dry-run)
npm run dispatch # Transmit enterprise test payloads to scenario sandbox (supports --dry-run)
npm run simulate # Run interactive scenario runtime pipeline simulation
npm run deploy   # Automatically synchronize & deploy to your Make.com team
```

---

## 🏆 5 Enterprise Scenarios Deployed in Make Cloud

All 5 scenarios are provisioned in Make Cloud under folder **"Enterprise Showcase"** (Folder ID `409722`) with dedicated production tags (`Production`, `AI-Agent`, `Enterprise`):

| Scenario | Live Make ID | Cloud Hook ID | Architectural Pattern | Primary Technologies |
| :--- | :--- | :--- | :--- | :--- |
| **[01. AI Agent & HITL](./blueprints/01-ai-agent-autonomous-triage)** | `8199345` | `3989209` | LLM Tool Calling, Session Memory, Human-in-the-Loop Slack Escalation | Make AI Agent, Data Store, Stripe, Slack |
| **[02. Idempotent Ingestion & DLQ](./blueprints/02-idempotent-webhook-dlq-engine)** | `8199349` | `3989280` | Exactly-Once Execution, HMAC Verification, Dead Letter Queue (DLQ) | Custom Webhooks, Data Store Deduplication, Stripe |
| **[03. CRM Billing Sync](./blueprints/03-bidirectional-crm-billing-reconciliation)** | `8199351` | `3989325` | High-Watermark Delta Sync, Batch Iterators, Array Aggregator | Stripe API, HubSpot CRM, Data Store Cursor |
| **[04. Self-Healing ETL & Governor](./blueprints/04-self-healing-etl-rate-limit-governor)** | `8199353` | `3989328` | Token Bucket Algorithm, Dynamic Backpressure, Compensating Saga Rollback | JSON Schema Validator, Data Store, ClickHouse |
| **[05. Knowledge RAG Engine](./blueprints/05-rag-vector-knowledge-dispatcher)** | `8199357` | `3989330` | Retrieval-Augmented Generation, 1536-dim Embeddings, Tenant Isolation | OpenAI Embeddings, Pinecone Vector DB |

> [!NOTE]
> In accordance with Phase 0 security guidelines, cloud scenarios are deployed in an **inactive state (`isActive: false`)** on Make's Free license tier (1,000 ops limit) to prevent unauthorized quota depletion and avoid exposing credentials in a public open-source repository. Anonymous visitors can safely test all scenarios via the **Client-Side Sandbox Simulator** on GitHub Pages.

---

## 🧪 Master Enterprise Automation Test Lab (`npm run test:all`)

Every architectural pattern in this portfolio is empirically verified by our multi-tier automated test suite:

```bash
$ npm run test:all

================================================================
🧪 Enterprise Make.com Architecture Test Lab (Full Verification)
================================================================

▶ Running Suite 1: Concurrency & Idempotency Determinism (Phase 4)...
▶ Running Suite 2: Fault Injection & Error Recovery (Phase 5)...
▶ Running Suite 3: FinOps & Operation Cost Models (Phase 9)...
▶ Running Suite 4: Webhook Security & Cryptographic Signatures (Phase 8)...

================================================================
📋 ENTERPRISE TEST LAB EXECUTION SUMMARY
================================================================
┌─────────┬─────────────────────────────────┬────────────────────────────────────────────────────┬───────────┬──────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ (index) │ suite                           │ test                                               │ status    │ duration │ details                                                                                                  │
├─────────┼─────────────────────────────────┼────────────────────────────────────────────────────┼───────────┼──────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 0       │ 'Concurrency & Idempotency'     │ 'Atomic Lock vs Non-Atomic Race Condition'         │ '🟢 PASS' │ '21ms'   │ 'Naive resulted in 5 executions (race condition proved). Atomic lock strictly enforced 1 execution.'     │
│ 1       │ 'Fault Injection & Reliability' │ 'HTTP 429 Sliding Window Rate Throttling'          │ '🟢 PASS' │ '0ms'    │ 'Incoming load (280/min) exceeded 250 req/min. Injected 4500ms backpressure delay without message drop.' │
│ 2       │ 'Fault Injection & Reliability' │ 'Poison Pill Isolation to Dead Letter Queue (DLQ)' │ '🟢 PASS' │ '1ms'    │ 'Malformed payload safely trapped in DLQ. Zero unhandled scenario crashes.'                              │
│ 3       │ 'FinOps & Optimization'         │ 'Batch Aggregator Operation Slashing'              │ '🟢 PASS' │ '0ms'    │ 'Volume 100,000 records: Naive = 400,000 ops, Senior = 4,000 ops. Verified reduction: 99.0%.'            │
│ 4       │ 'Webhook Security'              │ 'Constant-Time HMAC-SHA256 Signature Verification' │ '🟢 PASS' │ '0ms'    │ 'Authentic HMAC accepted; forged signature rejected with timing-attack safe comparison.'                 │
└─────────┴─────────────────────────────────┴────────────────────────────────────────────────────┴───────────┴──────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
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
  confidential: true,              // Excludes PII from Make logs (GDPR Article 32)
  idempotencyKey: 'req_18210_abc', // Eliminates duplicate execution
  input: { channel: '#ops-alerts', text: 'Transaction committed' }
});
```

---

## 📚 Comprehensive Audit & Architecture Reports

1. **[Principal Architecture Audit](./docs/audits/PRINCIPAL_MAKE_ARCHITECTURE_AUDIT.md)**: Exhaustive findings log with severity ratings, root causes, and verification evidence.
2. **[Live Make Cloud Verification](./docs/audits/LIVE_MAKE_CLOUD_VERIFICATION.md)**: 10-point scenario verification matrix and organization quota audit.
3. **[Scenario Execution Evidence](./docs/audits/SCENARIO_EXECUTION_EVIDENCE.md)**: Empirical proof for AI confidence scoring, idempotency, and Saga rollbacks.
4. **[Webhook Security & Threat Model](./docs/audits/WEBHOOK_SECURITY_AUDIT.md)**: STRIDE threat model, HMAC constant-time comparisons, and GDPR Article 32 controls.
5. **[Idempotency & Concurrency Tests](./docs/audits/IDEMPOTENCY_CONCURRENCY_TESTS.md)**: Proving race conditions in naive models vs 100% determinism with atomic locks.
6. **[Error Handling & Reliability Report](./docs/audits/ERROR_HANDLING_RELIABILITY_REPORT.md)**: Evaluation of Resume, Break, Rollback, Commit directives and DLQ recovery.
7. **[Custom App SDK Validation](./docs/audits/CUSTOM_APP_SDK_VALIDATION.md)**: Technical audit of the custom circuit breaker app and state persistence.
8. **[MCP & CLI Integration Audit](./docs/audits/MCP_CLI_INTEGRATION_AUDIT.md)**: Model Context Protocol setup and developer tooling diagnostics.
9. **[FinOps & Credit Analysis](./docs/audits/FINOPS_CREDIT_ANALYSIS.md)**: Mathematical proof of 99% operation reduction via batch aggregation.
10. **[Enterprise Automation Case Study](./docs/case-study/ENTERPRISE_AUTOMATION_CASE_STUDY.md)**: Multimodal logistics automation hub with AS-IS/TO-BE BPMN, RACI matrix, and ROI framework.
11. **[Final Portfolio Readiness](./docs/audits/FINAL_PORTFOLIO_READINESS.md)**: Component-by-component readiness classification.
12. **[Remaining Architectural Risks](./docs/audits/REMAINING_RISKS.md)**: Production transition roadmap and cloud scaling recommendations.

---

## 🏛️ Architectural Decision Records (ADRs)

- **[ADR-001: Deterministic Idempotency vs Distributed Locks](./docs/ADR-001-IDEMPOTENCY-VS-DISTRIBUTED-LOCKS.md)**  
- **[ADR-002: Agentic Dynamic Tool Calling vs Hardcoded Routers](./docs/ADR-002-AGENTIC-TOOL-CALLING-VS-HARDCODED-ROUTER.md)**  
- **[ADR-003: Event-Driven Push vs Polling Interval Architecture](./docs/ADR-003-EVENT-DRIVEN-PUSH-VS-POLLING.md)**  

---

## 📄 License
MIT License. Created by Philippe Godfroy for senior enterprise integration and automation engineering showcase.
