# Enterprise Make.com Engineering Patterns & Architecture Reference

This guide documents senior architectural patterns, resilience techniques, and performance considerations for mission-critical Make.com (Integromat) automation systems.

---

## 1. Error Handling Directives: Beyond Basic Retries

Make provides 5 native error handling directives. Senior architects avoid default silent failures by explicitly mounting error routes:

| Directive | Execution Behavior | When to Use |
| :--- | :--- | :--- |
| **`Resume`** | Provides fallback mock/default data and continues scenario flow. | When non-critical enrichments fail (e.g., GeoIP lookup fails, default to "Unknown"). |
| **`Ignore`** | Drops the error and skips downstream execution for that bundle. | When an item is deliberately skipped or an expected non-fatal condition occurs. |
| **`Break`** | Saves execution to Incomplete Executions queue with exponential backoff retry. | **Transient network failures, 429 Rate Limits, 502/503 Bad Gateways.** |
| **`Rollback`** | Halts scenario immediately and rolls back all transactional modules. | Financial mutations where partial execution corrupts ledger balance. |
| **`Commit`** | Saves current state immediately and halts further processing for that bundle. | Partial batch checkpoints. |

---

## 2. Exactly-Once Semantics & Idempotency Engine

In distributed systems, webhooks will inevitably arrive more than once due to network retransmits or upstream retries.

### Implementation Pattern:
1. Extract `X-Idempotency-Key` or compute `sha256(payload)`.
2. Atomic lookup in Make Data Store:
   - If key exists: Return `200 OK` fast-path cached acknowledgment immediately (0 billable downstream operations).
   - If key does not exist: Write record with state `PROCESSING` + timestamp.
3. Process downstream core mutation.
4. On success: Update record state to `COMPLETED`.
5. On unrecoverable error: Route to **Dead Letter Queue (DLQ)** Data Store and trigger P1 incident alerts.

---

## 3. High-Throughput Batching: Iterator & Aggregator Architecture

When processing thousands of records:
- **Never** chain HTTP write modules directly inside loops without aggregation or throttling.
- **Always** pair an `Iterator` with an `Array Aggregator` or `Numeric Aggregator`:
  ```
  [Fetch Batch (100)] -> [Iterator] -> [Transform / Upsert] -> [Array Aggregator] -> [Commit Cursor / Slack Digest]
  ```
- This confines bundle-level exceptions to individual records rather than aborting the entire batch.

---

## 4. Rate-Limit Governance (Token Bucket)

To prevent third-party API suspensions (`429 Too Many Requests`):
1. Store a rolling key in Data Store: `rate_window_{{formatDate(now; "YYYYMMDDHHmm")}}`.
2. Router branch evaluates if `requestCount > threshold`.
3. If exceeded, trigger `util:ActionSleep` with dynamic backpressure (5-10s) before executing requests.

---

## 5. Agentic AI & Human-in-the-Loop (HITL)

When delegating operations to LLMs:
- **Constrain output** using strict JSON schema system prompts.
- **Gate execution** with a confidence score router (`confidenceScore >= 85`).
- **Escalate destructive actions** (e.g., refunds, cancellations, plan changes) to Slack/Teams with interactive deep-links for human operator sign-off before applying mutations.
