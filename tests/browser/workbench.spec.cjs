const { test, expect } = require("@playwright/test");
// These are local browser acceptance tests with an explicit CRM provider fixture.
// They never read production credentials or call Make/HubSpot.
const contact = {
  id: "1001",
  email: "make-showcase-test-verification@example.com",
  firstname: "Make Showcase",
  lastname: "TEST Verification",
  company: "Make Enterprise Showcase - TEST",
};
const receipt = (operation = "created", override = {}) => ({
  execution: {
    id: "browser-crm-fixture",
    workflow:
      operation === "updated" ? "crm-contact-update" : "crm-contact-create",
    status: "succeeded",
    createdAt: new Date().toISOString(),
    result: {
      contact: { ...contact, ...override },
      operation,
      readBackVerified: true,
      mode: "test-only",
    },
  },
});
async function start(page) {
  await page.route("**/api/executions", (r) =>
    r.fulfill({ json: { executions: [] } }),
  );
  await page.goto("/");
  await expect(page.locator("#health")).toContainText("Healthy");
}
async function unlock(page) {
  await page
    .getByRole("textbox", { name: "Operator access key" })
    .fill("local-preview-only");
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page.locator("#access-state")).toContainText("Unlocked");
}
test("public workbench, status and diagram controls work without inference or horizontal overflow", async ({
  page,
}) => {
  const errors = [],
    calls = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.url().endsWith("/api/agent/ask")) calls.push(r.url());
  });
  await start(page);
  await expect(page).toHaveTitle(/Operations workbench/);
  await expect(page.locator("h1")).toBeVisible();
  await page
    .getByRole("button", { name: "Company research", exact: true })
    .click();
  await expect(page.locator(".flow-board")).toHaveAttribute(
    "data-flow",
    "research",
  );
  await page
    .getByRole("button", { name: "Does the demo use AI?", exact: true })
    .click();
  await expect(page.locator("#question")).toHaveValue(/LLM/);
  await page
    .getByRole("button", { name: "Refresh status", exact: true })
    .click();
  await expect(page.locator("#health")).toContainText("Healthy");
  await expect(
    page.getByRole("link", { name: "Status and remaining work", exact: true }),
  ).toHaveAttribute("href", /PRODUCTION-READINESS\.md$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(calls).toEqual([]);
  expect(errors).toEqual([]);
});
test("test writes require both explicit field confirmation and operator access", async ({
  page,
}) => {
  let writes = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/crm/contacts")) writes++;
  });
  await start(page);
  await page
    .getByRole("button", { name: "Create or find test contact", exact: true })
    .click();
  expect(writes).toBe(0);
  await page.locator("#crm-confirm").check();
  await page
    .getByRole("button", { name: "Create or find test contact", exact: true })
    .click();
  await expect(page.locator("#crm-result")).toContainText(
    "Unlock operator access",
  );
  expect(writes).toBe(0);
});
test("confirmed CRM create, readback and separate update render actual response fields", async ({
  page,
}) => {
  const writes = [];
  await page.route("**/api/crm/contacts", (r) => {
    writes.push(r.request().postDataJSON());
    return r.fulfill({ json: receipt() });
  });
  await page.route("**/api/crm/contacts/1001", (r) =>
    r.fulfill({ json: { contact, readBackVerified: true, mode: "test-only" } }),
  );
  await page.route("**/api/crm/contacts/1001/update", (r) => {
    writes.push(r.request().postDataJSON());
    return r.fulfill({
      json: receipt("updated", { lastname: "TEST Updated" }),
    });
  });
  await start(page);
  await unlock(page);
  await page.locator("#crm-confirm").check();
  await page
    .getByRole("button", { name: "Create or find test contact", exact: true })
    .click();
  await expect(page.locator("#crm-id")).toHaveValue("1001");
  await expect(page.locator("#crm-result")).toContainText(contact.email);
  await expect(page.locator("#crm-confirm")).not.toBeChecked();
  await page
    .getByRole("button", { name: "Read back contact", exact: true })
    .click();
  await expect(page.locator("#crm-result")).toContainText(
    "read back from HubSpot",
  );
  await page.locator("#crm-confirm").check();
  await page.locator("#crm-lastname").fill("TEST Updated");
  await expect(page.locator("#crm-confirm")).not.toBeChecked();
  await page.locator("#crm-confirm").check();
  await page
    .getByRole("button", { name: "Update this test contact", exact: true })
    .click();
  await expect(page.locator("#crm-result")).toContainText("TEST Updated");
  expect(writes).toHaveLength(2);
  expect(writes.every((w) => w.confirmed === true)).toBe(true);
});
test("locking aborts an in-flight CRM response and prevents a late private result", async ({
  page,
}) => {
  let release, arrived, finish;
  const requested = new Promise((resolve) => (arrived = resolve));
  const finished = new Promise((resolve) => (finish = resolve));
  await page.route("**/api/crm/contacts", async (r) => {
    arrived();
    await new Promise((resolve) => (release = resolve));
    await r.fulfill({ json: receipt() }).catch(() => {});
    finish();
  });
  await start(page);
  await unlock(page);
  await page.locator("#crm-confirm").check();
  await page
    .getByRole("button", { name: "Create or find test contact", exact: true })
    .click();
  await requested;
  await page.getByRole("button", { name: "Lock", exact: true }).click();
  release();
  await finished;
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await expect(page.locator("#access-state")).toContainText("Locked");
  await expect(page.locator("#crm-result")).toBeEmpty();
  await expect(page.locator("#crm-id")).toHaveValue("");
  await expect(page.locator("#crm-confirm")).not.toBeChecked();
});
test("provider fields are rendered as text and failed reauthentication clears CRM results", async ({
  page,
}) => {
  await page.route("**/api/crm/contacts", (r) =>
    r.fulfill({
      json: receipt("created", {
        firstname: '<img src=x onerror="window.injected=true">',
      }),
    }),
  );
  await start(page);
  await unlock(page);
  await page.locator("#crm-confirm").check();
  await page
    .getByRole("button", { name: "Create or find test contact", exact: true })
    .click();
  await expect(page.locator("#crm-result")).toContainText("<img");
  await expect(page.locator("#crm-result img")).toHaveCount(0);
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  await page.locator("#access-key").fill("invalid-key");
  await page.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(page.locator("#access-state")).toContainText("required");
  await expect(page.locator("#crm-result")).toBeEmpty();
  expect(
    await page.evaluate(() => localStorage.length + sessionStorage.length),
  ).toBe(0);
});
