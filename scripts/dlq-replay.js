#!/usr/bin/env node
/**
 * Dead Letter Queue (DLQ) & Incomplete Executions Incident Replay Tool
 * 
 * Inspects poisoned or interrupted executions and replays them safely via make-cli
 */

const { execSync } = require('child_process');

const ZONE = process.env.MAKE_ZONE || 'eu1.make.com';
const TEAM_ID = process.env.MAKE_TEAM_ID || 3365938;

console.log('================================================================');
console.log('🚨 Make.com Dead Letter Queue (DLQ) & Incident Replay Utility');
console.log(`Zone: ${ZONE} | Team ID: ${TEAM_ID}`);
console.log('================================================================\n');

try {
  console.log('--> 1. Querying Incomplete Executions queue across scenarios...');
  const output = execSync(`make-cli incomplete-executions list --team-id=${TEAM_ID} --output json`, {
    encoding: 'utf8',
    env: process.env
  });

  const items = JSON.parse(output);
  if (items.length === 0) {
    console.log('✅ Clean state: 0 incomplete executions found. All pipelines running healthy!');
  } else {
    console.log(`⚠️  Found ${items.length} incomplete execution(s) pending triage:`);
    console.table(items);
  }
} catch (err) {
  console.log('ℹ️  Note: Requires authenticated session with incomplete-executions:read scope.');
  console.log('   Command: make-cli incomplete-executions list --team-id=' + TEAM_ID);
}

console.log('\n================================================================');
console.log('Incident Management Directives:');
console.log('  • Inspect error details: make-cli executions get-detail <id>');
console.log('  • Replay past bundle:    make-cli scenarios replay <scenario-id> --execution-id <id>');
console.log('================================================================');
