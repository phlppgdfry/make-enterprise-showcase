# Webhook Security, Threat Modeling & Zero-Trust Audit

**Evaluation Standard:** OWASP API Security Top 10, SOC2 Type II Trust Principles, GDPR Article 32  
**Target Architecture:** Make.com Gateway (`hook.eu1.make.com`) & GitHub Pages Showcase  
**Date:** October 28, 2026  

---

## 1. Executive Summary & Immediate Safety Remediations
In accordance with Phase 0 and Phase 8 mandates, an adversarial security audit was performed across all public endpoints, client-side JavaScript, GitHub Actions workflows, and repository Git history.

### Immediate Remediations Implemented:
1. **Public Webhook Masking:** Raw Make.com webhook URLs on `docs/index.html` were decommissioned and replaced with masked Zero-Trust gateway placeholders.
2. **Browser Execution Isolation:** Live `fetch()` calls to production webhooks were replaced with a verified **Client-Side Sandbox Simulator**. Anonymous website visitors cannot trigger live Make scenarios or consume cloud operations.
3. **Automated Cron Removal:** The daily scheduled cron job in `.github/workflows/health-check.yml` was removed to prevent recurring automated traffic against cloud webhooks without explicit human supervision.

---

## 2. Threat Model: Make.com Inbound Gateways (STRIDE Analysis)

| Threat Category | Specific Attack Vector | Severity | Implemented Architectural Mitigation |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Forged webhook payload claiming to be Stripe or Shopify | **HIGH** | Constant-time HMAC-SHA256 signature verification (`verify-hmac` custom action). |
| **Tampering** | Man-in-the-middle modification of transaction amount or currency | **HIGH** | Webhook signature covers raw body + timestamp (`t=...`). Any payload tampering invalidates the hash. |
| **Repudiation** | Client disputes authorized action performed by AI Agent | **MEDIUM** | Immutable audit log written to Make Data Store with correlation ID and Slack approval timestamp. |
| **Information Disclosure** | PII or credit card data visible in Make execution history | **HIGH** | GDPR Article 32 compliance: confidential execution flag excludes payload bodies from Make logs. |
| **Denial of Service** | Volumetric webhook flooding to deplete Make operation quotas | **CRITICAL** | Token-bucket rate governor (Scenario 04) + upstream API Gateway WAF rate limiting. |
| **Elevation of Privilege** | Client manipulates `tenantId` in RAG query to access competitor files | **CRITICAL** | Server-side tenant validation: `tenantId` enforced via authenticated JWT/session, not client payload. |

---

## 3. Cryptographic Verification & Timing Attacks

### Naive vs. Constant-Time Comparison
A common vulnerability in webhook signature verification is using standard equality operators (`receivedSignature === computedSignature`). Standard equality terminates on the first mismatched byte, creating a measurable side-channel timing discrepancy that allows attackers to progressively guess signature bytes.

### Implemented Defense:
```javascript
// Constant-time comparison implemented in apps/enterprise-circuit-breaker/functions/computeHmac.js
const crypto = require('crypto');

function safeCompare(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
```
Verified in `scripts/test-runner.js` Suite 4: authentic signatures pass; forged signatures are rejected safely.

---

## 4. Replay Attack Protection & Idempotency

### Attack Scenario
An attacker intercepts a legitimate webhook payload and replays it 10 minutes later to double-credit an account.

### Multi-Layered Mitigation:
1. **Timestamp Window Check:** Signatures must include a timestamp (`t=epoch_seconds`). Payloads with timestamps older than 300 seconds (5 minutes) are immediately rejected with HTTP `401 Unauthorized`.
2. **Deterministic Idempotency Key:** Every mutating webhook must present a unique `Idempotency-Key` or `event.id`. Make Data Store stores the key with a 24-hour TTL. Replays hit the fast-path HTTP `200 Cached ACK`, preventing re-execution of downstream charges.

---

## 5. GDPR Article 32 & Log Privacy Protection

### The Risk of iPaaS Data Exposure
By default, integration platforms log all incoming and outgoing bundle data. If a scenario processes passwords, payment methods, or European personal data (PII), this data is retained in Make execution logs, violating GDPR Article 32 and SOC2 Confidentiality principles.

### Architecture Controls Implemented:
1. **Confidential Execution Flag:** Scenarios processing sensitive data are marked confidential, preventing payload logging in Make Cloud.
2. **Zero Hardcoded Secrets:** Scans across all repository blueprints confirmed 0 hardcoded live API keys or authentication tokens. All credentials reference Make connection pools or environment secrets.

---

## 6. GitHub Actions & CI/CD Security
- **Branch Protection:** Workflows require pull request approval before merging into `main`.
- **Secret Hygiene:** No API keys are checked into repository files or commit history. Local developer secrets are stored in `.env` (gitignored).
- **Scheduled Workflows:** Only manual `workflow_dispatch` is enabled for synthetic testing, preventing uncontrolled cloud requests.
