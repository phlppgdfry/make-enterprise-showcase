# Security, Governance & Compliance in Make.com

## 1. Secrets Management
- **Never hardcode secrets** in scenario mapper fields.
- Use Make environment variables or Connection Credentials.
- Rotate API tokens bi-annually or via automated CI pipelines.

## 2. Webhook Signature Verification (HMAC-SHA256)
All public webhooks exposed to third parties (Stripe, GitHub, Shopify) must verify incoming digital signatures before parsing payloads:
- Compute `sha256_hmac(body, secret)`
- Reject requests where signature does not match with HTTP `401 Unauthorized` before invoking any billable modules.

## 3. Data Privacy & GDPR Compliance
- Enable `Data is confidential` toggle in Scenario Settings for PII pipelines so execution logs do not retain raw customer payloads in plain text.
- Implement automated Data Store record deletion with TTL (Time To Live).

## 4. Multi-Tenant Isolation
- In RAG and knowledge retrieval scenarios, always append `tenant_id` filters to vector database queries and SQL/NoSQL queries.
- Prevent Cross-Tenant data bleed through strict schema validation at the gateway level.
