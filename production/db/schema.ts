import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const executions = sqliteTable(
  "executions",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    workflow: text("workflow").notNull(),
    key: text("idempotency_key").notNull(),
    hash: text("request_hash").notNull(),
    status: text("status").notNull(),
    input: text("input_json").notNull(),
    result: text("result_json"),
    error: text("error_json"),
    created: integer("created_at").notNull(),
    updated: integer("updated_at").notNull(),
    expires: integer("expires_at").notNull(),
    reserved: integer("reserved_centi").notNull().default(0),
    charged: integer("charged_centi"),
    upstreamId: text("upstream_id"),
  },
  (t) => [
    uniqueIndex("execution_idempotency").on(t.owner, t.workflow, t.key),
    index("execution_owner_created").on(t.owner, t.created),
    index("execution_expiry").on(t.expires),
  ],
);
export const budget = sqliteTable("budget", {
  id: integer("id").primaryKey(),
  used: integer("used_centi").notNull().default(0),
  reserved: integer("reserved_centi").notNull().default(0),
  limit: integer("limit_centi").notNull().default(5000),
});
export const limits = sqliteTable(
  "rate_limits",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull(),
    reset: integer("reset_at").notNull(),
  },
  (t) => [index("rate_expiry").on(t.reset)],
);
export const audit = sqliteTable(
  "audit_events",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id").notNull(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    outcome: text("outcome").notNull(),
    executionId: text("execution_id"),
    created: integer("created_at").notNull(),
    expires: integer("expires_at").notNull(),
  },
  (t) => [index("audit_expiry").on(t.expires)],
);
export const cache = sqliteTable("integration_cache", {
  name: text("name").primaryKey(),
  value: text("value_json").notNull(),
  observed: integer("observed_at").notNull(),
});
export const leads = sqliteTable(
  "leads",
  {
    id: text("id").primaryKey(),
    domain: text("domain").notNull(),
    sourceUrl: text("source_url").notNull(),
    data: text("data_json").notNull(),
    digest: text("digest").notNull(),
    observed: integer("observed_at").notNull(),
    expires: integer("expires_at").notNull(),
  },
  (t) => [
    uniqueIndex("lead_domain").on(t.domain),
    index("lead_expiry").on(t.expires),
  ],
);
