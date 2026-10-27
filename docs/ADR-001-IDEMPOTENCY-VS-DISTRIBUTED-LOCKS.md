# Architecture Decision Record (ADR) 001: Webhook Idempotency Engine

## Status
Accepted / In Production

## Context
High-volume payment and order webhooks (e.g. from Stripe, Shopify, ERPs) can arrive repeatedly due to network timeouts, upstream exponential retries, and distributed network partitions. Without an idempotency mechanism, downstream systems suffer duplicate charges, duplicated shipments, and inventory corruption.

## Decision
We implemented a two-phase atomic idempotency gate using Make's native Data Stores:
1. Extract `X-Idempotency-Key` or compute `HMAC-SHA256(payload)`.
2. Inspect local Data Store in phase 1 (`PROCESSING` lock).
3. If duplicate key exists: Return HTTP 200 Cached ACK immediately (0 downstream API mutations).
4. On success: Transition state to `COMPLETED`.
5. On failure: Divert to Dead Letter Queue (DLQ).

## Alternatives Considered
- **External Redis / KeyDB Cluster**: Required additional cloud infrastructure, VPC peering, and secret management outside of Make.
- **Database Unique Constraint Rollbacks**: Expensive database connection overhead and high latency under 500+ req/sec bursts.

## Consequences
- **Positive**: Sub-millisecond deduplication, zero third-party infrastructure cost, guaranteed exactly-once processing semantics.
- **Negative**: Data Store capacity must be sized according to event retention windows (e.g., 7 days TTL).
