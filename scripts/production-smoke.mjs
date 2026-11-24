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
assert.equal(typeof integrations.crm.configured, "boolean");
assert.equal(
  integrations.crm.mode,
  integrations.crm.configured ? "test-only" : "unconfigured",
);
assert.equal(integrations.make.configured, true);
for (const [path, mediaType, signature] of [
  ["/favicon.svg", "image/svg+xml", "<svg"],
  ["/favicon.ico", "image/x-icon", null],
  ["/apple-touch-icon.png", "image/png", null],
  ["/share-preview.png", "image/png", null],
]) {
  const asset = await read(path);
  assert.equal(asset.status, 200, path);
  assert.ok(asset.headers.get("content-type")?.startsWith(mediaType), path);
  const bytes = new Uint8Array(await asset.arrayBuffer());
  if (signature) assert.ok(new TextDecoder().decode(bytes).includes(signature));
  else if (mediaType === "image/png")
    assert.deepEqual([...bytes.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  else assert.deepEqual([...bytes.slice(0, 4)], [0, 0, 1, 0]);
}
const manifest = await read("/site.webmanifest");
assert.equal(manifest.status, 200);
assert.ok((await manifest.json()).icons.length >= 2);
for (const path of ["/api/backup", "/api/executions", "/api/workflows"]) {
  const privateRead = await read(path);
  assert.equal(privateRead.status, 401, path);
  assert.equal((await privateRead.json()).error.code, "unauthorized");
}
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
      "favicon, touch icon, share image and manifest",
      "private backup, history and workflow catalog denied anonymously",
      "unauthorized metered execution denied",
    ],
    meteredCalls: 0,
  }),
);
