# Concurrency Engineering & Idempotency Audit

**Evaluation Standard:** Distributed Systems Consistency, ACID Semantics, Enterprise Idempotency  
**Target Component:** Scenario 02 (`02-idempotent-webhook-dlq-engine`) & Make Data Store  
**Date:** October 28, 2026  

---

## 1. The Distributed Webhook Problem

Webhook providers (such as Stripe, Shopify, GitHub, and Adyen) guarantee **at-least-once delivery**. In real-world enterprise operations, network hiccups, connection resets, or delayed HTTP acknowledgments frequently cause upstream services to resend identical webhook events.

If the downstream integration engine is not strictly idempotent, multiple charges, duplicate tickets, or redundant ERP records are generated.

---

## 2. Analysis of the Naive Read-Then-Write Anti-Pattern

Many junior integration architectures attempt to achieve deduplication using a naive two-step flow:
1. Module 1: `datastore:GetRecord` (check if key exists)
2. Module 2: `builtin:Router` (if exists -> stop, else -> continue)
3. Module 3: External API mutation (e.g. `stripe:CreateCharge`)
4. Module 4: `datastore:AddRecord` (save key as processed)

### The Race Condition Flaw
Under concurrent burst traffic (e.g., Stripe retrying a webhook across two parallel gateway connections within 15 milliseconds):
- Request A executes `GetRecord` -> returns **Not Found**.
- Request B executes `GetRecord` -> returns **Not Found**.
- Request A executes `CreateCharge` -> **Charge #1 Created**.
- Request B executes `CreateCharge` -> **Charge #2 Created (DUPLICATE!)**.
- Request A writes to Data Store.
- Request B writes to Data Store.

Both requests evaluated the state before either could commit the write.

---

## 3. Empirical Test Lab Simulation & Proof

We created a deterministic concurrency test suite in `scripts/test-runner.js` (Suite 1) to simulate concurrent webhook arrivals under identical network jitter (20ms).

### Test Results:

```text
================================================================
CONCURRENCY BENCHMARK: 5 Concurrent Webhook Requests (Same Key)
================================================================
Model 1: Naive Read-Then-Write
  - Concurrent Invocations: 5
  - Downstream Mutations Executed: 5 (FAIL - 4 DUPLICATE CHARGES)
  - Consistency Guarantee: NONE (Subject to Race Conditions)

Model 2: Atomic Lock Pattern
  - Concurrent Invocations: 5
  - Downstream Mutations Executed: 1 (PASS - EXACTLY 1 MUTATION)
  - Fast-Path Cached ACKs: 4 (0 downstream operations burned)
  - Consistency Guarantee: DETERMINISTIC DEDUPLICATION
================================================================
```

---

## 4. Architectural Solutions Evaluated

| Pattern | Mechanism | Pros | Cons | Decision |
| :--- | :--- | :--- | :--- | :--- |
| **Option A: Naive Read-Then-Write** | Data Store Get then Add | Easy to model in Make UI | Vulnerable to race conditions | **REJECTED** |
| **Option B: External Redis Lock** | Redlock / Distributed Redis cluster | Microsecond latency, distributed | Adds external infrastructure dependency and cost | **REJECTED (Unnecessary Complexity)** |
| **Option C: Sequential Execution** | Webhook queue serialized to 1 thread | Eliminates concurrency | Severely degrades throughput during bursts | **REJECTED** |
| **Option D: Atomic Data Store 2-Phase Lock** | Unique key reservation with auto-expiring TTL | Native to Make, 0 extra infrastructure, race-condition safe | Requires explicit lock release on partial fails | **ADOPTED STANDARD** |

---

## 5. Adopted Standard: 2-Phase Atomic Lock Pattern

1. **Phase 1 (Lock Acquisition):**  
   Immediately upon receipt, the webhook attempts an atomic insertion into the Make Data Store with key `lock:<event_id>` and a state of `IN_PROGRESS` (TTL: 86,400s).  
   If the record already exists, Make Data Store raises a duplicate key exception, routing execution immediately to the **Cached ACK Fast-Path (HTTP 200)**.
2. **Phase 2 (Mutation & State Commit):**  
   The scenario executes the financial mutation. Upon successful completion, the Data Store record state transitions to `COMMITTED` with the downstream transaction reference (`chargeId: ch_...`).
3. **Rollback / Poison Pill Guard:**  
   If the mutation fails, the error handler removes the lock or marks it `FAILED` so that subsequent legitimate retries are not permanently locked out.

---

## 6. Honest Delivery Semantics Declaration
- **Network Level:** At-least-once delivery.
- **Application Level:** **Effectively-Once** execution via atomic deduplication.
- Enterprise integration architects should avoid claiming pure "exactly-once" delivery across distributed networks without qualifying that it is achieved via deterministic idempotent deduplication.
