"use strict";
const $ = (id) => document.getElementById(id);
let key = "",
  session = 0;
const pending = new Map(),
  requests = new Set();
const publicPaths = new Set(["/api/health", "/api/status"]);
const workflowNames = {
  "repository-agent": "Repository knowledge",
  "company-research": "Company website research",
  "crm-contact-create": "HubSpot test contact create",
  "crm-contact-update": "HubSpot test contact update",
};
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
function endSession() {
  session++;
  key = "";
  for (const controller of requests) controller.abort();
  requests.clear();
  pending.clear();
}
async function api(path, body) {
  const headers = {},
    privateRequest = !publicPaths.has(path),
    controller = new AbortController();
  if (key && privateRequest) headers.Authorization = "Bearer " + key;
  if (privateRequest) requests.add(controller);
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    if (!path.includes("/integrations/")) {
      const fingerprint = path + JSON.stringify(body);
      if (!pending.has(fingerprint))
        pending.set(fingerprint, crypto.randomUUID());
      headers["Idempotency-Key"] = pending.get(fingerprint);
    }
  }
  const timeout = setTimeout(
    () =>
      controller.abort(new DOMException("Request timed out", "TimeoutError")),
    privateRequest ? 90000 : 15000,
  );
  try {
    const r = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    let data;
    try {
      data = await r.json();
    } catch {
      throw Error("The server did not return a valid API response.");
    }
    if (!r.ok)
      throw Error(data.error?.message || `Request failed (${r.status}).`);
    if (
      data.execution &&
      ["succeeded", "failed"].includes(data.execution.status)
    )
      pending.delete(path + JSON.stringify(body));
    return data;
  } finally {
    clearTimeout(timeout);
    requests.delete(controller);
  }
}
async function status() {
  $("status-refresh").disabled = true;
  try {
    const [health, s] = await Promise.all([
      api("/api/health"),
      api("/api/status"),
    ]);
    $("health").textContent =
      health.status === "healthy" ? "Healthy · persistent" : "Unavailable";
    $("health").closest("article").dataset.state =
      health.status === "healthy" ? "ready" : "error";
    $("health-detail").textContent = "API and database responded successfully.";
    $("build").textContent = "Source " + health.sourceCommit.slice(0, 12);
    const fresh =
      s.make.observedAt &&
      Date.now() - Date.parse(s.make.observedAt) < 86400000;
    $("make-status").textContent =
      s.make.verification && fresh
        ? "Verified connection"
        : s.make.configured
          ? "Configured · check connection"
          : "Unconfigured";
    $("make-status").closest("article").dataset.state =
      fresh && s.make.verification ? "ready" : "stale";
    $("make-detail").textContent = s.make.verification
      ? `${s.make.verification.agent.knowledgeDocuments} documents · read-only · checked ${new Date(s.make.observedAt).toLocaleString()}${fresh ? "" : ". Inspect the connection to refresh."}`
      : "Actual execution requires operator access.";
    $("research-detail").textContent = s.research.allowedDomains.join(" · ");
    const crmFresh =
      s.crm.readVerified &&
      s.crm.observedAt &&
      Date.now() - Date.parse(s.crm.observedAt) < 86400000;
    $("crm-status").textContent = !s.crm.configured
      ? "Unconfigured"
      : crmFresh
        ? "HubSpot · test contacts"
        : "Configured · check connection";
    $("crm-status").closest("article").dataset.state = crmFresh
      ? "ready"
      : "stale";
    $("crm-detail").textContent =
      s.crm.reason +
      (s.crm.observedAt
        ? ` Checked ${new Date(s.crm.observedAt).toLocaleString()}.`
        : "");
    const selected = $("company").value;
    $("company").replaceChildren(
      ...s.research.allowedDomains.map((d) => new Option(d, d)),
    );
    if (s.research.allowedDomains.includes(selected))
      $("company").value = selected;
    $("service-summary").textContent =
      "Backend reachable · execution requires operator access";
    $("service-summary").parentElement.dataset.state = "ready";
  } catch (e) {
    $("health").textContent = "Unavailable";
    $("health-detail").textContent = e.message;
    $("make-status").textContent = "Unknown";
    $("service-summary").textContent =
      "Service check failed. Refresh status to try again.";
    $("service-summary").parentElement.dataset.state = "error";
  } finally {
    $("status-refresh").disabled = false;
  }
}
function downloadJSON(value, name) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2) + "\n"], {
      type: "application/json",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function renderExecution(target, execution, replayed = false) {
  target.replaceChildren();
  const state = document.createElement("p");
  const outcome = execution.result?.status;
  state.className =
    "outcome " +
    (execution.status !== "succeeded"
      ? "error"
      : outcome === "insufficient_context" || outcome === "review_required"
        ? "review"
        : "success");
  state.textContent =
    execution.status !== "succeeded"
      ? execution.status === "uncertain"
        ? "Needs execution review"
        : execution.status === "running"
          ? "Execution in progress"
          : "Execution failed"
      : outcome === "insufficient_context"
        ? "More information needed"
        : outcome === "review_required"
          ? "Human review required"
          : "Result ready";
  target.append(state);
  const id = document.createElement("p");
  id.className = "receipt-id";
  id.textContent = "Execution " + execution.id;
  target.append(id);
  if (replayed) {
    const p = document.createElement("p");
    p.className = "replay-note";
    p.textContent =
      "Existing receipt returned. This request did not start another execution.";
    target.append(p);
  }
  if (execution.error) {
    const p = document.createElement("p");
    p.textContent = execution.error.message;
    target.append(p);
    if (execution.status === "uncertain") {
      const warning = document.createElement("p");
      warning.textContent =
        "The provider may have executed this request. Refresh its record and inspect the destination before creating a new request.";
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
    note.textContent = `Knowledge snapshot ${result.sourceCommit.slice(0, 12)}. ${result.chargedCenticredits === null ? "Reported usage unavailable." : "Reported usage for this execution: " + result.chargedCenticredits / 100 + " Make credits."} Source and quote verified; review the answer for correctness.`;
    target.append(note);
  } else if (execution.workflow.startsWith("crm-contact-")) {
    renderContact(target, result);
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
  const actions = document.createElement("div");
  actions.className = "receipt-actions";
  const download = document.createElement("button");
  download.type = "button";
  download.className = "secondary";
  download.textContent = "Download execution JSON";
  download.addEventListener("click", () =>
    downloadJSON(execution, `execution-${execution.id}.json`),
  );
  actions.append(download);
  target.append(actions);
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
  const current = session;
  button.disabled = true;
  target.setAttribute("aria-busy", "true");
  message(target, "Executing against the actual upstream service…");
  try {
    const data = await api(path, body);
    if (current !== session) return;
    renderExecution(target, data.execution, data.replayed);
    await history();
    if (current === session) return data.execution;
  } catch (e) {
    if (current !== session) return;
    message(
      target,
      e.name === "TimeoutError"
        ? "Request timed out. Refresh history before retrying; the provider may have executed it."
        : e.message,
      true,
    );
  } finally {
    if (current === session) {
      button.disabled = false;
      target.removeAttribute("aria-busy");
    }
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
  const current = session;
  try {
    const data = await api("/api/executions");
    if (current !== session) return;
    const box = $("history-result");
    box.replaceChildren();
    if (!data.executions.length) {
      message(
        box,
        "No executions yet. Ask the agent or research a company to create a receipt.",
      );
      return;
    }
    const note = document.createElement("p");
    note.className = "hint";
    note.textContent = `${data.executions.length} recent execution${data.executions.length === 1 ? "" : "s"} · latest 30 records`;
    box.append(note);
    for (const e of data.executions) {
      const details = document.createElement("details");
      details.className = "execution";
      const summary = document.createElement("summary"),
        info = document.createElement("span");
      info.className = "execution-info";
      const name = document.createElement("strong");
      name.textContent = workflowNames[e.workflow] || e.workflow;
      const time = document.createElement("time");
      time.dateTime = e.createdAt;
      time.textContent = `${e.status} · ${new Date(e.createdAt).toLocaleString()}`;
      info.append(name, time);
      summary.append(info);
      details.append(summary);
      const result = document.createElement("div");
      result.className = "result";
      renderExecution(result, e);
      details.append(result);
      const raw = document.createElement("details");
      raw.className = "raw-receipt";
      const rawTitle = document.createElement("summary");
      rawTitle.textContent = "View technical JSON";
      const pre = document.createElement("pre");
      pre.textContent = JSON.stringify(e, null, 2);
      raw.append(rawTitle, pre);
      details.append(raw);
      box.append(details);
    }
  } catch (e) {
    if (current === session) message($("history-result"), e.message, true);
  }
}
$("access-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const candidate = $("access-key").value.trim();
  lockView();
  const current = session;
  key = candidate;
  $("access-key").value = "";
  const button =
    e.submitter || $("access-form").querySelector('button[type="submit"]');
  button.disabled = true;
  $("access-form").setAttribute("aria-busy", "true");
  $("access-state").textContent = "Checking access…";
  try {
    await api("/api/workflows");
    if (current !== session) return;
    $("access-state").textContent = "Unlocked for this tab";
    await history();
  } catch (e) {
    if (current !== session) return;
    key = "";
    $("access-state").textContent = e.message;
  } finally {
    if (current === session) {
      button.disabled = false;
      $("access-form").removeAttribute("aria-busy");
    }
  }
});
function lockView() {
  endSession();
  $("access-state").textContent = "Locked";
  $("access-key").value = "";
  $("access-form").removeAttribute("aria-busy");
  for (const button of document.querySelectorAll(
    "#access-form button,#ask-button,#research-button,#verify,#reconcile,#backup,#crm-form button",
  ))
    button.disabled = false;
  for (const id of [
    "agent-result",
    "research-result",
    "verify-result",
    "budget-result",
    "backup-result",
    "crm-result",
  ]) {
    $(id).replaceChildren();
    $(id).removeAttribute("aria-busy");
  }
  history();
  $("crm-id").value = "";
  $("crm-confirm").checked = false;
}
$("lock").addEventListener("click", lockView);

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
function renderContact(target, result) {
  const title = document.createElement("p");
  title.textContent =
    result.operation === "existing"
      ? "Existing test contact found; no contact was overwritten."
      : result.operation === "updated"
        ? "Test contact updated and read back."
        : "Test contact read back from HubSpot.";
  target.append(title);
  for (const field of ["id", "email", "firstname", "lastname", "company"]) {
    const line = document.createElement("p");
    line.textContent = `${field}: ${result.contact[field]}`;
    target.append(line);
  }
  const note = document.createElement("p");
  note.className = "hint";
  note.textContent =
    "Actual HubSpot test record. No message was sent. A separate confirmed update is required to change an existing contact.";
  target.append(note);
}
const crmBody = () => ({
  email: $("crm-email").value,
  firstname: $("crm-firstname").value,
  lastname: $("crm-lastname").value,
  confirmed: $("crm-confirm").checked,
});
async function writeContact(update) {
  if (!$("crm-form").reportValidity()) return;
  const id = $("crm-id").value;
  if (update && !/^[0-9]{1,30}$/.test(id)) {
    message($("crm-result"), "Create or find a test contact first.", true);
    return;
  }
  const current = session;
  const execution = await run(
    $(update ? "crm-update" : "crm-create"),
    $("crm-result"),
    update ? `/api/crm/contacts/${id}/update` : "/api/crm/contacts",
    crmBody(),
  );
  if (current !== session) return;
  $("crm-confirm").checked = false;
  if (execution?.status === "succeeded")
    $("crm-id").value = execution.result.contact.id;
}
$("crm-form").addEventListener("submit", (e) => {
  e.preventDefault();
  writeContact(false);
});
$("crm-update").addEventListener("click", () => writeContact(true));
for (const id of ["crm-email", "crm-firstname", "crm-lastname"])
  $(id).addEventListener("input", () => {
    $("crm-confirm").checked = false;
    if (id === "crm-email") $("crm-id").value = "";
  });
$("crm-read").addEventListener("click", async () => {
  const current = session,
    id = $("crm-id").value;
  if (!key || !/^[0-9]{1,30}$/.test(id)) {
    message(
      $("crm-result"),
      "Unlock access and create or find a test contact first.",
      true,
    );
    return;
  }
  try {
    const result = await api(`/api/crm/contacts/${id}`);
    if (current !== session) return;
    $("crm-result").replaceChildren();
    renderContact($("crm-result"), result);
  } catch (e) {
    if (current === session) message($("crm-result"), e.message, true);
  }
});
$("crm-verify").addEventListener("click", async () => {
  const current = session;
  if (!key) {
    message($("crm-result"), "Unlock operator access first.", true);
    return;
  }
  try {
    await api("/api/crm/verify", {});
    if (current !== session) return;
    message(
      $("crm-result"),
      "HubSpot contact read access verified. Write access is verified by an explicitly approved contact round trip.",
    );
    await status();
  } catch (e) {
    if (current === session) message($("crm-result"), e.message, true);
  }
});
$("refresh").addEventListener("click", history);
$("status-refresh").addEventListener("click", status);
$("verify").addEventListener("click", async () => {
  if (!key) {
    message($("verify-result"), "Unlock operator access first.", true);
    return;
  }
  const current = session;
  $("verify").disabled = true;
  try {
    const result = await api("/api/integrations/verify", {});
    if (current !== session) return;
    message(
      $("verify-result"),
      `${result.agent.name}: ${result.agent.knowledgeDocuments} knowledge documents; no scenario or MCP mutation tools. ${result.scenarios.length} existing scenarios inspected without executing them.`,
    );
    await status();
  } catch (e) {
    if (current === session) message($("verify-result"), e.message, true);
  } finally {
    if (current === session) $("verify").disabled = false;
  }
});
$("reconcile").addEventListener("click", async () => {
  if (!key) {
    message($("budget-result"), "Unlock operator access first.", true);
    return;
  }
  const current = session;
  $("reconcile").disabled = true;
  try {
    const b = await api("/api/budget/reconcile", {});
    if (current !== session) return;
    message(
      $("budget-result"),
      `${b.allocatedCredits} credits accounted for · ${b.remainingAllocationCredits} credits available within the unchanged ${b.approvedLimitCredits}-credit allowance. Unknown provider charges remain reserved.`,
    );
  } catch (e) {
    if (current === session) message($("budget-result"), e.message, true);
  } finally {
    if (current === session) $("reconcile").disabled = false;
  }
});
const flows = {
  agent:
    "Ask a repository question. The Make agent returns an answer whose quotations are checked against the pinned source documents.",
  research:
    "Submit an approved company domain. The backend reads its public website and saves the title, description and source evidence. Unknown facts stay unknown.",
  ledger:
    "Each execution has an ID, an outcome and a stored receipt. Inspect the result, review its sources or download the execution JSON.",
};
for (const button of document.querySelectorAll(".flow-choices button"))
  button.addEventListener("click", () => {
    document.querySelector(".flow-board").dataset.flow = button.dataset.flow;
    for (const b of document.querySelectorAll(".flow-choices button"))
      b.setAttribute("aria-pressed", String(b === button));
    $("flow-detail").textContent = flows[button.dataset.flow];
    document.querySelector(".flow-signal").setAttribute(
      "d",
      {
        agent: "M95 76H505C505 150 300 150 300 226H95",
        research: "M95 76H300C300 150 505 150 505 226H95",
        ledger: "M95 226H505",
      }[button.dataset.flow],
    );
  });
for (const button of document.querySelectorAll("[data-question]"))
  button.addEventListener("click", () => {
    $("question").value = button.dataset.question;
    $("question").focus();
  });
status();

$("backup").addEventListener("click", async () => {
  if (!key) {
    message($("backup-result"), "Unlock operator access first.", true);
    return;
  }
  const current = session;
  $("backup").disabled = true;
  try {
    const data = await api("/api/backup");
    if (current !== session) return;
    downloadJSON(
      data,
      `make-enterprise-backup-${data.createdAt.slice(0, 10)}.json`,
    );
    message(
      $("backup-result"),
      "Private backup downloaded. Its integrity and row counts can be checked with the documented local restore verifier.",
    );
  } catch (e) {
    if (current === session) message($("backup-result"), e.message, true);
  } finally {
    if (current === session) $("backup").disabled = false;
  }
});
