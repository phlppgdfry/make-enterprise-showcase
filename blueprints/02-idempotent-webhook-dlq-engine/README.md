# Scenario 02: High-Throughput Idempotent Webhook Engine & Dead Letter Queue (DLQ)

## Architecture Overview
An enterprise webhook processing engine engineered to guarantee exactly-once execution semantics, eliminate duplicate charges or records, and isolate poisonous payloads into a dedicated Dead Letter Queue (DLQ) without crashing the pipeline.

```mermaid
flowchart TD
    WH["1. Signed Inbound Webhook"] --> PARSE["2. Extract Idempotency Key & Sig"]
    PARSE --> CHECK_CACHE["3. Query Idempotency Store"]
    CHECK_CACHE --> ROUTER{"4. Idempotency Router"}
    ROUTER -->|"Duplicate Key Found"| FAST_ACK["5. Fast-Path 200 Cached ACK"]
    ROUTER -->|"New Unique Key"| LOCK["6. Acquire Processing Lock"]
    LOCK --> DISPATCH["7. Downstream ERP Dispatch"]
    DISPATCH -->|"Success"| COMMIT["10. Update Lock: COMPLETED"]
    COMMIT --> RESP_201["11. 201 Created Response"]
    DISPATCH -.->|"Failure (Error Route)"| DLQ_STORE["8. Write to DLQ Data Store"]
    DLQ_STORE --> P1_ALERT["9. Dispatch PagerDuty / Slack P1 Alert"]
```

## Senior Architectural Patterns Implemented
1. **Idempotency Guard**: Eliminates race conditions and duplicate operations using unique event keys (`X-Idempotency-Key` or payload hash) checked atomically against a Make Data Store.
2. **Two-Phase Lock Lifecycle**: State transitions from `PROCESSING` -> `COMPLETED`, preventing duplicate downstream calls if upstream retries occur while processing.
3. **Dead Letter Queue (DLQ)**: Failed payloads are intercepted by an error handler, recorded with the full stack trace in a DLQ Data Store, and flagged for manual or automated replay.
4. **Zero-Loss Guarantee**: The scenario never drops an event, satisfying SOC2 / ISO27001 data integrity standards.

## Files
- `blueprint.json`: Native Make.com UI importable blueprint.
- `scenario-create.json`: API & MCP scenario manifest.
