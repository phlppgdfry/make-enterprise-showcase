#!/usr/bin/env node
'use strict';
// Readiness plan by default. A selected, configured inactive scenario can be updated explicitly.
const fs = require('node:fs');
const path = require('node:path');
const { validateBlueprint } = require('./validate-blueprints');
const base = path.resolve(__dirname, '../blueprints');
function unresolved(bp) {
  return [...new Set(JSON.stringify(bp).match(/__[A-Z_]+__|https:\/\/[^"\s]*\.invalid[^"\s]*/g) || [])];
}
async function main(args = process.argv.slice(2), env = process.env, request = fetch) {
  const selected = args.find(a => a.startsWith('--scenario='))?.slice(11);
  const id = args.find(a => a.startsWith('--id='))?.slice(5);
  const all = fs.readdirSync(base).filter(d => fs.statSync(path.join(base, d)).isDirectory());
  if (selected && !all.includes(selected)) throw new Error('Unknown scenario directory');
  const directories = selected ? [selected] : all;
  const plans = directories.map(directory => {
    const blueprint = JSON.parse(fs.readFileSync(path.join(base, directory, 'blueprint.json'), 'utf8'));
    validateBlueprint(blueprint);
    return { directory, blueprint, unresolved: unresolved(blueprint) };
  });
  if (!args.includes('--apply')) {
    console.table(plans.map(p => ({ scenario: p.directory, state: p.unresolved.length ? 'CONFIGURATION REQUIRED' : 'REQUIRES MAKE SCHEMA / CONNECTION REVIEW', placeholders: p.unresolved.length })));
    console.log('Readiness plan only. No cloud requests or mutations. Existing scenario names do not prove synchronization.');
    return;
  }
  if (!selected || !id || !/^\d+$/.test(id)) throw new Error('Apply requires --scenario=<directory> and --id=<existing-scenario-id>');
  if (plans[0].unresolved.length) throw new Error('Resolve placeholders privately in a deployment copy before applying');
  if (!env.MAKE_API_KEY || !/^\d+$/.test(env.MAKE_TEAM_ID || '')) throw new Error('Set explicit MAKE_API_KEY and MAKE_TEAM_ID');
  const zone = env.MAKE_ZONE || 'eu1.make.com';
  if (!/^(eu[12]|us[12])\.make\.com$/.test(zone)) throw new Error('Unsupported Make zone');
  const url = 'https://' + zone + '/api/v2/scenarios/' + id;
  async function call(endpoint, options = {}) {
    const response = await request(endpoint, { redirect: 'error', signal: AbortSignal.timeout(15000), ...options,
      headers: { Authorization: 'Token ' + env.MAKE_API_KEY, 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error('Make API returned HTTP ' + response.status);
    const body = await response.json(); return body.response || body;
  }
  const detail = await call(url); const current = detail.scenario || detail;
  if (String(current.teamId) !== env.MAKE_TEAM_ID) throw new Error('Scenario belongs to a different team');
  if (current.isActive !== false) throw new Error('Only an explicitly inactive scenario can be updated');
  if (!Number.isInteger(current.version)) throw new Error('No concurrency version returned. Inspect and configure in Make instead of overwriting.');
  const previous = await call(url + '/blueprint');
  if (!previous.blueprint) throw new Error('Could not fetch the current blueprint');
  const backupDir = path.resolve(__dirname, '../exports'); fs.mkdirSync(backupDir, { recursive: true });
  const backup = path.join(backupDir, id + '-' + Date.now() + '.json');
  fs.writeFileSync(backup, JSON.stringify(previous, null, 2), { mode: 0o600 });
  await call(url, { method: 'PATCH', body: JSON.stringify({ blueprint: JSON.stringify(plans[0].blueprint), baseVersion: current.version }) });
  const saved = await call(url + '/blueprint');
  if (!saved.blueprint || saved.blueprint.name !== plans[0].blueprint.name) throw new Error('Saved blueprint could not be verified');
  console.log('Selected scenario saved inactive. Prior blueprint backed up in ignored exports/. Validate modules and run before activation.');
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { main, unresolved };
