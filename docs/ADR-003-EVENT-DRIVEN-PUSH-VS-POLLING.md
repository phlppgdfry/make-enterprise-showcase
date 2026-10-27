# ADR-003: Event-Driven Webhook Push vs. Polling Interval Architecture

## Status
**Accepted** — Standardized across all Enterprise Make.com Scenarios.

## Context
When integrating third-party SaaS systems (Stripe, HubSpot, Zendesk, Salesforce) with internal data warehouses (ClickHouse, Snowflake) and databases via Make.com, architects traditionally choose between two ingestion paradigms:

1. **Scheduled Polling (Interval Fetching)**:
   - Scenarios execute every $N$ minutes (e.g., every 5, 15, or 60 minutes) to query endpoints for updated records (`updated_at > last_sync_timestamp`).
2. **Event-Driven Push (Real-Time Webhooks)**:
   - Source systems push HTTP POST payloads to Make Custom Webhook gateways immediately upon event generation (`charge.succeeded`, `contact.updated`, `ticket.escalated`).

### Challenges with Polling in High-Scale Enterprise Environments:
- **Operation Waste & Cost Inefficiency**: A scenario polling every 5 minutes executes 8,640 times per month per scenario. If 90% of polling runs yield 0 new records, ~7,700 Make operations are consumed on empty runs, driving up TCO.
- **Data Latency (Sync Lag)**: Events wait up to $N$ minutes before processing, violating real-time SLA requirements for fraud detection, payment fulfillment, and VIP customer service routing.
- **Throttling & API Rate-Limit Exhaustion**: Simultaneous polling bursts across multiple systems can trigger downstream HTTP `429 Too Many Requests` status codes.
- **Missed Records & Clock Skew**: Polling based on timestamps can miss records during database transaction commit latency or clock synchronization discrepancies.

---

## Decision
We mandate an **Event-Driven Push Architecture** utilizing Make.com **Custom Webhook Gateways (`gateway:CustomWebHook`)** as the primary ingestion mechanism for all high-throughput mutating flows.

For legacy systems that lack native webhook support or for reconciliation auditing, we employ a **Hybrid High-Watermark Delta Sync** (Scenario 03) that executes during off-peak windows with persistent cursor tracking in Make Data Store.

---

## Architectural Comparison Matrix

| Architectural Dimension | Scheduled Polling (Legacy) | Event-Driven Push (Adopted Standard) | Hybrid High-Watermark (Reconciliation) |
| :--- | :--- | :--- | :--- |
| **Ingestion Latency** | 5 – 60 minutes | **< 350 ms (Sub-second)** | Daily / Batch Window |
| **Make Operation Overhead** | High (constant 24/7 burn) | **Near-Zero Waste** (Only runs on actual events) | Minimized (Single cursor fetch) |
| **Payload Authentication** | API Token / Basic Auth | **HMAC-SHA256 Constant-Time Signatures** | Mutual TLS / OAuth 2.0 Client Credentials |
| **Backpressure Control** | Pull-based paging | **Token-Bucket Governor & Buffer** | Batch chunk iterators |
| **Data Integrity** | Vulnerable to clock skew | **Strict Event Sequencing & Idempotency Key** | Checksum differential diffing |
| **Scalability** | Linear cost growth with frequency | **Elastic autoscaling per webhook volume** | Predictable scheduled resource footprint |

---

## Technical Implementation Details

### 1. Webhook Signature Validation (Zero-Trust Security)
Every incoming webhook must validate the source signature (e.g., `Stripe-Signature`, `X-HubSpot-Signature-v3`) before allocating memory or downstream resources:
```javascript
// Verification implemented via Make Custom App or IML Function
const computedHash = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(`${timestamp}.${rawBody}`)
  .digest('hex');

if (!crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(receivedHash))) {
  throw new Error("HTTP 401 Unauthorized: Invalid HMAC Signature");
}
```

### 2. Immediate 200 OK Acknowledgment with Decoupled Processing
To satisfy third-party webhook timeout contracts (< 5 seconds for Stripe/Shopify):
- Webhook ingress validates signature and acquires an atomic idempotency lock in Make Data Store.
- The webhook returns HTTP `200 Accepted` immediately to release the upstream connection.
- Long-running data enrichment, LLM reasoning, or multi-step database writes proceed downstream without risking webhook timeout retries.

### 3. Failover & Replayability via Dead Letter Queue (DLQ)
In an event-driven architecture, if downstream services experience an outage, unhandled webhook payloads risk permanent loss:
- We introduce explicit error directives (`Break`) with exponential retry intervals (1, 5, 15 minutes).
- Poison pills and permanently failing payloads are routed to the **Make Data Store DLQ** with automated alerts dispatched to `#ops-incident-p1`.
- A dedicated replay CLI tool (`npm run replay`) enables point-in-time reprocessing once downstream systems recover.

---

## Consequences & Trade-Offs

### Positive:
- **Instantaneous User Experience**: End-to-end customer workflows (e.g., ticket triage, payment reconciliation) trigger within milliseconds.
- **Cost Reduction**: Eliminates over 85% of redundant scenario runs, keeping Make operation consumption directly proportional to business volume.
- **Auditability**: Every webhook payload receives an immutable correlation ID (`x-correlation-id`) logged through the execution lifecycle.

### Negative / Mitigation:
- **Bursty Traffic**: Flash sales or marketing campaigns can cause sudden webhook spikes.
  *Mitigation*: Implement Scenario 04's **Token-Bucket Rate Governor** to queue and throttle spikes before downstream microservices are impacted.
- **Duplicate Deliveries**: Webhook providers guarantee *at-least-once* delivery, leading to duplicate POST requests.
  *Mitigation*: Enforce deterministic idempotency locks using Make Data Store (ADR-001).
