# Enterprise Make.com Incident Response & Disaster Recovery Runbook

**Classification:** Internal Operations / SRE Guide  
**Applies To:** Zone `eu1.make.com` | Organization `9433554` | Team `3365938`  
**Compliance Standard:** SOC2 Type II, ISO 27001, GDPR Article 32  

---

## 1. Incident Severity Matrix & SLAs

| Severity | Definition | Examples | SLA (MTTD / MTTR) | Notification Channel |
| :--- | :--- | :--- | :--- | :--- |
| **P1 - Critical** | Total disruption of mission-critical revenue flow. Zero transactions processing. | Webhook Gateway down; Stripe Idempotency lock deadlock; Core Data Store quota breach. | **< 5 min / < 30 min** | PagerDuty + `#ops-incident-p1` + SMS escalation |
| **P2 - High** | Degradation of integration performance or spike in DLQ poison pills. | Downstream CRM 429 rate-limiting; LLM latency > 8s; Circuit breaker in `OPEN` state. | **< 15 min / < 2 hrs** | Slack `#ops-incident-p2` |
| **P3 - Medium** | Non-blocking synchronization drift or reconciliation discrepancy. | High-watermark delta sync delayed; Data Store record count warning (> 80%). | **< 1 hr / < 8 hrs** | Slack `#ops-integrations` |
| **P4 - Low** | Minor cosmetic warning, deprecated API warning, or blueprint linting advisory. | Token expiry advisory (> 14 days); Non-critical schema property addition. | **< 24 hrs / Next Sprint** | Jira Ticket backlog |

---

## 2. Emergency Operational Procedures

### A. Dead Letter Queue (DLQ) Inspection & Replay
When a downstream microservice experiences an outage, payloads fail safely into the Make Data Store DLQ table (`dlq_messages`).

#### Step 1: Inspect Unprocessed DLQ Items
```bash
# Via Make CLI or custom inspector script
cd make-enterprise-showcase
npm run replay -- --inspect
```

#### Step 2: Verify Downstream Service Health
Before triggering replay, verify the target endpoint has recovered:
```bash
curl -I -X GET https://api.crm.internal/healthz
```

#### Step 3: Execute Controlled Replay with Exponential Rate
```bash
# Replay up to 50 items with 250ms spacing to prevent re-saturating target API
npm run replay -- --batch 50 --delay 250
```

---

### B. Circuit Breaker Override & Reset Procedure
If the custom `enterprise-circuit-breaker` app trips to `OPEN` state due to transient upstream failure:

1. **Check Circuit Status**:
   Inspect the Data Store key `circuit_breaker:crm_api`:
   ```json
   {
     "state": "OPEN",
     "failureCount": 12,
     "lastFailureTimestamp": 1793120100,
     "cooldownPeriodSeconds": 300
   }
   ```
2. **Force State to `HALF-OPEN` for Canary Testing**:
   Update the Data Store record through the Make Dashboard or CLI:
   ```bash
   make-cli datastores records update \
     --data-store-id 234492 \
     --key "circuit_breaker:crm_api" \
     --data '{"state":"HALF-OPEN","failureCount":0}'
   ```
3. Monitor the next 10 consecutive requests in Make Execution History. If successful, the circuit resets automatically to `CLOSED`.

---

### C. Live Webhook Health Synthetic Probing
Run end-to-end synthetic probing across all 5 production webhooks:
```bash
cd make-enterprise-showcase
npm run probe
```
**Expected Output:**
```
┌─────────┬───────────────────────────────┬────────────┬────────────┬───────────┬────────────┬──────────────┐
│ (index) │ scenario                      │ scenarioId │ statusCode │ latencyMs │ response   │ status       │
├─────────┼───────────────────────────────┼────────────┼────────────┼───────────┼────────────┼──────────────┤
│ 0       │ '01. AI Agent & HITL'         │ 8199345    │ 200        │ '145ms'   │ 'Accepted' │ '🟢 HEALTHY' │
│ 1       │ '02. Idempotent Ingest & DLQ' │ 8199349    │ 200        │ '112ms'   │ 'Accepted' │ '🟢 HEALTHY' │
│ 2       │ '03. CRM Billing Sync'        │ 8199351    │ 200        │ '98ms'    │ 'Accepted' │ '🟢 HEALTHY' │
│ 3       │ '04. ETL Rate Governor'       │ 8199353    │ 200        │ '104ms'   │ 'Accepted' │ '🟢 HEALTHY' │
│ 4       │ '05. Vector Knowledge RAG'    │ 8199357    │ 200        │ '118ms'   │ 'Accepted' │ '🟢 HEALTHY' │
└─────────┴───────────────────────────────┴────────────┴────────────┴───────────┴────────────┴──────────────┘
```

---

## 3. Credential & Secrets Rotation Runbook

Under SOC2 Type II guidelines, integration credentials must be rotated at least every 90 days or immediately upon key compromise.

### 1. Make API Key Rotation (`MAKE_API_KEY`)
1. In Make Cloud: Navigate to **Profile > API Access > Add Token**.
2. Select exact scopes: `scenarios:read`, `scenarios:write`, `scenarios:run`, `data-stores:read`, `data-stores:write`.
3. Update GitHub Actions secrets:
   ```bash
   gh secret set MAKE_API_KEY --body "YOUR_NEW_TOKEN"
   ```
4. Update local CLI authentication:
   ```bash
   make-cli login --zone eu1.make.com --api-key "YOUR_NEW_TOKEN"
   ```
5. Revoke old token in Make Cloud once verified.

### 2. Webhook HMAC Signing Secret Rotation
To achieve zero-downtime secret rotation without rejecting in-flight webhooks:
1. Generate new secret: `openssl rand -hex 32`.
2. Configure **Dual-Secret Window** in Scenario 02:
   - Accept either `HMAC(key_v1, payload)` OR `HMAC(key_v2, payload)`.
3. Update the upstream webhook provider (Stripe / Shopify / Webhook Relay).
4. Deprecate and remove `key_v1` after 24 hours.

---

## 4. Disaster Recovery & Failover Plan

### Make.com Platform-Level Outage (EU1 Regional Incident)
If the primary cluster `eu1.make.com` reports degraded performance:
1. **Upstream Ingestion Buffering**:
   - Ingress webhooks from Cloudflare Workers or AWS API Gateway are instructed to route incoming traffic to an Amazon SQS buffer queue (`sqs.eu-west-1.amazonaws.com/make-backup-buffer`).
2. **Local Microservice Fallback**:
   - Backend services utilizing `@makehq/endpoints-sdk` automatically catch timeout errors (`ECONNRESET`, `ETIMEDOUT`) and fall back to local direct database processing via circuit breaker logic.
3. **Recovery Re-synchronization**:
   - Once `eu1.make.com` status returns to operational (monitored via status.make.com), the SQS buffer drains payloads into the Make webhooks at a governed rate of 100 requests/sec.
