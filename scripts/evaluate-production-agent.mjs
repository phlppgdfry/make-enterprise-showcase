import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const cases = require("../agents/repository/acceptance-cases.json");
const { buildKnowledge, validateAnswer } = require("./make-knowledge-agent.js");
const { evaluate } = require("./evaluate-make-agent.js");
const origin =
  "https://make-enterprise-workbench-phlppgdfry.kippieg.chatgpt.site";
const onlyCase = process.argv
  .find((arg) => arg.startsWith("--case="))
  ?.slice(7);
const selectedCases = onlyCase
  ? cases.filter((test) => test.id === onlyCase)
  : cases;
if (!selectedCases.length) throw Error("Unknown acceptance case");
if (!process.argv.includes("--live")) {
  console.log(
    JSON.stringify(
      {
        mode: "plan",
        cases: selectedCases,
        note: "No model calls. --live uses the authenticated backend, its unchanged 50-credit ledger and stable per-case idempotency keys.",
      },
      null,
      2,
    ),
  );
} else {
  const knowledge = buildKnowledge();
  const key = fs
    .readFileSync(
      path.resolve(
        import.meta.dirname,
        "../exports/production-operator-key.txt",
      ),
      "utf8",
    )
    .trim();
  const report = {
    verifiedAt: new Date().toISOString(),
    archiveCommit: knowledge.ref,
    currentSourceCommit: knowledge.currentRef,
    results: [],
    meteredRequestsStarted: 0,
  };
  const file = path.resolve(
    import.meta.dirname,
    `../exports/current-agent-acceptance${onlyCase ? "-" + onlyCase : ""}.json`,
  );
  const call = async (route, body, idempotency) => {
    const response = await fetch(origin + route, {
      method: body === undefined ? "GET" : "POST",
      redirect: "error",
      signal: AbortSignal.timeout(90000),
      headers: {
        Authorization: `Bearer ${key}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(idempotency ? { "Idempotency-Key": idempotency } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const value = await response.json();
    if (!response.ok)
      throw Error(
        `Production API ${response.status}: ${value.error?.code || "request_failed"}`,
      );
    return value;
  };
  const save = () =>
    fs.writeFileSync(file, JSON.stringify(report, null, 2) + "\n", {
      mode: 0o600,
    });
  try {
    const health = await call("/api/health");
    if (health.knowledgeCommit !== (knowledge.currentRef || knowledge.ref))
      throw Error(
        "Deployed knowledge version does not match the local reviewed catalog",
      );
    report.runtimeCommit = health.sourceCommit;
    await call("/api/integrations/verify", {});
    report.startingLedger = await call("/api/budget/reconcile", {});
    const signature = crypto
      .createHash("sha256")
      .update(knowledge.systemPrompt)
      .digest("hex")
      .slice(0, 12);
    for (const test of selectedCases) {
      const before = await call("/api/budget/reconcile", {});
      // The backend enforces allocation before dispatch and also permits cost-free idempotent replays.
      const response = await call(
        "/api/agent/ask",
        { question: test.question },
        `acceptance-${signature}-${test.id}`,
      );
      const e = response.execution;
      if (e.status !== "succeeded") {
        report.results.push({
          ...test,
          passed: false,
          executionId: e.id,
          iterationId: e.upstreamId,
          chargedCenticredits: e.chargedCenticredits,
          replayed: !!response.replayed,
          status: e.status,
          error: e.error,
        });
        if (!response.replayed && (e.upstreamId || e.chargedCenticredits != null)) report.meteredRequestsStarted++;
        report.finalLedger = await call("/api/budget/reconcile", {});
        save();
        throw Error(
          "Agent execution failed; review its receipt before retrying",
        );
      }
      const answer = {
        status: e.result.status,
        answer: e.result.answer,
        citations: e.result.citations,
      };
      validateAnswer(answer, knowledge, { question: test.question });
      const passed = evaluate(test, answer, e.result);
      if (!response.replayed) report.meteredRequestsStarted++;
      report.results.push({
        ...test,
        passed,
        executionId: e.id,
        iterationId: e.upstreamId,
        replayed: !!response.replayed,
        chargedCenticredits: e.chargedCenticredits,
        ...answer,
        retrievalSteps: e.result.retrievalSteps || [],
      });
      report.finalLedger = await call("/api/budget/reconcile", {});
      save();
      console.log(`${passed ? "PASS" : "FAIL"} ${test.id}`);
    }
    report.verifiedAt = new Date().toISOString();
    save();
    if (report.results.some((r) => !r.passed)) process.exitCode = 1;
    console.log(
      JSON.stringify({
        passed: report.results.filter((r) => r.passed).length,
        total: selectedCases.length,
        meteredRequestsStarted: report.meteredRequestsStarted,
        ledger: report.finalLedger,
      }),
    );
  } catch (error) {
    report.failure = String(error.message).split(key).join("[redacted]");
    save();
    console.error(report.failure);
    process.exitCode = 1;
  }
}
