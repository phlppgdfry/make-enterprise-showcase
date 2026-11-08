"use strict";
const $ = (id) => document.getElementById(id);
let key = "";
const pending = new Map();
function message(target, text, error = false) {
  target.replaceChildren();
  const p = document.createElement("p");
  p.textContent = text;
  if (error) p.className = "error";
  target.append(p);
}
function link(parent, label, url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return;
  }
  if (u.protocol !== "https:") return;
  const a = document.createElement("a");
  a.href = u.href;
  a.textContent = label;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  parent.append(a);
}
async function api(path, body) {
  const headers = {};
  if (key) headers.Authorization = "Bearer " + key;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    if (!path.includes("/integrations/")) {
      const fingerprint = path + JSON.stringify(body);
      if (!pending.has(fingerprint))
        pending.set(fingerprint, crypto.randomUUID());
      headers["Idempotency-Key"] = pending.get(fingerprint);
    }
  }
  const r = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(90000),
  });
  let data;
  try {
    data = await r.json();
  } catch {
    throw Error("The server did not return a valid API response.");
  }
  if (!r.ok)
    throw Error(data.error?.message || `Request failed (${r.status}).`);
  if (data.execution && ["succeeded", "failed"].includes(data.execution.status))
    pending.delete(path + JSON.stringify(body));
  return data;
}
async function status() {
  try {
    const [health, s] = await Promise.all([
      api("/api/health"),
      api("/api/status"),
    ]);
    $("health").textContent =
      health.status === "healthy" ? "Healthy · persistent" : "Unavailable";
    $("health-detail").textContent = "API and database responded successfully.";
    $("build").textContent = "Source " + health.sourceCommit.slice(0, 12);
    $("make-status").textContent = s.make.verification
      ? "Verified connection"
      : s.make.configured
        ? "Configured · awaiting verification"
        : "Unconfigured";
    $("make-detail").textContent = s.make.verification
      ? `Seven documents · read-only · checked ${new Date(s.make.observedAt).toLocaleString()}`
      : "Actual execution requires operator access.";
    $("research-detail").textContent = s.research.allowedDomains.join(" · ");
    const selected = $("company").value;
    $("company").replaceChildren(
      ...s.research.allowedDomains.map((d) => new Option(d, d)),
    );
    if (s.research.allowedDomains.includes(selected))
      $("company").value = selected;
  } catch (e) {
    $("health").textContent = "Unavailable";
    $("health-detail").textContent = e.message;
    $("make-status").textContent = "Unknown";
  }
}
function renderExecution(target, execution) {
  target.replaceChildren();
  const state = document.createElement("p");
  state.className = execution.status === "succeeded" ? "success" : "error";
  state.textContent = `${execution.status.toUpperCase()} · ${execution.id}`;
  target.append(state);
  if (execution.error) {
    const p = document.createElement("p");
    p.textContent = execution.error.message;
    target.append(p);
    if (execution.status === "uncertain") {
      const warning = document.createElement("p");
      warning.textContent =
        "The provider may have executed this request. Refresh its record and inspect Make before creating a new request.";
      target.append(warning);
    }
    return;
  }
  const result = execution.result;
  if (!result) return;
  if (execution.workflow === "repository-agent") {
    const p = document.createElement("p");
    p.textContent = result.answer;
    target.append(p);
    for (const citation of result.citations || []) {
      const quote = document.createElement("blockquote");
      quote.textContent = citation.quote;
      target.append(quote);
      link(target, "Verified repository source ↗", citation.source);
    }
    const note = document.createElement("p");
    note.className = "hint";
    note.textContent = `${result.status} · Knowledge snapshot ${result.sourceCommit.slice(0, 12)} · ${result.chargedCenticredits === null ? "Usage unavailable" : result.chargedCenticredits / 100 + " Make credits"}. Source and quote verified; review the answer for correctness.`;
    target.append(note);
  } else {
    const title = document.createElement("p");
    title.textContent = result.title || "No title provided";
    target.append(title);
    const description = document.createElement("p");
    description.textContent = result.description || "No description provided";
    target.append(description);
    link(target, "Original company website ↗", result.source);
    const note = document.createElement("p");
    note.className = "hint";
    note.textContent = `Observed ${new Date(result.observedAt).toLocaleString()}${result.reused ? " · Existing research record reused" : ""}. ${result.limitations.join(" ")}`;
    target.append(note);
  }
}
async function run(button, target, path, body) {
  if (!key) {
    message(
      target,
      "Unlock operator access before executing a workflow.",
      true,
    );
    return;
  }
  button.disabled = true;
  target.setAttribute("aria-busy", "true");
  message(target, "Executing against the actual upstream service…");
  try {
    const data = await api(path, body);
    renderExecution(target, data.execution);
    await history();
  } catch (e) {
    message(
      target,
      e.name === "TimeoutError"
        ? "Request timed out. Refresh history before retrying; the provider may have executed it."
        : e.message,
      true,
    );
  } finally {
    button.disabled = false;
    target.removeAttribute("aria-busy");
  }
}
async function history() {
  if (!key) {
    message(
      $("history-result"),
      "Unlock operator access to view execution history.",
    );
    return;
  }
  try {
    const data = await api("/api/executions");
    const box = $("history-result");
    box.replaceChildren();
    if (!data.executions.length) {
      message(box, "No executions yet.");
      return;
    }
    for (const e of data.executions) {
      const details = document.createElement("details");
      details.className = "execution";
      const summary = document.createElement("summary");
      summary.textContent = `${e.status.toUpperCase()} · ${e.workflow} · ${new Date(e.createdAt).toLocaleString()}`;
      details.append(summary);
      const pre = document.createElement("pre");
      pre.textContent = JSON.stringify(e, null, 2);
      details.append(pre);
      box.append(details);
    }
  } catch (e) {
    message($("history-result"), e.message, true);
  }
}
$("access-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  key = $("access-key").value.trim();
  $("access-key").value = "";
  try {
    await api("/api/workflows");
    $("access-state").textContent = "Unlocked for this tab";
    await history();
  } catch (e) {
    key = "";
    $("access-state").textContent = e.message;
  }
});
$("lock").addEventListener("click", () => {
  key = "";
  pending.clear();
  $("access-state").textContent = "Locked";
  $("access-key").value = "";
  for (const id of [
    "agent-result",
    "research-result",
    "verify-result",
    "budget-result",
  ])
    $(id).replaceChildren();
  history();
});
$("agent-form").addEventListener("submit", (e) => {
  e.preventDefault();
  run($("ask-button"), $("agent-result"), "/api/agent/ask", {
    question: $("question").value,
  });
});
$("research-form").addEventListener("submit", (e) => {
  e.preventDefault();
  run($("research-button"), $("research-result"), "/api/leads/research", {
    domain: $("company").value,
  });
});
$("refresh").addEventListener("click", history);
$("verify").addEventListener("click", async () => {
  if (!key) {
    message($("verify-result"), "Unlock operator access first.", true);
    return;
  }
  $("verify").disabled = true;
  try {
    const result = await api("/api/integrations/verify", {});
    message(
      $("verify-result"),
      `${result.agent.name}: ${result.agent.knowledgeDocuments} knowledge documents; no scenario or MCP mutation tools. ${result.scenarios.length} existing scenarios inspected without executing them.`,
    );
    await status();
  } catch (e) {
    message($("verify-result"), e.message, true);
  } finally {
    $("verify").disabled = false;
  }
});
status();

$("reconcile").addEventListener("click", async () => {
  if (!key) {
    message($("budget-result"), "Unlock operator access first.", true);
    return;
  }
  $("reconcile").disabled = true;
  try {
    const b = await api("/api/budget/reconcile", {});
    message(
      $("budget-result"),
      `${b.allocatedCredits} credits accounted for · ${b.remainingAllocationCredits} credits available within the unchanged ${b.approvedLimitCredits}-credit allowance. Unknown provider charges remain reserved.`,
    );
  } catch (e) {
    message($("budget-result"), e.message, true);
  } finally {
    $("reconcile").disabled = false;
  }
});
