#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
async function main() {
  const live = process.argv.includes('--live');
  const number = process.argv.find(arg => /^[1-6]$/.test(arg));
  if (!live) { console.log('Dry run only. No requests sent. To probe one configured webhook: npm run probe -- 1 --live'); return; }
  if (!number) throw new Error('Select exactly one scenario number (1–6).');
  const url = process.env['MAKE_HOOK_0' + number];
  if (!url || !url.startsWith('https://')) throw new Error('Set an HTTPS MAKE_HOOK_0' + number + ' URL explicitly.');
  const inputFile = process.env.MAKE_PROBE_INPUT;
  if (!inputFile) throw new Error('Set MAKE_PROBE_INPUT to an explicit JSON payload file. A gateway ACK is not proof of downstream execution.');
  const body = fs.readFileSync(inputFile, 'utf8'); JSON.parse(body);
  const response = await fetch(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000), headers: { 'Content-Type': 'application/json', ...(process.env.MAKE_PROBE_TOKEN ? { Authorization: 'Bearer ' + process.env.MAKE_PROBE_TOKEN } : {}) }, body });
  console.log('HTTP ' + response.status + '. Inspect the Make execution log for business outcomes.');
  if (!response.ok) process.exitCode = 1;
}
main().catch(() => { console.error('Probe failed. Select one scenario and configure HTTPS URL, payload file and authentication.'); process.exitCode = 1; });
