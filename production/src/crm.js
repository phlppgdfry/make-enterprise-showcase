import { PublicError } from "./research.js";

const MARKER = "Make Enterprise Showcase - TEST";
const BASE = "https://api.hubapi.com/crm/v3/objects/contacts";
const PROPERTIES = "email,firstname,lastname,company";
const reject = (status, code, message) => {
  throw new PublicError(status, code, message);
};
export function crmConfiguration(env) {
  const configured = !!(
    env.HUBSPOT_ACCESS_TOKEN &&
    /^[0-9]{1,20}$/.test(env.HUBSPOT_PORTAL_ID || "") &&
    env.CRM_MODE === "test-only"
  );
  return {
    configured,
    provider: "HubSpot",
    mode: configured ? "test-only" : "unconfigured",
    reason: configured
      ? "Operator-confirmed, clearly marked test contacts only; no messages."
      : "HubSpot credentials, portal and approved test-only mode are required.",
  };
}
export function requireCRM(env) {
  if (!crmConfiguration(env).configured)
    reject(
      503,
      "crm_unconfigured",
      "HubSpot is not configured for approved test contact operations. No CRM record has been created.",
    );
}
export function validateContact(body, update = false) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    reject(400, "invalid_contact", "Provide a CRM request object.");
  const fields = [
    "email",
    "firstname",
    "lastname",
    "confirmed",
    ...(update ? ["id"] : []),
  ];
  if (Object.keys(body).some((k) => !fields.includes(k)))
    reject(400, "unknown_field", "Unexpected CRM request field.");
  if (body.confirmed !== true)
    reject(
      400,
      "crm_confirmation_required",
      "Explicitly confirm the exact test contact before writing to HubSpot.",
    );
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^make-showcase-test-[a-z0-9-]{1,50}@example\.com$/.test(email))
    reject(
      400,
      "crm_test_only",
      "Use a clearly marked make-showcase-test-…@example.com test address. Customer records are unavailable in this deployment.",
    );
  for (const field of ["firstname", "lastname"])
    if (
      typeof body[field] !== "string" ||
      !body[field].trim() ||
      body[field].length > 80 ||
      /[\u0000-\u001f\u007f<>]/.test(body[field])
    )
      reject(
        400,
        "invalid_contact",
        "Provide a first and last name of 1–80 plain-text characters.",
      );
  if (!body.lastname.trim().startsWith("TEST "))
    reject(
      400,
      "crm_test_only",
      "The last name must start with TEST so this record is recognizable.",
    );
  if (update && (typeof body.id !== "string" || !/^[0-9]{1,30}$/.test(body.id)))
    reject(
      400,
      "invalid_contact_id",
      "Provide the HubSpot contact ID returned by this application.",
    );
  return {
    ...(update ? { id: body.id } : {}),
    email,
    firstname: body.firstname.trim(),
    lastname: body.lastname.trim(),
    confirmed: true,
  };
}
function contactOf(raw) {
  if (
    !raw ||
    !/^[0-9]{1,30}$/.test(raw.id || "") ||
    !raw.properties ||
    raw.archived === true
  )
    reject(
      502,
      "crm_invalid_response",
      "HubSpot returned an invalid contact response.",
    );
  const properties = {};
  for (const field of ["email", "firstname", "lastname", "company"]) {
    const value = raw.properties[field];
    if (
      value !== null &&
      value !== undefined &&
      (typeof value !== "string" || value.length > 1000)
    )
      reject(
        502,
        "crm_invalid_response",
        "HubSpot returned invalid contact properties.",
      );
    properties[field] = value || "";
  }
  return { id: raw.id, ...properties };
}
function assertOwned(contact, email = contact.email) {
  if (
    contact.email.toLowerCase() !== email ||
    !/^make-showcase-test-[a-z0-9-]{1,50}@example\.com$/.test(
      contact.email.toLowerCase(),
    ) ||
    contact.company !== MARKER ||
    !contact.lastname.startsWith("TEST ")
  )
    reject(
      409,
      "crm_contact_not_owned",
      "This is not an application-marked test contact. Review the destination; the contact has been withheld.",
    );
}
function assertReadback(contact, input) {
  assertOwned(contact, input.email);
  if (
    contact.firstname !== input.firstname ||
    contact.lastname !== input.lastname
  )
    reject(
      502,
      "crm_readback_mismatch",
      "HubSpot readback differs from the approved contact. Review the destination before retrying.",
    );
}
export function hubspotClient(env, fetcher = fetch) {
  requireCRM(env);
  async function request(suffix, method = "GET", body) {
    const response = await fetcher(BASE + suffix, {
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
      headers: {
        Authorization: `Bearer ${env.HUBSPOT_ACCESS_TOKEN}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      const status = response.status;
      if (status === 404)
        reject(404, "crm_not_found", "HubSpot contact was not found.");
      if (status === 409)
        reject(
          409,
          "crm_conflict",
          "HubSpot reports a conflicting contact. Inspect the existing record.",
        );
      if (status === 429)
        reject(
          429,
          "crm_rate_limited",
          "HubSpot rate limit reached. No automatic write retry was attempted.",
        );
      if (status === 401 || status === 403)
        reject(
          503,
          "crm_permission_denied",
          "HubSpot authentication or contact permissions require operator attention.",
        );
      reject(
        502,
        "crm_upstream_error",
        "HubSpot could not complete the operation. Review the execution before retrying.",
      );
    }
    let text = "",
      bytes = 0;
    const reader = response.body?.getReader(),
      decoder = new TextDecoder();
    if (reader) {
      try {
        for (;;) {
          const next = await reader.read();
          if (next.done) break;
          bytes += next.value.byteLength;
          if (bytes > 262144)
            reject(
              502,
              "crm_response_too_large",
              "HubSpot returned an oversized response.",
            );
          text += decoder.decode(next.value, { stream: true });
        }
        text += decoder.decode();
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
    }
    try {
      return contactOf(JSON.parse(text));
    } catch (error) {
      if (error instanceof PublicError) throw error;
      reject(
        502,
        "crm_invalid_response",
        "HubSpot returned an invalid contact response.",
      );
    }
  }
  const get = async (id) => {
    const contact = await request(
      `/${encodeURIComponent(id)}?properties=${PROPERTIES}`,
    );
    if (contact.id !== id)
      reject(
        502,
        "crm_invalid_response",
        "HubSpot returned a different contact identifier.",
      );
    return contact;
  };
  const byEmail = async (email) => {
    try {
      return await request(
        `/${encodeURIComponent(email)}?idProperty=email&properties=${PROPERTIES}`,
      );
    } catch (error) {
      if (error instanceof PublicError && error.code === "crm_not_found")
        return null;
      throw error;
    }
  };
  return {
    async inspect() {
      await byEmail("make-showcase-test-connection-check@example.com");
      return {
        provider: "HubSpot",
        mode: "test-only",
        readVerified: true,
        observedAt: new Date().toISOString(),
      };
    },
    async get(id) {
      const contact = await get(id);
      assertOwned(contact);
      return contact;
    },
    async create(input, { onWrite = () => {}, onReceipt = () => {} } = {}) {
      const existing = await byEmail(input.email);
      if (existing) {
        assertOwned(existing, input.email);
        return {
          contact: existing,
          operation: "existing",
          readBackVerified: true,
          duplicate: true,
          mode: "test-only",
        };
      }
      let created;
      try {
        onWrite();
        created = await request("", "POST", {
          properties: {
            email: input.email,
            firstname: input.firstname,
            lastname: input.lastname,
            company: MARKER,
          },
        });
      } catch (error) {
        if (!(error instanceof PublicError) || error.code !== "crm_conflict")
          throw error;
        const raced = await byEmail(input.email);
        if (!raced) throw error;
        assertOwned(raced, input.email);
        return {
          contact: raced,
          operation: "existing",
          readBackVerified: true,
          duplicate: true,
          mode: "test-only",
        };
      }
      onReceipt(created.id);
      const contact = await get(created.id);
      assertReadback(contact, input);
      return {
        contact,
        operation: "created",
        readBackVerified: true,
        duplicate: false,
        mode: "test-only",
      };
    },
    async update(input, { onWrite = () => {}, onReceipt = () => {} } = {}) {
      const prior = await get(input.id);
      assertOwned(prior, input.email);
      onWrite();
      const updated = await request(
        `/${encodeURIComponent(input.id)}`,
        "PATCH",
        {
          properties: { firstname: input.firstname, lastname: input.lastname },
        },
      );
      onReceipt(updated.id);
      const contact = await get(input.id);
      assertReadback(contact, input);
      return {
        contact,
        operation: "updated",
        readBackVerified: true,
        duplicate: false,
        mode: "test-only",
      };
    },
  };
}
