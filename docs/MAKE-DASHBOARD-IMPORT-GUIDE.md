# How to Import & View Scenarios in your Make.com Dashboard

This guide walks you through viewing and deploying the 5 showcase scenarios into your live Make.com dashboard:
👉 **Target Organization:** [https://eu1.make.com/organization/9433554/dashboard](https://eu1.make.com/organization/9433554/dashboard)

---

## Method 1: Instant UI Blueprint Import (No API Token Needed — Recommended)

You can import any scenario into your Make canvas in under 30 seconds:

1. **Log in to Make**: Open [https://eu1.make.com](https://eu1.make.com) in your browser.
2. **Navigate to Scenarios**: Click on **Scenarios** in the left sidebar.
3. **Create New Scenario**: Click the purple **+ Create a new scenario** button in the top right.
4. **Open the Blueprint Importer**:
   - In the canvas, look at the bottom toolbar or click the three dots (`...` / More options) in the bottom-center controls.
   - Click **Import Blueprint**.
5. **Select the Blueprint File**:
   - Navigate to `make-enterprise-showcase/blueprints/` on your computer.
   - Select the `blueprint.json` from any scenario:
     - `01-ai-agent-autonomous-triage/blueprint.json`
     - `02-idempotent-webhook-dlq-engine/blueprint.json`
     - `03-bidirectional-crm-billing-reconciliation/blueprint.json`
     - `04-self-healing-etl-rate-limit-governor/blueprint.json`
     - `05-rag-vector-knowledge-dispatcher/blueprint.json`
6. **Save**: Click the **Save** floppy icon at the bottom of the canvas.
   - The scenario is now fully rendered in your Make organization, with all modules, routers, filters, and error handlers visually laid out!

---

## Method 2: Automated Deployment via Make CLI

If you prefer deploying via terminal or CI/CD:

### Step 1: Create an API Token in Make
1. Click your profile avatar (bottom-left) -> **Profile**.
2. Select the **API** tab.
3. Click **+ Add token**.
4. Set permissions:
   - `scenarios:read`, `scenarios:write`, `scenarios:run`
   - `datastores:read`, `datastores:write`
   - `connections:read`
5. Copy the generated token.

### Step 2: Log in via CLI
In your terminal, run:
```bash
make-cli login
# Select zone: eu1.make.com
# Paste your API token
```

### Step 3: Run the Deploy Script
```bash
npm run deploy
```

---

## Method 3: Pre-provisioning Data Stores

Before running live production scenarios, provision the 5 required data stores:
```bash
npm run setup-datastores
```
This prepares:
- `conversation_memory_store`
- `idempotency_cache_store`
- `dead_letter_queue_store`
- `sync_cursor_store`
- `rate_limiter_store`
