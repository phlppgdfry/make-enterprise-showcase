import assert from "node:assert/strict";
const secret = process.env.SHOWCASE_MAINTENANCE_KEY;
assert.ok(secret, "A dedicated maintenance secret must be configured.");
const response = await fetch(
  "https://make-enterprise-workbench-phlppgdfry.kippieg.chatgpt.site/api/maintenance/retention",
  {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(30000),
    headers: {
      Authorization: "Bearer " + secret,
      "Content-Type": "application/json",
    },
    body: "{}",
  },
);
assert.equal(
  response.status,
  200,
  "Retention API did not authorize/complete maintenance.",
);
const result = await response.json();
assert.equal(result.purged, true);
assert.equal(result.budgetPreserved, true);
console.log(
  JSON.stringify({
    retentionCompleted: true,
    retentionDays: result.retentionDays,
    budgetPreserved: true,
    requestId: response.headers.get("x-request-id"),
  }),
);
