# Enterprise Circuit Breaker & Guard Custom App for Make.com

A custom integration app engineered for Make.com using the official Make Apps SDK. It demonstrates how senior integration engineers encapsulate complex distributed resilience patterns into reusable Make modules.

## Features
- **Guarded Request Action (`guarded-request`)**: Executes downstream HTTP requests with circuit breaker state evaluation (`CLOSED` -> `OPEN` -> `HALF-OPEN`), preventing cascading failures during downstream outages.
- **HMAC Verification Action (`verify-hmac`)**: Performs constant-time cryptographic verification of inbound webhook signatures to prevent timing attacks.
- **Zone-Aware Connectivity**: Automatically routes requests across EU and US data clusters.

## Deployment via Make CLI
To publish this app to your Make organization:
```bash
# 1. Create App Definition
make-cli sdk-apps create --zone eu1.make.com --name enterprise-circuit-breaker --label "Enterprise Circuit Breaker"

# 2. Upload Connection
make-cli sdk-connections create --app enterprise-circuit-breaker --file ./connections/api-key.json

# 3. Upload Modules
make-cli sdk-modules create --app enterprise-circuit-breaker --file ./modules/guarded-request.json
make-cli sdk-modules create --app enterprise-circuit-breaker --file ./modules/verify-hmac.json
```
