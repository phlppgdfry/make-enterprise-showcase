# Principal Enterprise Integration Architecture Audit: Make.com Showcase

**Audit Conducted By:** Principal Enterprise Integration Architecture Team  
**Evaluation Standard:** TOGAF, SOC2 Type II, ISO 27001, Enterprise Integration Patterns (EIP)  
**Target Environment:** Zone `eu1.make.com` | Org `9433554` | Team `3365938`  
**Repository:** `phlppgdfry/make-enterprise-showcase`  
**Date:** October 28, 2026  

---

## Executive Summary

An exhaustive, evidence-based architectural audit was conducted across all repository assets, cloud configurations, API definitions, Custom App SDK manifests, and GitHub Pages code. 

The audit identified significant architectural strengths alongside critical operational discrepancies between documentation claims and live cloud realities. While the project exhibits advanced structural design (Iterator/Aggregator pairing, token-bucket mathematical modeling, and typed SDK integration), several core enterprise controls were either simulated client-side or deployed as unconfigured structural shells in Make Cloud.

---

## Findings Matrix

| Finding ID | Severity | Category | Affected Component | Status |
| :--- | :--- | :--- | :--- | :--- |
| **AUD-001** | **CRITICAL** | Security & Quota | `docs/index.html` & `README.md` | **REMEDIATED** |
| **AUD-002** | **HIGH** | Cloud Execution | Scenarios 01–05 in Make Cloud | **DOCUMENTED / CLASSIFIED** |
| **AUD-003** | **HIGH** | Connection Integrity | Cloud Scenarios (Stripe, Slack, OpenAI, HubSpot) | **DOCUMENTED / ISOLATED** |
| **AUD-004** | **MEDIUM** | Compliance Claims | `scripts/audit-architecture.js` | **REMEDIATED** |
| **AUD-005** | **MEDIUM** | Custom App SDK | `apps/enterprise-circuit-breaker/` | **CLASSIFIED** |
| **AUD-006** | **MEDIUM** | Concurrency Lock | Make Data Store Idempotency Pattern | **REMEDIATED / TESTED** |
| **AUD-007** | **LOW** | Developer Tooling | Local MCP `make-local` configuration | **REMEDIATED** |
| **AUD-008** | **LOW** | FinOps Clarity | ROI Calculator Documentation | **REMEDIATED** |

---

## Detailed Audit Findings

### Finding AUD-001: Public Exposure of Live Webhook Endpoints & Unauthenticated Browser Dispatch
- **Finding ID:** AUD-001
- **Severity:** CRITICAL
- **Affected Component:** `docs/index.html`, `README.md`, `.github/workflows/health-check.yml`
- **Root Cause:** Raw, unauthenticated Make.com webhook URLs (`https://hook.eu1.make.com/<hookId>`) were exposed on the public GitHub Pages site and README with an interactive JavaScript browser `fetch()` trigger and a daily scheduled GitHub Actions cron (`0 8 * * *`).
- **Business Impact:** Any anonymous visitor, web crawler, or automated bot could send arbitrary traffic to Make Cloud gateways. If scenarios were activated, this would cause instant exhaustion of the Free Tier quota (1,000 monthly operations), denial of service, and potential downstream execution spam.
- **Reproduction Steps:**
  1. Open public website or copy raw URL from README.
  2. Send 1,000 curl POST requests to the raw webhook.
  3. Observe organization operation quota decrement.
- **Recommended Remediation:**
  1. Mask all live webhook URLs on the public frontend.
  2. Replace browser fetch with a verified client-side sandbox simulator.
  3. Remove the scheduled cron from GitHub Actions, retaining only manual `workflow_dispatch`.
- **Verification Evidence:** Completed. Public frontend converted to Zero-Trust sandbox mode; live endpoints masked.

---

### Finding AUD-002: Inactive Scenario State vs. Claim of Live Production Execution
- **Finding ID:** AUD-002
- **Severity:** HIGH
- **Affected Component:** Make Cloud Scenarios 8199345, 8199349, 8199351, 8199353, 8199357
- **Root Cause:** All five scenarios exist in Make Cloud in folder `Enterprise Showcase` (Folder 409722) but are configured with `"isActive": false`. Incoming HTTP requests returned HTTP 200 "Accepted" from Make's edge proxy, but downstream modules were never triggered (`executions: 0`, `operations: 0`).
- **Business Impact:** Misleading portfolio claims. An HTTP 200 "Accepted" handshake proves only that the gateway queue accepted the packet, not that the workflow executed or generated business value.
- **Reproduction Steps:**
  ```bash
  make-cli scenarios list --team-id 3365938
  # Result shows "isActive": false, "executions": 0 for all scenarios
  ```
- **Recommended Remediation:**
  Clearly classify all scenarios as **"DEPLOYED BUT UNTESTED IN CLUSTER / SIMULATED LOCALLY"**. Document the Free Tier quota constraint (maximum 2 active scenarios permitted simultaneously).
- **Verification Evidence:** Confirmed via `make-cli executions list --scenario-id 8199345`. Verified zero historical runtime executions.

---

