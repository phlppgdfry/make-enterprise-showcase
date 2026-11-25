import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url),
  { auth, client } = require("./make-knowledge-agent.js");
const ids = [8199349, 8199345, 8199351, 8199353, 8199357];
function walk(flow) {
  return (flow || []).flatMap((m) => [
    m,
    ...(m.routes || []).flatMap((r) => walk(r.flow)),
    ...walk(m.onerror),
  ]);
}
export function inspectBlueprint(blueprint) {
  const modules = walk(blueprint.flow);
  return modules.map((m) => ({
    id: m.id,
    module: m.module,
    ...(m.module === "datastore:AddRecord"
      ? {
          literalWriteKey:
            typeof m.mapper?.key === "string" && !m.mapper.key.includes("{{"),
        }
      : {}),
    ...(/^(slack|hubspotcrm|openai-gpt-3):/.test(m.module)
      ? {
          connectionReferencePresent:
            Number.isInteger(m.parameters?.__IMTCONN__) &&
            m.parameters.__IMTCONN__ > 0,
        }
      : {}),
    ...(m.module?.startsWith("slack:")
      ? { messagingDestinationRequiresApproval: true }
      : {}),
  }));
}
if (!process.argv.includes("--live"))
  console.log(
    JSON.stringify(
      {
        mode: "plan",
        scenarioIds: ids,
        methods: ["GET"],
        scenarioExecutions: 0,
        modelCalls: 0,
        note: "--live inspects only these existing project scenarios; it never runs, edits, activates or deletes them.",
      },
      null,
      2,
    ),
  );
else {
  try {
    const api = client(auth()),
      listed = await api("GET", "/scenarios?teamId=3365938"),
      results = [];
    for (const id of ids) {
      const scenario = (listed.scenarios || []).find((s) => s.id === id);
      if (!scenario) throw Error("Expected project scenario is unavailable");
      const r = await api("GET", `/scenarios/${id}/blueprint?draft=false`);
      let blueprint = r.blueprint || r.response?.blueprint;
      if (typeof blueprint === "string") blueprint = JSON.parse(blueprint);
      if (!blueprint?.flow?.length)
        throw Error("Project blueprint is unavailable");
      const modules = inspectBlueprint(blueprint),
        blockers = [];
      if (modules.some((m) => m.literalWriteKey))
        blockers.push(
          "Datastore write uses a literal shared key; do not dispatch test data against existing records",
        );
      if (modules.some((m) => m.connectionReferencePresent === false))
        blockers.push(
          "External module has no configured connection reference; provider health is not established",
        );
      if (modules.some((m) => m.messagingDestinationRequiresApproval))
        blockers.push(
          "Slack destination and specific message authorization are required before execution",
        );
      if (!scenario.isActive)
        blockers.push(
          "Scenario is inactive; no activation or live execution performed",
        );
      results.push({
        scenarioId: id,
        active: !!scenario.isActive,
        modules,
        executionReadiness: blockers.length ? "BLOCKED" : "UNVERIFIED",
        blockers,
      });
    }
    const report = {
      checkedAt: new Date().toISOString(),
      teamId: 3365938,
      results,
      structuralInspectionOnly: true,
      scenarioExecutions: 0,
      modelCalls: 0,
      configurationChanges: 0,
      note: "Connection references are configuration evidence, not a successful live connection test. Scenario names do not establish HMAC, DLQ, idempotency or production behavior.",
    };
    fs.writeFileSync(
      new URL("../exports/live-make-readiness.json", import.meta.url),
      JSON.stringify(report, null, 2) + "\n",
      { mode: 0o600 },
    );
    console.log(JSON.stringify(report, null, 2));
  } catch {
    console.error(
      "Read-only Make inspection failed; no scenario action was attempted.",
    );
    process.exitCode = 1;
  }
}
