import assert from "node:assert/strict";
const origin =
  "https://make-enterprise-workbench-phlppgdfry.kippieg.chatgpt.site";
async function read(path, init = {}) {
  const r = await fetch(origin + path, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  return r;
}
const health = await read("/api/health");
assert.equal(health.status, 200);
const data = await health.json();
assert.equal(data.status, "healthy");
assert.match(data.sourceCommit, /^[a-f0-9]{40}$/);
assert.equal(data.storage, "D1");
assert.ok(health.headers.get("x-request-id"));
const homepage = await read("/");
assert.equal(homepage.status, 200);
assert.match(await homepage.text(), /Operations workbench/);
assert.ok(
  homepage.headers.get("content-security-policy").includes("script-src 'self'"),
);
const status = await read("/api/status");
assert.equal(status.status, 200);
const integrations = await status.json();
assert.equal(integrations.crm.configured, false);
assert.equal(integrations.make.configured, true);
const unauthorized = await read("/api/agent/ask", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ question: "Unauthorized requests must not execute." }),
});
assert.equal(unauthorized.status, 401);
assert.equal((await unauthorized.json()).error.code, "unauthorized");
console.log(
  JSON.stringify({
    passed: true,
    sourceCommit: data.sourceCommit,
    checks: [
      "public HTTPS health and D1",
      "homepage and CSP",
      "accurate integration boundaries",
      "unauthorized metered execution denied",
    ],
    meteredCalls: 0,
  }),
);
