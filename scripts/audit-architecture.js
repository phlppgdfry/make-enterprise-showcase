#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { validateBlueprint } = require('./validate-blueprints');
const base = path.resolve(__dirname, '../blueprints'); let failures = 0;
console.log('Static blueprint audit — not a compliance certification or production-readiness score.');
for (const dir of fs.readdirSync(base)) {
  const file = path.join(base, dir, 'blueprint.json'); if (!fs.existsSync(file)) continue;
  const raw = fs.readFileSync(file, 'utf8'); const bp = JSON.parse(raw); const nodes = validateBlueprint(bp);
  const secrets = /sk_live_[a-zA-Z0-9]{24,}|ghp_[a-zA-Z0-9]{36,}|xox[baprs]-[a-zA-Z0-9-]{20,}/.test(raw);
  if (secrets) { failures++; console.error('FAIL possible embedded secret: ' + dir); }
  const placeholders = [...new Set(raw.match(/__[A-Z_]+__|https:\/\/[^"\s]*\.invalid[^"\s]*/g) || [])];
  const external = nodes.filter(n => /http:|openai|slack|hubspot|stripe/i.test(n.module));
  console.log(dir + ': ' + nodes.length + ' nodes; ' + external.length + ' external modules; ' + placeholders.length + ' unresolved placeholders.');
  if (placeholders.length) console.log('  Configure in Make before use: ' + placeholders.join(', '));
  if (external.length) console.log('  Review authentication, timeouts, quotas and error handling in the target account.');
}
if (failures) process.exitCode = 1;
