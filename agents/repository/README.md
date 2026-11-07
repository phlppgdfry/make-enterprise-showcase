# Make Repo Kennisagent

A real, authenticated, on-demand knowledge assistant provisioned in Make. It uses Make's AI Provider and seven actual repository documents, with the built-in `essential_context_retriever` knowledge tool. No separately hosted Node API is required to run this assistant.

- Agent: **Make Repo Kennisagent**
- Agent ID: `0a8be23e-73f4-4856-9b7b-f2932f82e84a`
- Team: `3365938`, zone: `eu1.make.com`
- Model: Make AI Provider **Medium**, selected from the account's supported model list.
- Knowledge snapshot: commit [`885c72b`](https://github.com/phlppgdfry/make-enterprise-showcase/commit/885c72b6a247ef9f9aabe7bc540339888397f403), the verified 2.1.0 repository before this agent was added.
- Tools: attached-knowledge retrieval only; no scenario or MCP tools that can mutate accounts, make payments, write code or send messages.
- Limits: 45-second invocation timeout, five reasoning/tool iterations, 2,400 configured output tokens and no carried-over conversation history.

This is a **standalone Make AI Agents API resource**. It is not a scenario created with the separate `Run an agent (New)` module. The API supports provisioning, knowledge upload and actual model execution. The static GitHub Pages workbench and the optional support-drafting gateway remain separate implementations.

## Ask the live agent

From a Git clone with Node.js 22+ and the existing Make CLI login, or explicit `MAKE_API_KEY`/`MAKE_ZONE` environment settings:

```bash
npm run agent:ask -- "Welke workflows werken in deze repository?"
npm run agent:ask -- "Gebruikt de browserdemo een echt taalmodel?"
npm run agent:ask -- "Wat bewijzen de tests en wat nog niet?"
```

Each command makes a real, billable Make AI run. Credentials stay in the existing CLI configuration/environment and the HTTPS Authorization header. No credentials are embedded in the repository, knowledge documents, model messages or public website. Published deployment IDs are identifiers, not authentication tokens.

The cloud response contains four scalar fields: `status`, `answer`, `source`, `quote`. This avoids unsupported nested Make output schemas and JSON encoded inside a text field. The command normalizes the source/quote pair into a citations array and independently checks it against the exact pinned Git documents. Whitespace, Markdown bold/inline-code decoration and table-cell separators are normalized; words, punctuation and numbers must still match. A failed source check returns an error instead of printing an accepted answer.

Statuses:

| Status | Meaning |
| --- | --- |
| `answered` | Repository question answered with a verifiable primary source |
| `insufficient_context` | The source snapshot does not establish the requested facts |
| `review_required` | The request asks for an action or disclosure this assistant cannot perform; nothing is executed |

## Provisioning and evaluation

```bash
npm run agent:plan                  # Offline plan; no model calls or cloud writes
npm run agent:setup                 # Explicitly create/resume/update the configured agent
npm run agent:evaluate              # Offline acceptance plan
npm run agent:evaluate -- --live    # Seven real, billable Make agent runs
```

Provisioning reuses the recorded agent and uploaded contexts, rather than silently creating duplicates. It stops on a conflicting agent identity or a different knowledge snapshot. Local provisioning state, raw responses and cloud evaluation output are stored in ignored `exports/` with restrictive file permissions. A clean clone can query the deployed agent using the public deployment manifest and a properly authorized Make login; changing the existing agent still requires its local provisioning state or explicit inspection.

Cloud evaluation is opt-in. Normal `npm test` and GitHub CI use mocks and require no Make token or credits. Full Git history is fetched by CI because the source documents are deliberately pinned to a committed version.

## Verified behavior

[Live acceptance evidence](live-verification.json) records seven successful real Make runs, their iteration IDs, timings, token usage, source-checked answers and knowledge-tool metadata. The cases cover workflow knowledge, test evidence, missing private data, a refused refund/account action, an instruction-injection request, unavailable current pricing and a tenant-boundary question that explicitly exercised the Make knowledge retriever. The tests identified and corrected contradictory answers and malformed/combined citations before the final run.

The final result is a tested knowledge assistant, not a production business-process automation. Models remain non-deterministic; these seven cases do not prove every future answer is correct. The independent quote checker establishes source provenance, not full semantic entailment. No payment or mutation capability is attached, so a generated status or statement cannot execute such an action.

## Knowledge maintenance

The source allowlist, commit and hashes are published in [sources.json](sources.json) and [deployment.json](deployment.json). Verified orientation extracts are generated from those same committed documents to avoid losing basic facts when retrieval returns an incomplete excerpt.

The snapshot is not an automatic mirror of `main`. For example, its verification document reports the 78 local tests present at 2.1.0, not the larger local suite added with this agent. A future refresh must explicitly review the new commit, replace/reindex the documents, update the source catalog and rerun live acceptance. The provisioning command deliberately refuses to mix two snapshots. Private CRM data and live company research are not connected.

Official API references used: [AI Agents](https://developers.make.com/api-documentation/api-reference/ai-agents), [knowledge contexts](https://developers.make.com/api-documentation/api-reference/ai-agents/context), [providers/models](https://developers.make.com/api-documentation/api-reference/ai-agents/llm-providers).
