import fs from "node:fs";
import path from "node:path";
import { readPrivateFile } from "./secure-production-backup.mjs";
const origin =
  "https://make-enterprise-workbench-phlppgdfry.kippieg.chatgpt.site";
if (!process.argv.includes("--live")) {
  console.log(
    JSON.stringify(
      {
        mode: "plan",
        endpoint: "POST /api/agent/verify",
        question: "Fixed HubSpot restriction question",
        reservationCredits: 5,
        maxOutputTokens: 1200,
        maxModelSteps: 1,
        approvedLifetimeAllowance: 50,
        note: "No API request or model call. --live uses the operator key file and durable per-runtime idempotency.",
      },
      null,
      2,
    ),
  );
} else {
  let key = "";
  try {
    key = readPrivateFile(
      path.resolve(
        import.meta.dirname,
        "../exports/production-operator-key.txt",
      ),
      512,
    )
      .toString("utf8")
      .trim();
    const call = async (route, body, idempotency) => {
      const r = await fetch(origin + route, {
        method: body === undefined ? "GET" : "POST",
        redirect: "error",
        signal: AbortSignal.timeout(65000),
        headers: {
          Authorization: "Bearer " + key,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(idempotency ? { "Idempotency-Key": idempotency } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const data = await r.json();
      if (!r.ok)
        throw Error(
          "API " + r.status + ": " + (data.error?.code || "request_failed"),
        );
      return data;
    };
    const health = await call("/api/health");
    if (
      health.status !== "healthy" ||
      !/^[a-f0-9]{40}$/.test(health.sourceCommit)
    )
      throw Error("Unhealthy release");
    const before = await call("/api/budget/reconcile", {});
    if (before.approvedLimitCredits !== 50)
      throw Error("Unexpected verification allowance");
    const result = await call(
      "/api/agent/verify",
      {},
      "bounded-release-" + health.sourceCommit,
    );
    const after = await call("/api/budget/reconcile", {});
    const receipt = {
      checkedAt: new Date().toISOString(),
      runtimeCommit: health.sourceCommit,
      knowledgeCommit: health.knowledgeCommit,
      startingLedger: before,
      finalLedger: after,
      replayed: !!result.replayed,
      execution: result.execution,
      modelCallsStarted: result.replayed
        ? 0
        : result.execution.upstreamId
          ? 1
          : 0,
      automaticRetries: 0,
      scenarioExecutions: 0,
      customerWrites: 0,
    };
    fs.writeFileSync(
      path.resolve(
        import.meta.dirname,
        "../exports/bounded-agent-verification.json",
      ),
      JSON.stringify(receipt, null, 2) + "\n",
      { mode: 0o600 },
    );
    if (result.execution.status !== "succeeded")
      throw Error(
        "Bounded probe did not succeed: " + result.execution.error?.code,
      );
    const a = result.execution.result;
    if (
      a.status !== "answered" ||
      !a.citations?.length ||
      !/test/i.test(a.answer) ||
      !/operator|bevestig|toestemming/i.test(a.answer)
    )
      throw Error("Probe failed independent behavior checks");
    if (after.allocatedCredits > 50)
      throw Error(
        "Actual reported usage exceeded allowance; no further dispatch allowed",
      );
    console.log(JSON.stringify({ passed: true, ...receipt }, null, 2));
  } catch (e) {
    console.error(
      String(e.message)
        .split(key || "\0")
        .join("[redacted]"),
    );
    process.exitCode = 1;
  }
}
