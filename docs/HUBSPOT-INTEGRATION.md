# HubSpot contact integration

## Live acceptance — 24 November 2026

The public website created contact **936971617524**, returned the same record on a duplicate-email request, separately updated its last name to **TEST Verified update 20261124**, and read that value back from HubSpot. The logged-in HubSpot interface independently showed the same updated name and exactly one search match. [Actual API/browser receipts](evidence/hubspot-live-acceptance.json) and [deployment/CI evidence](evidence/release-2.4.0.json) preserve execution IDs and provenance. No provider mocks were used in this live journey.

HubSpot displayed an association to the `example.com` company. The application made no companies API call and does not claim whether that company pre-existed or was associated automatically. Account-level HubSpot automation can cause such associations; existing linked records were preserved. No messaging API was called. This proves the controlled test-contact flow, not unrestricted customer operations or the inactive legacy Make CRM/Slack scenario.

Version 2.4 uses the owner's existing EU1 HubSpot account, portal `149828901`, selected through the kippieg Google identity. The owner approved creating **Make Enterprise Showcase CRM** with only `crm.objects.contacts.read` and `crm.objects.contacts.write`, and encrypted storage in the existing Sites backend. No subscription or marketing/email scopes are involved.

## Security boundary

`HUBSPOT_ACCESS_TOKEN`, `HUBSPOT_PORTAL_ID` and `CRM_MODE=test-only` are runtime secrets. The token is excluded from frontend assets, Git, URLs and logs. HubSpot scopes cover contacts in the account; the application's narrower policy does not make the token intrinsically record-scoped.

Writes accept only `make-showcase-test-…@example.com` addresses, `confirmed: true`, plain-text names and a last name beginning `TEST `. Company is fixed to `Make Enterprise Showcase - TEST`. These are unmistakable synthetic verification records, not discovered people or production leads. No messages, enrollments, deletions or marketing-contact operations are exposed. The Make knowledge agent remains read-only.

## API

All routes require operator authentication. Writes also require an idempotency key and same-origin browser requests.

| Route | Behavior |
| --- | --- |
| `POST /api/crm/verify` with `{}` | Reserved test-address lookup verifies contact-read access; does not prove writes |
| `POST /api/crm/contacts` | `{email,firstname,lastname,confirmed:true}`; find exact email, create only if absent, then read back |
| `GET /api/crm/contacts/:id` | Retrieve only marked contacts with an unexpired application receipt |
| `POST /api/crm/contacts/:id/update` | Require confirmed input, matching ownership and an unexpired successful receipt; update names only and read back |

The adapter uses the documented CRM v3 contacts API at fixed `api.hubapi.com`, manual redirects, 20-second timeouts and a 256 KB streaming limit. Destination fields are checked after writes. Duplicate email returns the existing record without overwriting it. A provider 409 race is resolved by reading, never by repeating the POST. Unowned/customer IDs and expired receipts are rejected.

Existing D1 executions/audit tables persist receipts without a migration. HTTP 201 means a receipt was created; execution status determines success. Ambiguous writes/readback mismatches remain `uncertain`, including any known upstream ID. Inspect HubSpot before intentionally retrying under another key. No automatic write retry occurs.

Seven-day local receipt visibility does **not** remove external contacts. Test records remain in HubSpot until the owner removes them. Automatic cleanup remains off.

## Verification and rotation

Ten backend cases cover confirmation, ownership, create/read/update, deduplication, race conflicts, quotas/permissions, mismatches and timeouts. Ten desktop/mobile browser checks use an explicit local CRM fixture, not production credentials or actual HubSpot evidence. Live acceptance must separately record a real destination ID, readback, confirmed update and duplicate behavior; evidence is appended after publication.

For rotation, the owner uses HubSpot's supported credential flow, updates the encrypted Sites secret, redeploys and verifies before revoking the previous credential where overlap is supported. Do not revoke a working key prematurely or enable automatic rotation without secure secret refresh. CI and the browser never receive the key. The broader Make token is separate and still needs its own scoped replacement approval. No legacy HubSpot/Slack scenario is activated by this adapter.

Official contracts: [contacts guide](https://developers.hubspot.com/blog/a-developers-guide-to-hubspot-crm-objects-contacts-object), [official SDK](https://github.com/HubSpot/hubspot-api-php/blob/master/codegen/Crm/Contacts/Api/BasicApi.php), [service keys](https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/account-service-keys).
