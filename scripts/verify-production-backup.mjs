import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import { validateBackup, BACKUP_TABLES } from "../production/src/backup.js";
export async function verifyRestore(backup) {
  await validateBackup(backup);
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(
      fs.readFileSync(
        path.resolve(
          import.meta.dirname,
          "../production/drizzle/0000_cuddly_madrox.sql",
        ),
        "utf8",
      ),
    );
    db.exec("BEGIN");
    const counts = {};
    for (const table of BACKUP_TABLES) {
      const allowed = new Set(
        db
          .prepare(`PRAGMA table_info("${table}")`)
          .all()
          .map((c) => c.name),
      );
      for (const row of backup.tables[table]) {
        const columns = Object.keys(row);
        if (!columns.length || columns.some((c) => !allowed.has(c)))
          throw Error("Backup columns do not match the supported schema");
        db.prepare(
          `INSERT INTO "${table}" (${columns.map((c) => '"' + c + '"').join(",")}) VALUES (${columns.map(() => "?").join(",")})`,
        ).run(...columns.map((c) => row[c]));
      }
      counts[table] = db
        .prepare(`SELECT COUNT(*) count FROM "${table}"`)
        .get().count;
      if (counts[table] !== backup.tables[table].length)
        throw Error("Restore row count mismatch");
    }
    db.exec("COMMIT");
    return {
      verified: true,
      mode: "isolated in-memory SQLite restore; no hosted writes",
      sourceCommit: backup.sourceCommit,
      backupCreatedAt: backup.createdAt,
      checksum: backup.sha256,
      rows: counts,
      budget:
        db
          .prepare("SELECT used_centi,limit_centi FROM budget WHERE id=1")
          .get() || null,
    };
  } finally {
    db.close();
  }
}
function parseFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) throw Error("Backup is not valid JSON");
    throw Error(
      "Backup could not be read; check the file path and permissions",
    );
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    const file = process.argv[2];
    if (!file || fs.statSync(file).size > 6 * 1024 * 1024)
      throw Error("Provide a private JSON backup of at most 6 MB");
    console.log(JSON.stringify(await verifyRestore(parseFile(file)), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
