import { readPublicAssets } from "./public-assets.mjs";
import http from "node:http";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createRequire } from "node:module";
import { createApp } from "../production/src/app.js";
const require = createRequire(import.meta.url),
  knowledge = require("./make-knowledge-agent.js").buildKnowledge();
const port = Number(process.env.SHOWCASE_PREVIEW_PORT || 4179);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw Error("SHOWCASE_PREVIEW_PORT must be an integer from 1024 to 65535");
const sqlite = new DatabaseSync(":memory:");
sqlite.exec(
  fs.readFileSync("production/drizzle/0000_cuddly_madrox.sql", "utf8"),
);
const prepare = (sql, args = []) => ({
  bind(...v) {
    return prepare(sql, v);
  },
  async first() {
    return sqlite.prepare(sql).get(...args) || null;
  },
  async all() {
    return { results: sqlite.prepare(sql).all(...args) };
  },
  async run() {
    if (/^\s*SELECT\b/i.test(sql))
      return {
        results: sqlite.prepare(sql).all(...args),
        meta: { changes: 0 },
      };
    return {
      meta: { changes: Number(sqlite.prepare(sql).run(...args).changes) },
    };
  },
});
const DB = {
  prepare,
  async batch(statements) {
    sqlite.exec("BEGIN");
    try {
      const out = [];
      for (const s of statements) out.push(await s.run());
      sqlite.exec("COMMIT");
      return out;
    } catch (e) {
      sqlite.exec("ROLLBACK");
      throw e;
    }
  },
};
const assets = readPublicAssets("production/public");
const env = {
  DB,
  OPERATOR_API_KEY: process.env.OPERATOR_API_KEY || "local-preview-only",
};
// Preview has no Make credential. Network research remains real; automated tests inject their own provider boundary.
const app = createApp({ assets, knowledge, commit: "local-preview" });
const server = http.createServer(async (req, res) => {
  try {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const r = await app(
      new Request(`http://127.0.0.1:${port}` + req.url, {
        method: req.method,
        headers: req.headers,
        ...(raw ? { body: raw } : {}),
      }),
      env,
    );
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch {
    res.writeHead(500);
    res.end("Preview failed");
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Production preview: http://127.0.0.1:${port} — local-preview-only access key; no Make model credentials.`,
  ),
);