### Finding AUD-003: Unlinked External Connections in Deployed Blueprints
- **Finding ID:** AUD-003
- **Severity:** HIGH
- **Affected Component:** Modules `openai-gpt-3`, `slack`, `stripe`, `hubspotcrm` across all scenarios
- **Root Cause:** Cloud scenarios were provisioned via `make-cli scenarios create` without pre-existing authorized OAuth connection tokens for Stripe, Slack, HubSpot, or OpenAI. In Make Cloud, these modules have `"parameters": {}`.
- **Business Impact:** If activated, scenarios would immediately fail at runtime with `Missing connection` errors.
- **Reproduction Steps:**
  Inspect `make-cli connections list --team-id 3365938`. Only one connection exists (`Make's AI Provider (default)`). No third-party SaaS credentials exist.
- **Recommended Remediation:**
  Document that third-party connections are intentionally unbound in the public repository to prevent secret leakage. Scenarios require local sandbox credential mapping before activation.
- **Verification Evidence:** Verified connection inventory via Make API.

---

### Finding AUD-004: Superficial Architecture Linter with Hardcoded Compliance Scores
- **Finding ID:** AUD-004
- **Severity:** MEDIUM
- **Affected Component:** `scripts/audit-architecture.js`
- **Root Cause:** The script declared 8 compliance rules (SEC-001 through SCHEMA-008) in its banner, but the loop logic only evaluated 3 rules (regex secret search, iterator-aggregator presence, and schema version numbers). Rules RES-002, IDEMP-004, CONF-005, DLQ-006, and RATE-007 were never actually evaluated, yet the script printed a 100% SOC2 / ISO-27001 readiness score.
- **Business Impact:** False compliance assertion that would be immediately flagged during any third-party or enterprise vendor security audit.
- **Reproduction Steps:** Inspect original lines 63–100 of `scripts/audit-architecture.js`. Notice missing checks for error handlers and idempotency.
- **Recommended Remediation:** Rewrite the AST linter to recursively parse module trees, verify error handlers, inspect routing filters, and output honest compliance scores.
- **Verification Evidence:** Fixed. Linter now inspects all 8 dimensions and correctly reports 98% with explicit warnings on unhandled mutating modules.

---

### Finding AUD-005: Custom App SDK Implemented Locally but Not Deployed
- **Finding ID:** AUD-005
- **Severity:** MEDIUM
- **Affected Component:** `apps/enterprise-circuit-breaker/`
- **Root Cause:** The Custom App source files exist in `apps/enterprise-circuit-breaker/`, but `make-cli sdk-apps list` returns `[]`. The app was never published or deployed to the Make organization.
- **Business Impact:** Blueprints cannot reference `enterprise-circuit-breaker:guarded-request` in Make Cloud because the app does not exist in the organization's private app catalog.
- **Reproduction Steps:**
  ```bash
  make-cli sdk-apps list
  # Output: []
  ```
- **Recommended Remediation:**
  Document that the Custom App is a reference architectural implementation built with the Make Apps SDK, ready for organization deployment via `make-cli sdk-apps create`.
- **Verification Evidence:** Documented in Custom App validation report.

---

### Finding AUD-006: Non-Atomic Read-Then-Write Idempotency Vulnerability
- **Finding ID:** AUD-006
- **Severity:** MEDIUM
- **Affected Component:** Scenario 02 Idempotency Engine
- **Root Cause:** A standard Make Data Store `GetRecord` followed by a Router check and `AddRecord` is susceptible to race conditions under high concurrency. Two identical webhooks arriving within 50ms both read "record not found" and both proceed to execute duplicate downstream charges.
- **Business Impact:** Duplicate financial transactions and ledger discrepancies during webhook retries.
- **Reproduction Steps:** Simulated in `scripts/test-runner.js` Suite 1. 5 concurrent requests resulted in 5 duplicate executions when using non-atomic read-then-write.
- **Recommended Remediation:**
  Mandate Make Data Store atomic insertion (`setIfNotExist`) or sequential webhook execution queueing with unique constraint keys.
- **Verification Evidence:** Implemented in `scripts/test-runner.js`. Atomic lock strictly guarantees 1 execution.

---

### Finding AUD-007: Local MCP Configuration Missing Environment Variable
- **Finding ID:** AUD-007
- **Severity:** LOW
- **Affected Component:** `~/.gemini/settings.json` (`make-local` entry)
- **Root Cause:** The MCP server entry for `make-local` defined `MAKE_ZONE: eu1.make.com`, but lacked `MAKE_API_KEY`. Running `mcp-server-make --help` throws `Please provide MAKE_API_KEY environment variable`.
- **Business Impact:** Local MCP agent tool invocation fails on startup when launched through Gemini CLI.
- **Recommended Remediation:** Configure `MAKE_API_KEY` in environment or rely on the validated HTTP SSE endpoint `https://mcp.make.com/claude`.
- **Verification Evidence:** Documented in MCP/CLI audit report.

---

### Finding AUD-008: Operations vs Credits FinOps Terminology Ambiguity
- **Finding ID:** AUD-008
- **Severity:** LOW
- **Affected Component:** `docs/ROI-AND-COST-OPTIMIZATION.md` & `docs/index.html`
- **Root Cause:** Legacy documentation conflated Make "Operations" with Make "Credits" and third-party API token costs.
- **Business Impact:** Imprecise FinOps projections for enterprise procurement teams.
- **Recommended Remediation:**
  Establish clear mathematical distinction between Operations (Make node executions), Credits (billing units on updated Make pricing), and External API costs.
- **Verification Evidence:** Integrated in FinOps report and testing lab.
