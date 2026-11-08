import { PublicError, research, companyURL } from "./research.js";
import validation from "./answer-validation.cjs";
const AGENT = "0a8be23e-73f4-4856-9b7b-f2932f82e84a",
  TEAM = 3365938;
const TTL = 7 * 86400000;
const json = (value, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
const fail = (status, code, message) => {
  throw new PublicError(status, code, message);
};
const sha = async (value) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
async function secureEqual(a, b) {
  const x = await sha(a),
    y = await sha(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}
function allowed(env) {
  return (env.RESEARCH_DOMAINS || "make.com,cloudflare.com,github.com")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(s));
}
const decode = (row) =>
  row
    ? {
        id: row.id,
        workflow: row.workflow,
        status: row.status,
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
        result: row.result_json ? JSON.parse(row.result_json) : null,
        error: row.error_json ? JSON.parse(row.error_json) : null,
        chargedCenticredits: row.charged_centi,
        upstreamId: row.upstream_id,
      }
    : null;
async function bodyOf(req) {
  if (
    req.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !==
    "application/json"
  )
    fail(415, "json_required", "Use application/json.");
  let raw = "";
  const reader = req.body?.getReader();
  if (reader) {
    const decoder = new TextDecoder();
    let bytes = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.length;
        if (bytes > 16384)
          fail(413, "body_too_large", "Request exceeds 16 KB.");
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
    } finally {
      await reader.cancel().catch(() => {});
    }
  }
  try {
    const b = JSON.parse(raw);
    if (!b || typeof b !== "object" || Array.isArray(b)) throw Error();
    return b;
  } catch {
    fail(400, "invalid_json", "Provide a JSON object.");
  }
}
function strict(b, keys) {
  if (Object.keys(b).some((k) => !keys.includes(k)))
    fail(400, "unknown_field", "Unexpected request field.");
}
export function createApp({
  assets = {},
  knowledge,
  commit = "development",
  fetcher = fetch,
  logger = console.log,
} = {}) {
  async function make(env, path, body) {
    if (!env.MAKE_API_KEY)
      fail(503, "make_unconfigured", "Make credentials are not configured.");
    const zone = env.MAKE_ZONE || "eu1.make.com";
    if (!/^(eu[12]|us[12])\.make\.com$/.test(zone))
      fail(
        503,
        "invalid_make_configuration",
        "Make region is not configured correctly.",
      );
    const r = await fetcher(`https://${zone}/api/v2${path}`, {
      method: body ? "POST" : "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(65000),
      headers: {
        Authorization: `Token ${env.MAKE_API_KEY}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const raw = await r.text();
    if (raw.length > 1000000)
      fail(
        502,
        "make_response_too_large",
        "Make returned an oversized response.",
      );
    if (!r.ok)
      fail(
        r.status === 429 ? 429 : 502,
        "make_upstream_error",
        r.status === 429
          ? "Make rate limit reached. Try later."
          : "Make could not complete this request.",
      );
    try {
      return JSON.parse(raw);
    } catch {
      fail(502, "make_invalid_response", "Make returned an invalid response.");
    }
  }
  async function inspectAgent(env) {
    const payload = await make(
      env,
      `/ai-agents/v1/agents/${AGENT}?teamId=${TEAM}`,
    );
    const a = payload.agent || payload;
    if (
      a.id !== AGENT ||
      a.name !== "Make Repo Kennisagent" ||
      a.contexts?.length !== 7 ||
      a.scenarios?.length ||
      a.mcpConfigs?.length ||
      a.defaultModel !== "medium" ||
      !a.systemPrompt?.includes(knowledge.ref) ||
      (await sha(a.systemPrompt)) !==
        (knowledge.promptSha256 || (await sha(knowledge.systemPrompt))) ||
      a.llmConfig?.maxTokens !== 2400
    )
      fail(
        503,
        "agent_scope_changed",
        "Agent configuration differs from the approved read-only snapshot.",
      );
    return {
      id: a.id,
      name: a.name,
      model: a.defaultModel,
      knowledgeDocuments: a.contexts.length,
      sourceCommit: knowledge.ref,
      readOnly: true,
    };
  }
  async function audit(db, id, action, outcome, execution = null) {
    await db
      .prepare(
        "INSERT INTO audit_events (id,request_id,actor,action,outcome,execution_id,created_at,expires_at) VALUES (?,?,?,?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        id,
        "operator",
        action,
        outcome,
        execution,
        Date.now(),
        Date.now() + TTL,
      )
      .run();
  }
  async function execute(req, env, workflow, b, requestId) {
    if (!["repository-agent", "company-research"].includes(workflow))
      fail(404, "workflow_not_found", "Workflow is not available.");
    let input;
    if (workflow === "repository-agent") {
      strict(b, ["question"]);
      if (
        typeof b.question !== "string" ||
        !b.question.trim() ||
        b.question.length > 2000
      )
        fail(400, "invalid_question", "Enter a question of 1–2000 characters.");
      input = { question: b.question.trim() };
      if (!env.MAKE_API_KEY)
        fail(503, "make_unconfigured", "Make credentials are not configured.");
    } else {
      strict(b, ["domain"]);
      input = companyURL(b.domain, allowed(env));
    }
    const key = req.headers.get("idempotency-key");
    if (!key || !/^[a-zA-Z0-9_-]{8,100}$/.test(key))
      fail(
        400,
        "idempotency_required",
        "Provide an Idempotency-Key of 8–100 letters, digits, underscores or hyphens.",
      );
    const db = env.DB,
      hash = await sha(JSON.stringify(input)),
      id = crypto.randomUUID(),
      now = Date.now();
    await db
      .prepare(
        "INSERT INTO executions (id,owner,workflow,idempotency_key,request_hash,status,input_json,created_at,updated_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(owner,workflow,idempotency_key) DO NOTHING",
      )
      .bind(
        id,
        "operator",
        workflow,
        key,
        hash,
        "queued",
        JSON.stringify(input),
        now,
        now,
        now + TTL,
      )
      .run();
    const existing = await db
      .prepare(
        "SELECT * FROM executions WHERE owner=? AND workflow=? AND idempotency_key=?",
      )
      .bind("operator", workflow, key)
      .first();
    if (existing.request_hash !== hash)
      fail(
        409,
        "idempotency_conflict",
        "This request key was already used with different input.",
      );
    if (existing.id !== id)
      return json(
        { execution: decode(existing), replayed: true },
        existing.status === "running" ? 202 : 200,
      );
    const claim = await db
      .prepare(
        "UPDATE executions SET status='running' WHERE id=? AND status='queued'",
      )
      .bind(id)
      .run();
    if (claim.meta.changes !== 1)
      fail(409, "execution_claim_failed", "Execution was already claimed.");
    let dispatched = false,
      reserved = false,
      charged = null,
      upstream = null;
    try {
      let result;
      if (workflow === "repository-agent") {
        await inspectAgent(env);
        await db
          .prepare(
            "INSERT INTO budget (id) VALUES (1) ON CONFLICT(id) DO NOTHING",
          )
          .run();
        // Conservative allocation: at most seven unreconciled dispatches per approved 50-credit allowance.
        const allocation = await db
          .prepare(
            "UPDATE budget SET used_centi=used_centi+700 WHERE id=1 AND used_centi+700<=limit_centi",
          )
          .run();
        if (allocation.meta.changes !== 1)
          fail(
            429,
            "credit_budget_exhausted",
            "The approved verification credit allowance has been allocated. An operator must review usage before extending it.",
          );
        reserved = true;
        await db
          .prepare("UPDATE executions SET reserved_centi=700 WHERE id=?")
          .bind(id)
          .run();
        dispatched = true;
        const r = await make(
          env,
          `/ai-agents/v1/agents/${AGENT}/run?teamId=${TEAM}`,
          {
            messages: [{ role: "user", content: input.question }],
            threadId: id,
            config: {},
          },
        );
        const consumption =
          r.centicreditsConsumption?.totalCenticreditsConsumption;
        charged =
          typeof consumption === "number" &&
          Number.isFinite(consumption) &&
          consumption >= 0
            ? consumption
            : null;
        upstream =
          typeof r.lastAgentIterationId === "string"
            ? r.lastAgentIterationId
            : null;
        let raw = r.jsonResponse;
        try {
          raw = raw || JSON.parse(r.response);
        } catch {
          fail(
            502,
            "invalid_agent_output",
            "The agent response could not be decoded.",
          );
        }
        let answer;
        try {
          answer = validation.validateAnswer(
            validation.decodeAnswer(raw),
            knowledge,
          );
        } catch {
          fail(
            502,
            "unverified_agent_answer",
            "The answer failed source validation and has been withheld.",
          );
        }
        result = {
          ...answer,
          sourceCommit: knowledge.ref,
          executionTimeMs: r.executionTimeMs || null,
          chargedCenticredits: charged,
          iterationId: upstream,
          citationValidation:
            "Source URL and quoted text verified against the pinned repository snapshot; semantic entailment is not automatically proven.",
        };
      } else {
        const prior = await db
          .prepare("SELECT * FROM leads WHERE domain=? AND expires_at>?")
          .bind(input.domain, now)
          .first();
        if (prior)
          result = {
            ...JSON.parse(prior.data_json),
            leadId: prior.id,
            reused: true,
          };
        else {
          const data = await research(input.domain, allowed(env), fetcher),
            digest = await sha(JSON.stringify(data.evidence)),
            leadId = crypto.randomUUID();
          await db
            .prepare(
              "INSERT INTO leads (id,domain,source_url,data_json,digest,observed_at,expires_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(domain) DO UPDATE SET source_url=excluded.source_url,data_json=excluded.data_json,digest=excluded.digest,observed_at=excluded.observed_at,expires_at=excluded.expires_at",
            )
            .bind(
              leadId,
              input.domain,
              data.source,
              JSON.stringify(data),
              digest,
              now,
              now + TTL,
            )
            .run();
          const saved = await db
            .prepare("SELECT id FROM leads WHERE domain=?")
            .bind(input.domain)
            .first();
          result = { ...data, leadId: saved.id, reused: false };
        }
      }
      await db
        .prepare(
          "UPDATE executions SET status='succeeded',result_json=?,updated_at=?,charged_centi=?,upstream_id=? WHERE id=?",
        )
        .bind(JSON.stringify(result), Date.now(), charged, upstream, id)
        .run();
      await audit(db, requestId, workflow, "succeeded", id);
    } catch (error) {
      const safe =
        error instanceof PublicError
          ? { code: error.code, message: error.message }
          : {
              code: "upstream_unavailable",
              message:
                "The upstream service could not be reached. Review the execution before retrying.",
            };
      const status = dispatched && charged === null ? "uncertain" : "failed";
      await db
        .prepare(
          "UPDATE executions SET status=?,error_json=?,updated_at=?,charged_centi=?,upstream_id=? WHERE id=?",
        )
        .bind(status, JSON.stringify(safe), Date.now(), charged, upstream, id)
        .run();
      await audit(db, requestId, workflow, status, id);
      logger(
        JSON.stringify({
          requestId,
          executionId: id,
          event: "execution_failed",
          code: safe.code,
          reserved,
        }),
      );
    }
    return json(
      {
        execution: decode(
          await db
            .prepare("SELECT * FROM executions WHERE id=?")
            .bind(id)
            .first(),
        ),
      },
      201,
    );
  }
  return async (req, env, ctx = {}) => {
    const started = Date.now(),
      requestId = crypto.randomUUID(),
      url = new URL(req.url);
    let response;
    try {
      const path = url.pathname;
      if (["GET", "HEAD"].includes(req.method) && !path.startsWith("/api/")) {
        const name = path === "/" ? "/index.html" : path;
        if (!assets[name]) fail(404, "not_found", "Page not found.");
        const type = name.endsWith(".css")
          ? "text/css"
          : name.endsWith(".js")
            ? "text/javascript"
            : name.endsWith(".svg")
              ? "image/svg+xml"
              : name.endsWith(".xml")
                ? "application/xml"
                : name.endsWith(".txt")
                  ? "text/plain"
                  : "text/html";
        response = new Response(req.method === "HEAD" ? null : assets[name], {
          headers: {
            "content-type": type + "; charset=utf-8",
            "cache-control": "no-cache",
          },
        });
      } else {
        if (!["GET", "POST"].includes(req.method))
          fail(405, "method_not_allowed", "Method not supported.");
        if (!env.DB)
          fail(
            503,
            "database_unconfigured",
            "Persistent storage is not configured.",
          );
        const now = Date.now();
        const bucket = await sha(
          (req.headers.get("cf-connecting-ip") || "local") +
            ":" +
            Math.floor(now / 60000),
        );
        const rate = await env.DB.prepare(
          "INSERT INTO rate_limits (key,count,reset_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
        )
          .bind(bucket, now + 60000)
          .first();
        if (rate.count > 60)
          fail(
            429,
            "rate_limited",
            "Too many requests. Try again in a minute.",
          );
        if (req.method === "GET" && path === "/api/health") {
          await env.DB.prepare("SELECT id FROM budget LIMIT 1").first();
          response = json({
            status: "healthy",
            storage: "D1",
            sourceCommit: commit,
            knowledgeCommit: knowledge.ref,
          });
        } else if (req.method === "GET" && path === "/api/status") {
          const cached = await env.DB.prepare(
            "SELECT * FROM integration_cache WHERE name=?",
          )
            .bind("make")
            .first();
          response = json({
            make: {
              configured: !!env.MAKE_API_KEY,
              verification: cached ? JSON.parse(cached.value_json) : null,
              observedAt: cached
                ? new Date(cached.observed_at).toISOString()
                : null,
            },
            research: {
              configured: true,
              provider: "Public company website metadata",
              allowedDomains: allowed(env),
            },
            crm: {
              configured: false,
              status: "unconfigured",
              reason:
                "No authorized CRM connection or write approval is configured.",
            },
            authentication: {
              requiredForExecution: true,
              method: "Operator access key",
            },
            creditPolicy: {
              maximumAllocatedCredits: 50,
              maximumUnreconciledCalls: 7,
              allocationPerCallCredits: 7,
              automaticRetries: false,
            },
            retentionDays: 7,
          });
        } else {
          const origin = req.headers.get("origin");
          if (req.method === "POST" && origin && origin !== url.origin)
            fail(
              403,
              "origin_denied",
              "Use the application from its own origin.",
            );
          const token = req.headers
            .get("authorization")
            ?.match(/^Bearer ([^\s]+)$/)?.[1];
          if (
            !env.OPERATOR_API_KEY ||
            !token ||
            !(await secureEqual(token, env.OPERATOR_API_KEY))
          )
            fail(401, "unauthorized", "An operator access key is required.");
          if (req.method === "GET" && path === "/api/workflows")
            response = json({
              workflows: [
                {
                  id: "repository-agent",
                  name: "Repository knowledge agent",
                  provider: "Make AI Agents",
                  configured: !!env.MAKE_API_KEY,
                },
                {
                  id: "company-research",
                  name: "Company website research",
                  provider: "Public company website",
                  configured: true,
                },
              ],
            });
          else if (
            req.method === "POST" &&
            path === "/api/integrations/verify"
          ) {
            strict(await bodyOf(req), []);
            const agent = await inspectAgent(env);
            const inventory = await make(env, `/scenarios?teamId=${TEAM}`);
            const scenarios = (inventory.scenarios || []).map((s) => ({
              id: s.id,
              name: s.name,
              active: !!s.isActive,
              linked: !!s.islinked,
            }));
            const result = { agent, scenarios };
            await env.DB.prepare(
              "INSERT INTO integration_cache (name,value_json,observed_at) VALUES (?,?,?) ON CONFLICT(name) DO UPDATE SET value_json=excluded.value_json,observed_at=excluded.observed_at",
            )
              .bind("make", JSON.stringify(result), Date.now())
              .run();
            await audit(
              env.DB,
              requestId,
              "integration-inspection",
              "succeeded",
            );
            response = json(result);
          } else if (
            req.method === "POST" &&
            (path === "/api/agent/ask" ||
              path === "/api/leads/research" ||
              /^\/api\/workflows\/[^/]+\/execute$/.test(path))
          )
            response = await execute(
              req,
              env,
              path === "/api/agent/ask"
                ? "repository-agent"
                : path === "/api/leads/research"
                  ? "company-research"
                  : path.split("/")[3],
              await bodyOf(req),
              requestId,
            );
          else if (req.method === "GET" && path === "/api/executions") {
            const rows = await env.DB.prepare(
              "SELECT * FROM executions WHERE owner=? AND expires_at>? ORDER BY created_at DESC LIMIT 30",
            )
              .bind("operator", now)
              .all();
            response = json({ executions: rows.results.map(decode) });
          } else if (
            req.method === "GET" &&
            /^\/api\/executions\/[a-f0-9-]{36}$/.test(path)
          ) {
            const row = await env.DB.prepare(
              "SELECT * FROM executions WHERE id=? AND owner=? AND expires_at>?",
            )
              .bind(path.split("/")[3], "operator", now)
              .first();
            if (!row) fail(404, "not_found", "Execution not found.");
            response = json({ execution: decode(row) });
          } else if (
            req.method === "GET" &&
            /^\/api\/leads\/[a-f0-9-]{36}$/.test(path)
          ) {
            const row = await env.DB.prepare(
              "SELECT * FROM leads WHERE id=? AND expires_at>?",
            )
              .bind(path.split("/")[3], now)
              .first();
            if (!row) fail(404, "not_found", "Research record not found.");
            response = json({
              lead: { ...JSON.parse(row.data_json), id: row.id },
            });
          } else if (path.startsWith("/api/crm/"))
            fail(
              503,
              "crm_unconfigured",
              "No authorized CRM connection or write approval is configured. No CRM record has been created.",
            );
          else if (req.method === "POST" && path === "/api/budget/reconcile") {
            strict(await bodyOf(req), []);
            // D1 batch is atomic. Unknown charges retain their full allocation; settled receipts never reset lifetime spend.
            const settled =
              "workflow='repository-agent' AND charged_centi IS NOT NULL AND status IN ('succeeded','failed')";
            await env.DB.batch([
              env.DB.prepare(
                "INSERT INTO budget (id) VALUES (1) ON CONFLICT(id) DO NOTHING",
              ),
              env.DB.prepare(
                `UPDATE budget SET used_centi=used_centi-COALESCE((SELECT SUM(reserved_centi-charged_centi) FROM executions WHERE ${settled}),0) WHERE id=1`,
              ),
              env.DB.prepare(
                `UPDATE executions SET reserved_centi=charged_centi WHERE ${settled}`,
              ),
            ]);
            const current = await env.DB.prepare(
              "SELECT used_centi,limit_centi FROM budget WHERE id=1",
            ).first();
            await audit(
              env.DB,
              requestId,
              "credit-reconciliation",
              "succeeded",
            );
            response = json({
              allocatedCredits: current.used_centi / 100,
              approvedLimitCredits: current.limit_centi / 100,
              remainingAllocationCredits:
                Math.max(0, current.limit_centi - current.used_centi) / 100,
              limitChanged: false,
            });
          } else if (
            req.method === "POST" &&
            path === "/api/maintenance/retention"
          ) {
            strict(await bodyOf(req), []);
            await env.DB.batch(
              ["executions", "audit_events", "leads"]
                .map((table) =>
                  env.DB.prepare(
                    `DELETE FROM ${table} WHERE expires_at < ?`,
                  ).bind(now),
                )
                .concat([
                  env.DB.prepare(
                    "DELETE FROM rate_limits WHERE reset_at < ?",
                  ).bind(now),
                ]),
            );
            response = json({ purged: true });
          } else fail(404, "not_found", "API route not found.");
        }
      }
    } catch (error) {
      logger(
        JSON.stringify({
          requestId,
          event: "request_error",
          name: error.name,
          code: error instanceof PublicError ? error.code : "internal_error",
          frames:
            typeof error.stack === "string"
              ? error.stack
                  .split("\n")
                  .slice(1, 4)
                  .map((x) => x.replace(/https?:\/\/[^ )]+/g, "[runtime]"))
              : [],
        }),
      );
      response = json(
        {
          error: {
            code: error instanceof PublicError ? error.code : "internal_error",
            message:
              error instanceof PublicError
                ? error.message
                : "The service could not complete this request.",
            requestId,
          },
        },
        error instanceof PublicError ? error.status : 500,
      );
    }
    const headers = new Headers(response.headers);
    headers.set("x-request-id", requestId);
    headers.set("x-content-type-options", "nosniff");
    headers.set("referrer-policy", "no-referrer");
    headers.set(
      "permissions-policy",
      "camera=(), microphone=(), geolocation=()",
    );
    headers.set(
      "strict-transport-security",
      "max-age=31536000; includeSubDomains",
    );
    headers.set(
      "content-security-policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    );
    logger(
      JSON.stringify({
        requestId,
        method: req.method,
        path: url.pathname,
        status: response.status,
        durationMs: Date.now() - started,
      }),
    );
    return new Response(response.body, { status: response.status, headers });
  };
}
