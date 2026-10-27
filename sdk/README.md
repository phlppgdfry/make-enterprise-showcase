# Make Endpoints SDK Integration (`@makehq/endpoints-sdk`)

Enterprise backend architectures often need to execute Make integrations directly from Node.js, Next.js, or microservices without designing scenario canvases for every point-to-point call.

## Features
- **Typed SDK Calls**: Direct invocation of over 50+ Make native apps (Slack, Stripe, HubSpot, Google, Notion, etc.).
- **Built-in Idempotency**: Pass `--idempotencyKey` to guarantee that API network retries never perform duplicate actions.
- **GDPR & Confidentiality**: Pass `confidential: true` so customer PII payload is not retained in Make execution logs.

## CLI Usage
```bash
# List available endpoints in your team
make-endpoints-cli endpoints --team-id 3365938

# Describe an endpoint input schema
make-endpoints-cli describe slack CreateMessage

# Call an endpoint directly
make-endpoints-cli slack CreateMessage --team-id 3365938 --connection-id <conn-id> --channel "#alerts" --text "System update"
```

## Programmatic Node.js / TypeScript Usage
See [`call-endpoint.ts`](./call-endpoint.ts) and [`call-endpoint.js`](./call-endpoint.js).
