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
      if (/^\s*SELECT\b/i.test(q))
        return { results: sql.prepare(q).all(...args), meta: { changes: 0 } };
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
        const config = JSON.parse(options.body).config;
        if (config.systemPrompt) {
          assert.equal(config.llmConfig.settings.maxTokens, 1200);
          assert.equal(config.invocationConfig.recursionLimit, 1);
          assert.equal(config.historyConfig.iterationsFromHistoryCount, 0);
          assert.deepEqual(config.scenarios, []);
          assert.deepEqual(config.mcpConfigs, []);
          const source = knowledge.sources.find((s) => s.inline);
          return Response.json({
            jsonResponse: {
              status: "answered",
              answer:
                "HubSpot gebruikt alleen testcontacten, met operatorbevestiging; geen klantwrites.",
              source: source.url,
              quote:
                "HubSpot access is limited to application-marked test contacts.",
            },
            centicreditsConsumption: { totalCenticreditsConsumption: 125 },
            lastAgentIterationId: "bounded-iteration-test",
          });
        }
        return Response.json({
          jsonResponse: {
            status: "answered",
            answer: "The browser demo uses fixtures.",
            source: knowledge.extracts[3].source,
            quote: knowledge.extracts[3].quote,
          },
          centicreditsConsumption: { totalCenticreditsConsumption: 175 },
          lastAgentIterationId: "iteration-test",
          executionSteps: [
            {
              role: "tool",
              toolResponse: {
                name: "essential_context_retriever",
                status: "ok",
                toolType: "rag",
                result: "private provider trace body must not be retained",
              },
            },
          ],
        });
      }
      if (url.includes("/ai-agents/"))
        return Response.json({
          agent: {
            id: "0a8be23e-73f4-4856-9b7b-f2932f82e84a",
            name: "Make Repo Kennisagent",
            contexts: buildKnowledge().archiveContextIds.map((id) => ({ id })),
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

const approvedCRM = {
  email: "make-showcase-test-verification@example.com",
  firstname: "Make Showcase",
  lastname: "TEST Verification",
  confirmed: true,
};
async function crmSetup() {
  const contacts = new Map(),
    requests = [],
    mode = {};
  let serial = 1000;
  const s = await setup(async (url, options) => {
    assert.ok(url.startsWith("https://api.hubapi.com/crm/v3/objects/contacts"));
    assert.equal(options.redirect, "manual");
    assert.equal(
      options.headers.Authorization,
      "Bearer fixture-hubspot-secret",
    );
    const u = new URL(url),
      id = decodeURIComponent(u.pathname.split("/").at(-1));
    const properties = options.body
      ? JSON.parse(options.body).properties
      : null;
    requests.push({ method: options.method, id, properties });
    if (mode.permissionDenied)
      return Response.json(
        { message: "secret provider detail" },
        { status: 403 },
      );
    if (mode.rateLimited) return Response.json({}, { status: 429 });
    if (options.method === "GET") {
      const contact =
        u.searchParams.get("idProperty") === "email"
          ? [...contacts.values()].find((c) => c.properties.email === id)
          : contacts.get(id);
      if (!contact) return Response.json({}, { status: 404 });
      const copy = JSON.parse(JSON.stringify(contact));
      if (mode.readbackMismatch && !u.searchParams.has("idProperty"))
        copy.properties.firstname = "Unexpected value";
      return Response.json(copy);
    }
    if (options.method === "POST") {
      assert.deepEqual(Object.keys(properties).sort(), [
        "company",
        "email",
        "firstname",
        "lastname",
      ]);
      const created = { id: String(++serial), properties, archived: false };
      contacts.set(created.id, created);
      if (mode.timeoutAfterWrite)
        throw Error("fixture-hubspot-secret upstream private error");
      if (mode.conflictAfterWrite) return Response.json({}, { status: 409 });
      return Response.json(created, { status: 201 });
    }
    if (options.method === "PATCH") {
      assert.deepEqual(Object.keys(properties).sort(), [
        "firstname",
        "lastname",
      ]);
      const contact = contacts.get(id);
      contact.properties = { ...contact.properties, ...properties };
      return Response.json(contact);
    }
    throw Error("Unexpected provider operation");
  });
  Object.assign(s.env, {
    HUBSPOT_ACCESS_TOKEN: "fixture-hubspot-secret",
    HUBSPOT_PORTAL_ID: "149828901",
    CRM_MODE: "test-only",
  });
  return { ...s, contacts, requests, mode };
}
test("CRM requires exact write confirmation, test addresses and explicit test markers before calling HubSpot", async () => {
  const s = await crmSetup();
  for (const body of [
    { ...approvedCRM, confirmed: false },
    { ...approvedCRM, email: "customer@business.example" },
    { ...approvedCRM, lastname: "Real customer" },
    { ...approvedCRM, company: "extra field" },
    { ...approvedCRM, firstname: "<img src=x>" },
  ])
    assert.equal((await s.call("/api/crm/contacts", body)).status, 400);
  assert.equal(s.requests.length, 0);
  assert.equal(
    s.env.DB.raw.prepare("SELECT COUNT(*) n FROM executions").get().n,
    0,
  );
});
test("CRM create and retrieval verify actual provider readback; transport replay and email dedup never overwrite", async () => {
  const s = await crmSetup();
  const created = await s.call("/api/crm/contacts", approvedCRM, {
    key: "crm-create-001",
  });
  assert.equal(created.data.execution.status, "succeeded");
  assert.equal(created.data.execution.result.operation, "created");
  assert.equal(created.data.execution.result.readBackVerified, true);
  const id = created.data.execution.result.contact.id;
  assert.equal(created.data.execution.upstreamId, id);
  assert.equal(
    (await s.call("/api/crm/contacts/" + id)).data.contact.email,
    approvedCRM.email,
  );
  const replay = await s.call("/api/crm/contacts", approvedCRM, {
    key: "crm-create-001",
  });
  assert.equal(replay.data.replayed, true);
  const duplicate = await s.call("/api/crm/contacts", {
    ...approvedCRM,
    firstname: "Different",
  });
  assert.equal(duplicate.data.execution.result.operation, "existing");
  assert.equal(
    duplicate.data.execution.result.contact.firstname,
    approvedCRM.firstname,
  );
  assert.equal(s.contacts.size, 1);
  assert.equal(s.requests.filter((r) => r.method === "POST").length, 1);
  assert.equal(s.requests.filter((r) => r.method === "PATCH").length, 0);
  assert.equal(
    s.env.DB.raw.prepare("SELECT COUNT(*) n FROM budget").get().n,
    0,
  );
});
test("CRM updates only a tracked, unexpired, application-owned test contact and verifies the destination", async () => {
  const s = await crmSetup();
  const created = await s.call("/api/crm/contacts", approvedCRM);
  const id = created.data.execution.result.contact.id;
  const result = await s.call(
    `/api/crm/contacts/${id}/update`,
    { ...approvedCRM, lastname: "TEST Updated" },
    { key: "crm-update-001" },
  );
  assert.equal(result.data.execution.status, "succeeded");
  assert.equal(result.data.execution.result.operation, "updated");
  assert.equal(result.data.execution.result.contact.lastname, "TEST Updated");
  const replay = await s.call(
    `/api/crm/contacts/${id}/update`,
    { ...approvedCRM, lastname: "TEST Updated" },
    { key: "crm-update-001" },
  );
  assert.equal(replay.data.replayed, true);
  assert.equal(s.requests.filter((r) => r.method === "PATCH").length, 1);
  const before = s.requests.length;
  assert.equal((await s.call("/api/crm/contacts/999999")).status, 404);
  const unowned = await s.call("/api/crm/contacts/999999/update", approvedCRM);
  assert.equal(unowned.data.execution.status, "failed");
  assert.equal(s.requests.length, before);
});
test("CRM rejects existing unmarked contacts and does not turn a duplicate lookup into an update", async () => {
  const s = await crmSetup();
  s.contacts.set("9", {
    id: "9",
    properties: {
      email: approvedCRM.email,
      firstname: "Existing",
      lastname: "TEST Existing",
      company: "Customer company",
    },
  });
  const r = await s.call("/api/crm/contacts", approvedCRM);
  assert.equal(r.data.execution.status, "failed");
  assert.equal(r.data.execution.error.code, "crm_contact_not_owned");
  assert.equal(
    s.requests.some((r) => r.method !== "GET"),
    false,
  );
});
test("CRM ambiguous writes are uncertain, retain safe errors and never automatically retry", async () => {
  const s = await crmSetup();
  s.mode.timeoutAfterWrite = true;
  const first = await s.call("/api/crm/contacts", approvedCRM, {
    key: "crm-timeout-001",
  });
  assert.equal(first.data.execution.status, "uncertain");
  assert.ok(!JSON.stringify(first.data).includes("fixture-hubspot-secret"));
  assert.ok(!s.logs.join().includes("fixture-hubspot-secret"));
  const replay = await s.call("/api/crm/contacts", approvedCRM, {
    key: "crm-timeout-001",
  });
  assert.equal(replay.data.replayed, true);
  assert.equal(s.requests.filter((r) => r.method === "POST").length, 1);
});
test("CRM readback mismatch withholds success and retains the known upstream identifier for review", async () => {
  const s = await crmSetup();
  s.mode.readbackMismatch = true;
  const r = await s.call("/api/crm/contacts", approvedCRM);
  assert.equal(r.data.execution.status, "uncertain");
  assert.equal(r.data.execution.error.code, "crm_readback_mismatch");
  assert.equal(r.data.execution.upstreamId, "1001");
  assert.equal(r.data.execution.result, null);
});
test("CRM conflict recovery reads the destination instead of retrying a create", async () => {
  const s = await crmSetup();
  s.mode.conflictAfterWrite = true;
  const r = await s.call("/api/crm/contacts", approvedCRM);
  assert.equal(r.data.execution.status, "succeeded");
  assert.equal(r.data.execution.result.operation, "existing");
  assert.equal(s.requests.filter((r) => r.method === "POST").length, 1);
});
test("CRM inspection reports configured versus verified state without exposing account secrets", async () => {
  const s = await crmSetup();
  const before = await s.call("/api/status");
  assert.equal(before.data.crm.configured, true);
  assert.equal(before.data.crm.readVerified, false);
  assert.equal((await s.call("/api/crm/verify", {})).status, 200);
  const after = await s.call("/api/status");
  assert.equal(after.data.crm.mode, "test-only");
  assert.equal(after.data.crm.readVerified, true);
  assert.ok(!JSON.stringify(after.data).includes("fixture-hubspot-secret"));
  assert.equal(
    s.requests.some((r) => r.method !== "GET"),
    false,
  );
});
test("CRM permission and provider quota errors remain explicit and never trigger write retries", async () => {
  for (const [flag, expected] of [
    ["permissionDenied", "crm_permission_denied"],
    ["rateLimited", "crm_rate_limited"],
  ]) {
    const s = await crmSetup();
    s.mode[flag] = true;
    const r = await s.call("/api/crm/contacts", approvedCRM);
    assert.equal(r.data.execution.status, "failed");
    assert.equal(r.data.execution.error.code, expected);
    assert.equal(s.requests.length, 1);
    assert.equal(s.contacts.size, 0);
  }
});
test("CRM reads and updates reject expired ownership receipts without provider access", async () => {
  const s = await crmSetup();
  const created = await s.call("/api/crm/contacts", approvedCRM);
  const id = created.data.execution.result.contact.id;
  s.env.DB.raw
    .prepare("UPDATE executions SET expires_at=?")
    .run(Date.now() - 1);
  const before = s.requests.length;
  assert.equal((await s.call("/api/crm/contacts/" + id)).status, 404);
  const update = await s.call(`/api/crm/contacts/${id}/update`, approvedCRM);
  assert.equal(update.data.execution.status, "failed");
  assert.equal(s.requests.length, before);
});
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
  assert.equal(
    first.data.execution.result.retrievalSteps[0].toolResponse.toolType,
    "rag",
  );
  assert.ok(
    !JSON.stringify(first.data).includes("private provider trace body"),
  );
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
test("expired idempotency keys withhold retained private data and never dispatch again", async () => {
  const s = await setup();
  const question = { question: "A private expired question" };
  const key = "expired-request-001";
  const first = await s.call("/api/agent/ask", question, { key });
  s.env.DB.raw
    .prepare("UPDATE executions SET expires_at=? WHERE id=?")
    .run(Date.now() - 1, first.data.execution.id);
  assert.equal(
    (await s.call("/api/executions/" + first.data.execution.id)).status,
    404,
  );
  assert.deepEqual((await s.call("/api/executions")).data.executions, []);
  for (const body of [question, { question: "Changed input" }]) {
    const replay = await s.call("/api/agent/ask", body, { key });
    assert.equal(replay.status, 410);
    assert.equal(replay.data.error.code, "idempotency_expired");
    assert.equal(replay.data.execution, undefined);
    assert.ok(
      !JSON.stringify(replay.data).includes("private expired question"),
    );
  }
  assert.equal(s.calls(), 1);
  assert.equal(
    s.env.DB.raw.prepare("SELECT COUNT(*) n FROM executions").get().n,
    1,
  );
  assert.equal(
    s.env.DB.raw.prepare("SELECT used_centi FROM budget").get().used_centi,
    700,
  );
});
test("Make success responses are byte-bounded and oversized streams are canceled before full consumption", async () => {
  let pulls = 0,
    canceled = false;
  const s = await setup(
    async () =>
      new Response(
        new ReadableStream(
          {
            pull(controller) {
              pulls++;
              if (pulls > 2) throw Error("Read beyond safe response limit");
              controller.enqueue(new Uint8Array(600000).fill(97));
            },
            cancel() {
              canceled = true;
            },
          },
          { highWaterMark: 0 },
        ),
      ),
  );
  const r = await s.call("/api/integrations/verify", {});
  assert.equal(r.status, 502);
  assert.equal(r.data.error.code, "make_response_too_large");
  assert.equal(pulls, 2);
  assert.equal(canceled, true);
});
test("Make error bodies are canceled unread and upstream rate limits remain actionable", async () => {
  let pulls = 0,
    canceled = false;
  const s = await setup(
    async () =>
      new Response(
        new ReadableStream(
          {
            pull() {
              pulls++;
              throw Error("Provider error body must not be read");
            },
            cancel() {
              canceled = true;
            },
          },
          { highWaterMark: 0 },
        ),
        { status: 429 },
      ),
  );
  const r = await s.call("/api/integrations/verify", {});
  assert.equal(r.status, 429);
  assert.equal(r.data.error.code, "make_upstream_error");
  assert.equal(pulls, 0);
  assert.equal(canceled, true);
});
test("agent scope rejects a replaced archive document even when seven documents remain", async () => {
  const knowledge = buildKnowledge();
  let modelCalls = 0;
  const s = await setup(async (url) => {
    if (url.includes("/run?")) {
      modelCalls++;
      throw Error("Unexpected model call");
    }
    return Response.json({
      agent: {
        id: "0a8be23e-73f4-4856-9b7b-f2932f82e84a",
        name: "Make Repo Kennisagent",
        contexts: knowledge.archiveContextIds.map((id, i) => ({
          id: i === 0 ? crypto.randomUUID() : id,
        })),
        scenarios: [],
        mcpConfigs: [],
        defaultModel: "medium",
        systemPrompt: knowledge.systemPrompt,
        llmConfig: { maxTokens: 2400 },
      },
    });
  });
  const r = await s.call("/api/agent/ask", {
    question: "Current capabilities?",
  });
  assert.equal(r.data.execution.status, "failed");
  assert.equal(r.data.execution.error.code, "agent_scope_changed");
  assert.equal(modelCalls, 0);
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
  const compact = await setup();
  compact.env.DB.raw.exec(
    "INSERT INTO budget (id,used_centi,limit_centi) VALUES (1,4416,5000)",
  );
  assert.equal(
    (await compact.call("/api/agent/verify", { question: "override" })).status,
    400,
  );
  assert.equal(
    (
      await compact.call(
        "/api/agent/verify",
        {},
        { headers: { Authorization: "" } },
      )
    ).status,
    401,
  );
  const bounded = await compact.call(
    "/api/agent/verify",
    {},
    { key: "test-001" },
  );
  assert.equal(bounded.data.execution.status, "succeeded");
  assert.equal(bounded.data.execution.result.allocatedCenticredits, 500);
  assert.equal(
    bounded.data.execution.result.verificationProfile,
    "fixed-single-step",
  );
  assert.equal(
    compact.env.DB.raw.prepare("SELECT used_centi FROM budget").get()
      .used_centi,
    4916,
  );
  assert.equal(
    (await compact.call("/api/agent/verify", {}, { key: "test-001" }))
      .data.replayed,
    true,
  );
  assert.equal(
    (await compact.call("/api/agent/verify", {}, { key: "test-002" }))
      .data.execution.error.code,
    "credit_budget_exhausted",
  );
  assert.equal(compact.calls(), 1);
  assert.equal(
    (await compact.call("/api/budget/reconcile", {})).data.allocatedCredits,
    45.41,
  );
  const normal = await compact.call("/api/agent/ask", {
    question: "Normal question",
  });
  assert.equal(normal.data.execution.error.code, "credit_budget_exhausted");
  assert.equal(compact.calls(), 1);
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
        contexts: buildKnowledge().archiveContextIds.map((id) => ({ id })),
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
            contexts: buildKnowledge().archiveContextIds.map((id) => ({ id })),
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
test("binary icons survive the Worker asset pipeline with correct media types and HEAD behavior", async () => {
  const { readPublicAssets } = await import("../scripts/public-assets.mjs");
  const temporary = fs.mkdtempSync(
    require("node:path").join(require("node:os").tmpdir(), "make-asset-check-"),
  );
  try {
    fs.writeFileSync(temporary + "/.env", "private-fixture");
    fs.writeFileSync(temporary + "/debug.map", "private-fixture");
    fs.writeFileSync(temporary + "/index.html", "public");
    assert.deepEqual(Object.keys(readPublicAssets(temporary)), ["/index.html"]);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
  const { createApp } = await import("../production/src/app.js");
  const app = createApp({
    assets: readPublicAssets("production/public"),
    knowledge: buildKnowledge(),
    logger: () => {},
  });
  for (const [file, type] of [
    ["favicon.ico", "image/x-icon"],
    ["apple-touch-icon.png", "image/png"],
    ["share-preview.png", "image/png"],
  ]) {
    const r = await app(new Request("https://test.example/" + file), {});
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("content-type"), type);
    assert.deepEqual(
      Buffer.from(await r.arrayBuffer()),
      fs.readFileSync("production/public/" + file),
    );
    const head = await app(
      new Request("https://test.example/" + file, { method: "HEAD" }),
      {},
    );
    assert.equal(head.status, 200);
    assert.equal((await head.arrayBuffer()).byteLength, 0);
  }
  for (const [name, w, h] of [
    ["apple-touch-icon.png", 180, 180],
    ["icon-192.png", 192, 192],
    ["icon-512.png", 512, 512],
    ["share-preview.png", 1200, 630],
  ]) {
    const bytes = fs.readFileSync("production/public/" + name);
    assert.equal(bytes.readUInt32BE(16), w);
    assert.equal(bytes.readUInt32BE(20), h);
  }
  const icon = fs.readFileSync("production/public/favicon.ico");
  assert.equal(icon.readUInt16LE(2), 1);
  assert.equal(icon.readUInt16LE(4), 3);
  const manifest = await app(
    new Request("https://test.example/site.webmanifest"),
    {},
  );
  assert.match(
    manifest.headers.get("content-type"),
    /application\/manifest\+json/,
  );
  assert.equal((await manifest.json()).icons.length, 2);
});
test("operator backup round-trips through an isolated restore and preserves known lifetime credit usage", async () => {
  const s = await setup();
  await s.call("/api/agent/ask", { question: "Question" });
  await s.call("/api/budget/reconcile", {});
  await s.call("/api/leads/research", { domain: "cloudflare.com" });
  const r = await s.call("/api/backup");
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-disposition"), /attachment/);
  assert.equal(r.data.tables.executions.length, 2);
  assert.equal(r.data.tables.rate_limits, undefined);
  assert.ok(!JSON.stringify(r.data).includes(s.env.MAKE_API_KEY));
  assert.ok(!JSON.stringify(r.data).includes(s.env.OPERATOR_API_KEY));
  const { verifyRestore } =
    await import("../scripts/verify-production-backup.mjs");
  const restored = await verifyRestore(r.data);
  assert.equal(restored.verified, true);
  assert.equal(restored.rows.executions, 2);
  assert.equal(restored.budget.used_centi, 175);
  assert.equal(restored.budget.limit_centi, 5000);

  const { sealBackup, openBackup, readPrivateFile, writePrivateFile } =
    await import("../scripts/secure-production-backup.mjs");
  const { randomBytes } = require("node:crypto"),
    key = randomBytes(32);
  const envelope = await sealBackup(r.data, key),
    second = await sealBackup(r.data, key);
  assert.notEqual(envelope.iv, second.iv);
  assert.ok(!JSON.stringify(envelope).includes("cloudflare.com"));
  assert.equal(
    (await verifyRestore(await openBackup(envelope, key))).budget.used_centi,
    175,
  );
  await assert.rejects(openBackup(envelope, randomBytes(32)), /authentication/);
  for (const field of ["ciphertext", "iv", "tag"]) {
    const tampered = structuredClone(envelope);
    const bytes = Buffer.from(tampered[field], "base64");
    bytes[0] ^= 1;
    tampered[field] = bytes.toString("base64");
    await assert.rejects(openBackup(tampered, key), /authentication/);
  }
  await assert.rejects(
    openBackup({ ...envelope, version: 2 }, key),
    /Unsupported/,
  );
  await assert.rejects(
    openBackup({ ...envelope, tag: "AA==" }, key),
    /Unsupported/,
  );
  const dir = fs.mkdtempSync(
    require("node:path").join(
      fs.realpathSync(require("node:os").tmpdir()),
      "make-sealed-test-",
    ),
  );
  try {
    const file = dir + "/backup.json";
    writePrivateFile(file, JSON.stringify(envelope));
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.throws(() => writePrivateFile(file, "overwrite"), /EEXIST/);
    assert.equal(
      (
        await openBackup(
          JSON.parse(readPrivateFile(file, 9 * 1024 * 1024)),
          key,
        )
      ).sha256,
      r.data.sha256,
    );
    fs.symlinkSync(file, dir + "/link");
    assert.throws(() => readPrivateFile(dir + "/link", 100), /ELOOP/);
    fs.chmodSync(file, 0o644);
    assert.throws(() => readPrivateFile(file, 9 * 1024 * 1024), /owner-only/);
    fs.chmodSync(file, 0o600);
    assert.throws(() => readPrivateFile(file, 2), /size limit/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    key.fill(0);
  }
  const changed = structuredClone(r.data);
  changed.tables.budget[0].used_centi = 0;
  await assert.rejects(verifyRestore(changed), /checksum/);
});
test("backup access requires the operator role, including when a maintenance credential exists", async () => {
  const s = await setup();
  s.env.MAINTENANCE_API_KEY = "maintenance-only-key";
  for (const Authorization of ["", "Bearer maintenance-only-key"])
    assert.equal(
      (await s.call("/api/backup", undefined, { headers: { Authorization } }))
        .status,
      401,
    );
  assert.equal(s.calls(), 0);
});
