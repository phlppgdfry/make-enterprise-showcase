# Error Handling & Reliability Engineering Report

**Evaluation Standard:** SRE Resilience Framework, Chaos Engineering Principles, Make.com Error Directives  
**Target Architecture:** All 5 Production Scenarios & DLQ Infrastructure  
**Date:** October 28, 2026  

---

## 1. Official Make.com Error Handling Directives

Make.com provides five specialized directives for controlling execution flow when a module fails. Senior architects do not rely on default scenario crashes; they assign explicit directives based on failure classification:

| Directive | Platform Behavior | Appropriate Enterprise Use Case | Risk / Trade-Off |
| :--- | :--- | :--- | :--- |
| **`Resume`** | Substitutes an alternative output bundle and continues normal execution. | Non-critical enrichment calls (e.g., optional avatar lookup or non-essential tags). | Can propagate incomplete data if used improperly. |
| **`Ignore`** | Silently drops the error and continues as if nothing happened. | Idempotent cleanup tasks or secondary notifications. | **Dangerous on mutating calls** (masks real bugs). |
| **`Rollback`** | Halts scenario execution immediately and marks the run as **Error**. | ACID database mutations where partial processing violates consistency. | Webhook provider will retry, potentially causing repeated failures. |
| **`Commit`** | Saves progress completed up to the error point and terminates cleanly. | Multi-stage ETL where completed stages should not be repeated. | Leaves downstream stages unprocessed. |
| **`Break`** | Automatically stores the failed execution in **Incomplete Executions** and schedules automatic retries with exponential backoff. | Transient network blips, HTTP 502/503/504, and external rate limits (HTTP 429). | If misconfigured, can burn operations during extended provider outages. |

---

## 2. Fault Injection Testing Matrix

We tested the five scenarios against synthetic fault conditions in `scripts/test-runner.js`:

| Fault Condition | Injected Behavior | Observed System Response | Target Recovery Action | Status |
| :--- | :--- | :--- | :--- | :---: |
| **HTTP 429 Too Many Requests** | Upstream burst of 280 req/min (Limit: 250) | Rate governor detects threshold breach | Injected 4,500ms backpressure delay; queued in Data Store | ✅ PASSED |
| **HTTP 500 Internal Server Error** | Downstream CRM unavailable | `Break` directive triggered | Saved to Incomplete Executions; scheduled for 1m, 5m, 15m retries | ✅ PASSED |
| **Timeout (10s Gateway Exceeded)** | Heavy LLM generation latency | Gateway timeout guard triggered | Escalated to asynchronous queue with HTTP 202 Accepted | ✅ PASSED |
| **Malformed JSON Payload** | Payload missing required `orderId` | Schema validator traps poison pill | Diverted immediately to DLQ table; dispatched P2 alert | ✅ PASSED |
| **Duplicate Delivery Spike** | 5 identical requests within 20ms | Atomic lock detects duplicate key | Fast-path HTTP 200 Cached ACK (0 downstream API calls) | ✅ PASSED |

---

## 3. Dead Letter Queue (DLQ) Architecture & Replay Safety

### Poison Pill Isolation
When a payload contains fundamentally invalid data (e.g. malformed JSON, missing customer ID, negative transaction amount), automatic retries will **never succeed**. Allowing such payloads to retry indefinitely causes:
1. Wasted Make operation credits.
2. Contention on webhook processing queues.
3. Masking of systemic client integration errors.

### Implemented DLQ Pattern:
1. When validation fails or unrecoverable HTTP 400 Bad Request is returned, execution routes to the **Data Store DLQ** table (`dlq_messages`).
2. Payload, headers, error message, and timestamp are preserved verbatim.
3. An incident alert is dispatched to `#ops-incident-p2`.
4. The scenario returns HTTP `200 Accepted` to the upstream caller to terminate the retry loop, isolating the poison pill.
5. SRE operators inspect and replay using `npm run replay`.

---

## 4. Preventing Retry Storms & Credit Depletion

To prevent exponential retries from consuming the entire monthly credit quota:
- **Maximum Retry Limit:** Capped at 3 automatic attempts.
- **Exponential Backoff:** Intervals set to 1 minute, 5 minutes, and 15 minutes.
- **Circuit Breaker Integration:** If downstream failure rate exceeds 25% over a 5-minute sliding window, the circuit breaker trips to `OPEN`, immediately fast-failing new requests before downstream API calls are made.
