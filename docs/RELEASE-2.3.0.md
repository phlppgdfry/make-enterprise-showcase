# Version 2.3 — visual and recovery update

Release candidate: local verification completed; final publication evidence is added after deployment.

## Changes

- A consistent trace-shaped brand mark; SVG favicon, 16/32/48 ICO, touch and application icons, web manifest and a real PNG social preview. The reference laboratory shares the new branding.
- A keyboard-operable architecture explorer explaining agent, research and execution-ledger paths. Its controls and sample questions never invoke a model.
- Readable execution history, explicit missing-information/review outcomes, replay notices, technical receipts and actual JSON downloads.
- Abortable private requests and session guards: locking or failed reauthentication cannot reveal a late response from an older session.
- Accurate stale-connection labeling, public status refresh, responsive controls and reduced-motion support.
- Protected, bounded, consistent D1 backup export and a checksum/schema/row-count/credit-ledger restore verifier using isolated SQLite. No production restore or automatic cleanup is performed.

## Local verification

- 114 Node tests pass, including binary asset bytes/media types/HEAD requests, icon dimensions, protected backup access, restore round-trip, tamper rejection and preserved lifetime credit usage.
- Browser controls checked at 1440, 768, 390 and 320 pixels: no horizontal overflow or application page errors.
- Browser tests for delayed responses and export rendering used an explicitly mocked local agent boundary, with zero paid model calls. These are UI tests, not live Make acceptance claims.
- Diagram/example controls, readable history, JSON content/download, HTML-as-text rendering, lock races, failed-login clearing and form submission without a submitter all passed.
- The private download button produced an actual local export that passed the isolated restore verifier.
- Browser plugin unavailable; the connected Playwright browser was used.

## Remaining configuration

The intended HubSpot CRM scenario is still inactive and has no connections. No CRM writes or messages were sent. CRM destination authorization and approved writes remain prerequisites for finishing that integration. Local backup recovery does not establish a hosted D1 restore drill. Automatic retention activation remains deferred by the owner; no maintenance secret or active cleanup schedule was added.
