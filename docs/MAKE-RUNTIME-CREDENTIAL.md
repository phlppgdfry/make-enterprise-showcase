# Dedicated Make runtime credential

The production Site now uses **Make Enterprise Showcase Runtime**, scoped to organization `9433554`. Its only scopes are:

- `ai-agents:read`: inspect the existing agent before execution.
- `ai-agents:write`: required by Make's inference endpoint. This also allows configuration changes through Make's API; it is not an inference-only scope.
- `scenarios:read`: read the existing scenario inventory. No scenario-run/write scope is granted.

The token is organization-bound, not restricted by Make to one agent. The backend separately pins agent/team identity, exact instruction hash, seven approved archive context IDs, model/token limits and zero scenario/MCP tools. The public UI never receives this token. Only `MAKE_API_KEY` was replaced in encrypted Sites runtime storage, environment revision 3. The owner's general CLI credential remains unchanged.

[Actual credential/publication receipt](evidence/make-runtime-credential.json) records non-secret metadata and successful read-boundary checks. Agent inspection and scenario inventory worked; datastore access and token administration were denied. Actual production inspection also passed after publication. The eight inference acceptances preceded rotation. A later fixed, single-step release probe with the rotated key passed on 25 November for 1.91 credits, using a separate five-credit bounded reservation and preserving the 50-credit ceiling. Its replay cost zero. [Current evidence](evidence/release-2.4.2-agent.json) records the actual provider iteration. The remaining 3.93 cannot fund either request profile. Free stored-answer replay and public browser acceptance passed after publication.

## Safe replacement procedure

1. Obtain specific owner authorization for the proposed organization, scopes and secret destination. Inspect existing token labels/scopes without copying token values into output.
2. Resolve supported endpoints/scopes from the [official Make agent reference](https://developers.make.com/api-documentation/api-reference/ai-agents) and [token reference](https://developers.make.com/api-documentation/api-reference/users/api-tokens). The latter supports organization-bound token creation and restricts token administration. Check the actual account/team organization.
3. Create exactly one labelled credential using the authorized administrative session. Retain the one-time secret in process/session memory before subsequent checks. Never put it in shell arguments, a Git file, a browser field or a report. An ambiguous create is not permission to retry: inspect metadata first.
4. Check agent/scenario reads and denied unrelated reads without running a model, scenario or external business action. Stop if the token's returned organization/scopes differ from the approved values.
5. Update only Sites `MAKE_API_KEY` as a secret. Redeploy the existing saved runtime version to apply the new environment revision, preserving audience, D1 and all other values.
6. Verify production health, authenticated agent inspection and credit ledger. Run a new inference only when the owner's allowance can fund the dispatch. Use a previously stored idempotent answer for a cost-free browser regression.
7. Retire an obsolete credential only after identifying its exact label/creation time and obtaining authorization. Do not revoke the owner's shared CLI key or unrelated application tokens.

If publication or inspection fails, retain/reapply the previously authorized working server credential and redeploy the same known-good saved version. A code-version rollback alone does not roll back secrets: environment revisions and runtime versions are separate. Never expose an old or new key while diagnosing a failure.

During this release, one newly created unused key could not be handed off after a verification failure. The owner explicitly approved revoking that exact key before its same-scope replacement. The working/general key was retained. No duplicate runtime key was intentionally left behind, and no further security-sensitive permissions were added.
