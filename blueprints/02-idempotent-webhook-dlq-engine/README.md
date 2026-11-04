# Webhook ingestion reference

Status: **historical cloud reference**, active state observed read-only on 2026-11-04. No new end-to-end run was performed during the 2.0 update.

The UI blueprint contains three modules: incoming webhook → Data Store AddRecord → webhook response. It demonstrates a small persistence boundary. The checked-in hook and Data Store IDs belong to the original account and must be replaced for a different account.

The broader `scenario-create.json` is an older design sketch and does not match the three-module cloud export. It is not an equivalent deployment artifact. Do not use its existence as proof that HMAC verification, a downstream mutation, a DLQ or two-phase state transitions are deployed.

## Known limitations

- The blueprint does not implement HMAC verification or a DLQ, despite its historical name.
- It uses a fallback order key when `order_id` is absent; unrelated malformed events can therefore collide. Require a validated unique event ID before production use.
- A unique-key rejection is not a successful cached replay response. Exactly-once downstream effects are not established by this template.
- Existing October execution IDs are recorded in the [historical evidence report](../../docs/audits/LIVE_MAKE_CLOUD_VERIFICATION.md); those reports must be read with their supersession notice.

This cloud scenario was not modified by the agent-workbench update. See [current verification](../../docs/VERIFICATION.md).
