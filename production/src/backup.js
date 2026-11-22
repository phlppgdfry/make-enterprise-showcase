import { PublicError } from "./research.js";
export const BACKUP_TABLES = [
  "budget",
  "executions",
  "audit_events",
  "leads",
  "integration_cache",
];
const hash = async (tables) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(tables)),
      ),
    ),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
export async function exportBackup(db, sourceCommit) {
  const results = await db.batch(
    BACKUP_TABLES.map((table) =>
      db.prepare(`SELECT * FROM ${table} LIMIT 1001`),
    ),
  );
  const tables = {};
  for (let i = 0; i < BACKUP_TABLES.length; i++) {
    const rows = results[i].results;
    if (!Array.isArray(rows))
      throw new PublicError(
        500,
        "backup_failed",
        "The database did not return a complete export.",
      );
    if (rows.length > 1000)
      throw new PublicError(
        409,
        "backup_limit",
        "The export exceeds 1,000 records per table. Use an administrator-managed database export.",
      );
    tables[BACKUP_TABLES[i]] = rows;
  }
  if (new TextEncoder().encode(JSON.stringify(tables)).length > 5 * 1024 * 1024)
    throw new PublicError(
      413,
      "backup_limit",
      "The export exceeds the 5 MB limit. Use an administrator-managed export.",
    );
  return {
    format: "make-enterprise-backup",
    version: 1,
    sourceCommit,
    createdAt: new Date().toISOString(),
    tables,
    sha256: await hash(tables),
  };
}
export async function validateBackup(value) {
  if (
    !value ||
    value.format !== "make-enterprise-backup" ||
    value.version !== 1 ||
    typeof value.sourceCommit !== "string" ||
    value.sourceCommit.length > 100 ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    !value.tables ||
    Object.keys(value.tables).length !== BACKUP_TABLES.length ||
    BACKUP_TABLES.some(
      (t) => !Array.isArray(value.tables[t]) || value.tables[t].length > 1000,
    ) ||
    Object.keys(value.tables).some((t) => !BACKUP_TABLES.includes(t))
  )
    throw Error("Unsupported backup format or incomplete table set");
  for (const rows of Object.values(value.tables))
    for (const row of rows)
      if (
        !row ||
        typeof row !== "object" ||
        Array.isArray(row) ||
        Object.values(row).some(
          (v) => v !== null && !["string", "number"].includes(typeof v),
        )
      )
        throw Error("Unsupported backup row");
  if (
    typeof value.sha256 !== "string" ||
    (await hash(value.tables)) !== value.sha256
  )
    throw Error("Backup checksum mismatch");
  return value;
}
