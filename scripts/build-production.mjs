import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
const require = createRequire(import.meta.url);
const { buildKnowledge } = require("./make-knowledge-agent.js");
const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "production/dist");
fs.mkdirSync(out + "/server", { recursive: true });
const knowledge = buildKnowledge();
fs.writeFileSync(
  root + "/production/src/knowledge.generated.json",
  JSON.stringify({
    ref: knowledge.ref,
    promptSha256: createHash("sha256")
      .update(knowledge.systemPrompt)
      .digest("hex"),
    sources: knowledge.sources.map(({ url, text }) => ({ url, text })),
  }),
);
const assets = {};
for (const name of fs.readdirSync(root + "/production/public"))
  assets["/" + name] = fs.readFileSync(
    root + "/production/public/" + name,
    "utf8",
  );
fs.writeFileSync(
  root + "/production/src/assets.generated.json",
  JSON.stringify(assets),
);
const commit =
  process.env.SOURCE_COMMIT ||
  execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
await build({
  entryPoints: [root + "/production/src/worker.js"],
  outfile: out + "/server/index.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  define: { __SOURCE_COMMIT__: JSON.stringify(commit) },
  minify: true,
});
fs.mkdirSync(out + "/.openai", { recursive: true });
fs.copyFileSync(
  root + "/production/.openai/hosting.json",
  out + "/.openai/hosting.json",
);
console.log(
  "Worker built for source " + commit + "; pinned knowledge " + knowledge.ref,
);
