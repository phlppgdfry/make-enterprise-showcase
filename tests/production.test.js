"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");
const { buildKnowledge } = require("../scripts/make-knowledge-agent");
function database() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(
    fs.readFileSync("production/drizzle/0000_cuddly_madrox.sql", "utf8"),
  );
  const wrap = (q, args = []) => ({
    bind(...v) {
      return wrap(q, v);
    },
    async first() {
      return sql.prepare(q).get(...args) || null;
    },
    async all() {
      return { results: sql.prepare(q).all(...args) };
    },
    async run() {
      const result = sql.prepare(q).run(...args);
      return { meta: { changes: Number(result.changes) } };
    },
  });
  return {
    prepare: wrap,
    async batch(statements) {
      sql.exec("BEGIN");
      try {
        const results = [];
        for (const s of statements) results.push(await s.run());
        sql.exec("COMMIT");
        return results;
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
    raw: sql,
  };
}
async function setup(fetcher) {
  const { createApp } = await import("../production/src/app.js");
  const knowledge = buildKnowledge();
  let calls = 0;
  const upstream =
    fetcher ||
    async function (url, options) {
      if (url.includes("/run?")) {
        calls++;
        return Response.json({
          jsonResponse: {
            status: "answered",
            answer: "The browser demo uses fixtures.",
            source: knowledge.extracts[3].source,
            quote: knowledge.extracts[3].quote,
          },
          centicreditsConsumption: { totalCenticreditsConsumption: 175 },
          lastAgentIterationId: "iteration-test",
        });
      }
      if (url.includes("/ai-agents/"))
        return Response.json({
          agent: {
            id: "0a8be23e-73f4-4856-9b7b-f2932f82e84a",
            name: "Make Repo Kennisagent",
            contexts: Array(7).fill({}),
            scenarios: [],
            mcpConfigs: [],
            defaultModel: "medium",
            systemPrompt: knowledge.systemPrompt,
            llmConfig: { maxTokens: 2400 },
          },
        });
      if (url.includes("/robots.txt"))
        return new Response("User-agent: *\nAllow: /");
      return new Response(
        '<html><title>Company &amp; platform</title><meta name="description" content="Actual public description"></html>',
        { headers: { "content-type": "text/html" } },
      );
    };
  const env = {
    DB: database(),
    OPERATOR_API_KEY: "test-access-key",
    MAKE_API_KEY: "not-a-real-secret",
  };
  const logs = [];
  const app = createApp({
    knowledge,
    assets: { "/index.html": "<html>test</html>" },
    commit: "test-commit",
    fetcher: upstream,
    logger: (value) => logs.push(value),
  });
  const call = async (path, body, options = {}) => {
    const r = await app(
      new Request("https://test.example" + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Authorization: "Bearer test-access-key",
          ...(body === undefined
            ? {}
            : {
                "content-type": "application/json",
                "idempotency-key": options.key || crypto.randomUUID(),
              }),
          ...options.headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      env,
    );
    return { status: r.status, headers: r.headers, data: await r.json() };
  };
  return { call, env, logs, calls: () => calls, app };
}
test("production health checks storage and provides traceable build", async () => {
  const s = await setup();
  const r = await s.call("/api/health");
  assert.equal(r.status, 200);
  assert.equal(r.data.sourceCommit, "test-commit");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  const next = await s.call("/api/health");
  assert.match(
    r.headers.get("content-security-policy"),
    /nonce-[A-Za-z0-9+/=]+/,
  );
  assert.notEqual(
    r.headers.get("content-security-policy"),
    next.headers.get("content-security-policy"),
  );
  assert.ok(
    !r.headers.get("content-security-policy").includes("unsafe-inline"),
  );
});
test("production rejects unauthorized reads, metered calls, CRM writes and cross-origin posts", async () => {
  const s = await setup();
  for (const [path, b] of [
    ["/api/executions", undefined],
    ["/api/agent/ask", { question: "hi" }],
    ["/api/crm/contacts", {}],
  ]) {
    assert.equal(
      (await s.call(path, b, { headers: { Authorization: "" } })).status,
      401,
    );
  }
  assert.equal(
    (
      await s.call(
        "/api/agent/ask",
        { question: "hi" },
        { headers: { origin: "https://attacker.example" } },
      )
    ).status,
    403,
  );
  assert.equal(s.calls(), 0);
});
test("agent uses actual provider boundary, validates provenance, persists and replays idempotently", async () => {
  const s = await setup();
  const first = await s.call(
    "/api/workflows/repository-agent/execute",
    { question: "Does the demo use an LLM?" },
    { key: "same-request-001" },
  );
  assert.equal(first.data.execution.status, "succeeded");
  assert.equal(first.data.execution.chargedCenticredits, 175);
  assert.equal(first.data.execution.result.citations.length, 1);
  const replay = await s.call(
    "/api/agent/ask",
    { question: "Does the demo use an LLM?" },
    { key: "same-request-001" },
  );
  assert.equal(replay.data.execution.id, first.data.execution.id);
  assert.equal(replay.data.replayed, true);
  assert.equal(s.calls(), 1);
  assert.equal(
    (
      await s.call(
        "/api/agent/ask",
        { question: "Different" },
        { key: "same-request-001" },
      )
    ).status,
    409,
  );
  assert.equal(
    (await s.call("/api/executions/" + first.data.execution.id)).data.execution
      .status,
    "succeeded",
  );
});
test("conservative credit allowance admits at most seven metered calls and never retries", async () => {
  const s = await setup();
  for (let i = 0; i < 8; i++) {
    const r = await s.call("/api/agent/ask", { question: "Question " + i });
    assert.equal(r.data.execution.status, i < 7 ? "succeeded" : "failed");
  }
  assert.equal(s.calls(), 7);
  assert.equal(
    s.env.DB.raw.prepare("SELECT used_centi FROM budget").get().used_centi,
    4900,
  );
});
test("timeouts after dispatch persist uncertain status without duplicate provider requests", async () => {
  let calls = 0;
  const s = await setup(async (url) => {
    if (url.includes("/run?")) {
      calls++;
      throw Error("sensitive upstream body");
    }
    return Response.json({
      agent: {
        id: "0a8be23e-73f4-4856-9b7b-f2932f82e84a",
        name: "Make Repo Kennisagent",
        contexts: Array(7).fill({}),
        scenarios: [],
        mcpConfigs: [],
        defaultModel: "medium",
        systemPrompt: buildKnowledge().systemPrompt,
        llmConfig: { maxTokens: 2400 },
      },
    });
  });
  const r = await s.call(
    "/api/agent/ask",
    { question: "question" },
    { key: "uncertain-request" },
  );
  assert.equal(r.data.execution.status, "uncertain");
  await s.call(
    "/api/agent/ask",
    { question: "question" },
    { key: "uncertain-request" },
  );
  assert.equal(calls, 1);
  assert.ok(!JSON.stringify(s.logs).includes("sensitive upstream"));
  assert.equal(
    (await s.call("/api/budget/reconcile", {})).data.allocatedCredits,
    7,
  );
  assert.equal(
    (await s.call("/api/budget/reconcile", {})).data.allocatedCredits,
    7,
  );
});
test("unverified agent citations are withheld while actual usage is retained", async () => {
  const s = await setup(async (url) =>
    url.includes("/run?")
      ? Response.json({
          jsonResponse: {
            status: "answered",
            answer: "Fabrication",
            source: "https://evil.example",
            quote: "invented source",
          },
          centicreditsConsumption: { totalCenticreditsConsumption: 100 },
        })
      : Response.json({
          agent: {
            id: "0a8be23e-73f4-4856-9b7b-f2932f82e84a",
            name: "Make Repo Kennisagent",
            contexts: Array(7).fill({}),
            scenarios: [],
            mcpConfigs: [],
            defaultModel: "medium",
            systemPrompt: buildKnowledge().systemPrompt,
            llmConfig: { maxTokens: 2400 },
          },
        }),
  );
  const r = await s.call("/api/agent/ask", { question: "question" });
  assert.equal(r.data.execution.status, "failed");
  assert.equal(r.data.execution.error.code, "unverified_agent_answer");
  assert.equal(r.data.execution.chargedCenticredits, 100);
  assert.equal(r.data.execution.result, null);
});
test("research parses real HTML boundary and reuses domain record without inventing contacts", async () => {
  const s = await setup();
  const r = await s.call("/api/leads/research", { domain: "cloudflare.com" });
  const result = r.data.execution.result;
  assert.equal(result.title, "Company & platform");
  assert.deepEqual(result.contacts, []);
  assert.equal(result.fitScore, null);
  const repeated = await s.call("/api/leads/research", {
    domain: "cloudflare.com",
  });
  assert.equal(repeated.data.execution.result.leadId, result.leadId);
  assert.equal(repeated.data.execution.result.reused, true);
  assert.equal((await s.call("/api/leads/" + result.leadId)).status, 200);
});
test("research blocks SSRF, unapproved domains, paths and credentials before fetching", async () => {
  const s = await setup();
  for (const domain of [
    "http://127.0.0.1",
    "https://cloudflare.com@evil.example",
    "https://cloudflare.com:444",
    "https://cloudflare.com/private",
    "evil.example",
  ])
    assert.equal((await s.call("/api/leads/research", { domain })).status, 400);
});
test("robots policy and cross-domain redirects fail closed", async () => {
  const { robotsAllowed, research } =
    await import("../production/src/research.js");
  assert.equal(robotsAllowed("User-agent: *\nDisallow: /"), false);
  assert.equal(
    robotsAllowed("User-agent: *\nDisallow: /private\nAllow: /"),
    true,
  );
  assert.equal(
    robotsAllowed(
      "User-agent: *\nAllow: /\nUser-agent: MakeEnterpriseShowcaseBot\nDisallow: /",
    ),
    false,
  );
  await assert.rejects(
    research(
      "cloudflare.com",
      ["cloudflare.com"],
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "http://127.0.0.1" },
        }),
    ),
    /outside/,
  );
});
test("CRM reports unconfigured without writes and public status exposes no keys", async () => {
  const s = await setup();
  const r = await s.call("/api/crm/contacts", {});
  assert.equal(r.status, 503);
  assert.equal(r.data.error.code, "crm_unconfigured");
  await s.env.DB.prepare(
    "INSERT INTO integration_cache (name,value_json,observed_at) VALUES (?,?,?)",
  )
    .bind(
      "make",
      JSON.stringify({
        agent: { name: "Make Repo Kennisagent" },
        scenarios: [{ name: "private-customer-workflow" }],
      }),
      Date.now(),
    )
    .run();
  const status = await s.call("/api/status");
  assert.equal(status.data.make.verification.scenarioCount, 1);
  assert.ok(!JSON.stringify(status.data).includes("private-customer-workflow"));
  assert.equal(status.data.crm.configured, false);
  assert.ok(!JSON.stringify(status.data).includes(s.env.MAKE_API_KEY));
  assert.equal(s.calls(), 0);
});
test("validation, unknown fields and rate limiting prevent provider execution", async () => {
  const s = await setup();
  assert.equal(
    (
      await s.call(
        "/api/agent/ask",
        { question: "hi" },
        { headers: { "content-type": "application/jsonx" } },
      )
    ).status,
    415,
  );
  assert.equal((await s.call("/api/agent/ask", { question: "" })).status, 400);
  assert.equal(
    (await s.call("/api/agent/ask", { question: "hi", tools: ["write"] }))
      .status,
    400,
  );
  assert.equal(
    (
      await s.call(
        "/api/agent/ask",
        { question: "hi" },
        { headers: { "idempotency-key": "" } },
      )
    ).status,
    400,
  );
  for (let i = 0; i < 56; i++) await s.call("/api/health");
  assert.equal(
    (await s.call("/api/agent/ask", { question: "hi" })).status,
    429,
  );
  assert.equal(s.calls(), 0);
});
test("retention purges expired application data but preserves unexpired executions", async () => {
  const s = await setup();
  await s.call("/api/leads/research", { domain: "cloudflare.com" });
  s.env.DB.raw.prepare("UPDATE leads SET expires_at=1").run();
  const r = await s.call("/api/maintenance/retention", {});
  assert.equal(r.data.purged, true);
  assert.equal(s.env.DB.raw.prepare("SELECT count(*) n FROM leads").get().n, 0);
  assert.equal(
    s.env.DB.raw.prepare("SELECT count(*) n FROM executions").get().n,
    1,
  );
});
test("Make requests use Worker-supported manual redirects and never forward credentials to another host", async () => {
  let count = 0;
  const s = await setup(async (url, options) => {
    count++;
    assert.equal(options.redirect, "manual");
    return new Response(null, {
      status: 302,
      headers: { location: "https://attacker.example" },
    });
  });
  const r = await s.call("/api/integrations/verify", {});
  assert.equal(r.status, 502);
  assert.equal(count, 1);
});
test("credit reconciliation is atomic, receipt-based, idempotent and preserves lifetime cost after retention", async () => {
  const s = await setup();
  for (let i = 0; i < 2; i++)
    await s.call("/api/agent/ask", { question: "Question " + i });
  const first = await s.call("/api/budget/reconcile", {});
  assert.equal(first.data.allocatedCredits, 3.5);
  assert.equal(first.data.approvedLimitCredits, 50);
  assert.equal(
    (await s.call("/api/budget/reconcile", {})).data.allocatedCredits,
    3.5,
  );
  s.env.DB.raw.prepare("UPDATE executions SET expires_at=1").run();
  await s.call("/api/maintenance/retention", {});
  assert.equal(
    (await s.call("/api/budget/reconcile", {})).data.allocatedCredits,
    3.5,
  );
  assert.equal(
    (
      await s.call(
        "/api/budget/reconcile",
        {},
        { headers: { Authorization: "" } },
      )
    ).status,
    401,
  );
});
test("maintenance credential can purge only expired records and cannot read history, spend credits or reconcile budgets", async () => {
  const s = await setup();
  s.env.MAINTENANCE_API_KEY = "maintenance-only-key";
  const headers = { Authorization: "Bearer maintenance-only-key" };
  for (const [path, b] of [
    ["/api/executions", undefined],
    ["/api/workflows", undefined],
    ["/api/agent/ask", { question: "hi" }],
    ["/api/budget/reconcile", {}],
  ])
    assert.equal((await s.call(path, b, { headers })).status, 401);
  await s.call("/api/leads/research", { domain: "cloudflare.com" });
  const before = s.env.DB.raw
    .prepare("SELECT COUNT(*) n FROM executions")
    .get().n;
  const result = await s.call("/api/maintenance/retention", {}, { headers });
  assert.equal(result.status, 200);
  assert.equal(result.data.budgetPreserved, true);
  assert.equal(
    s.env.DB.raw.prepare("SELECT COUNT(*) n FROM executions").get().n,
    before,
  );
  assert.equal(
    s.env.DB.raw
      .prepare(
        "SELECT actor FROM audit_events WHERE action='retention-maintenance'",
      )
      .get().actor,
    "maintenance",
  );
  assert.equal(s.calls(), 0);
});
