# CRM/billing integration design

Status: **partial historical template**, not a verified bidirectional reconciliation implementation.

The UI blueprint currently iterates `customers`, invokes HubSpot `createContact`, aggregates results, posts a Slack message and returns a count. A create-contact call is not an upsert; duplicate handling, billing reads, conflict resolution and durable cursors are not implemented in this export. The flat manifest is an earlier design sketch and is not equivalent to the UI blueprint.

Before reuse, resolve credentials and module schemas in Make, replace account-specific channel IDs, validate incoming records and define idempotent CRM behavior. Add integration tests against a sandbox account before activation. Do not infer cost savings or a synchronization SLA from the local arithmetic experiments.

The 2.0 update focuses on support, knowledge and lead workflows. This historical design remains available for further implementation. See [current verification](../../docs/VERIFICATION.md).
