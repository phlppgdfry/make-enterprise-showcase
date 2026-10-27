#!/usr/bin/env node
/**
 * Automated Enterprise Make.com Deployment Engine
 * Deploys and synchronizes blueprints with your remote Make team.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Resolve Credentials
let apiKey = process.env.MAKE_API_KEY;
let zone = process.env.MAKE_ZONE || 'eu1.make.com';

const cliConfigPath = path.resolve(process.env.HOME, '.config/make-cli/config.json');
if (!apiKey && fs.existsSync(cliConfigPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(cliConfigPath, 'utf8'));
    apiKey = config.apiKey;
    zone = config.zone || zone;
  } catch (e) {}
}

console.log('======================================================');
console.log('🚀 Make.com Enterprise Scenario Deployment Engine');
console.log(`Target Zone: ${zone}`);
console.log('======================================================\n');

if (!apiKey) {
  console.error('❌ Error: No API Key found.');
  console.error('Please run "make-cli login" or set export MAKE_API_KEY="your-token"');
  process.exit(1);
}

// 2. Discover Team ID
let teamId = process.env.MAKE_TEAM_ID;
if (!teamId) {
  try {
    const orgsRaw = execSync('make-cli organizations list --output json', {
      encoding: 'utf8',
      env: { ...process.env, MAKE_API_KEY: apiKey, MAKE_ZONE: zone }
    });
    const orgs = JSON.parse(orgsRaw);
    if (orgs.length > 0 && orgs[0].teams && orgs[0].teams.length > 0) {
      teamId = orgs[0].teams[0].id;
      console.log(`✓ Automatically resolved Team ID: ${teamId} ("${orgs[0].teams[0].name}")`);
    }
  } catch (err) {
    console.warn('⚠️ Could not auto-discover team ID, falling back to default 3365938.');
    teamId = 3365938;
  }
}

// 3. Fetch Existing Scenarios to Prevent Duplicates
let existingScenarios = [];
try {
  const existingRaw = execSync(`make-cli scenarios list --team-id=${teamId} --output json`, {
    encoding: 'utf8',
    env: { ...process.env, MAKE_API_KEY: apiKey, MAKE_ZONE: zone }
  });
  existingScenarios = JSON.parse(existingRaw);
} catch (err) {
  console.warn('⚠️ Warning: Could not list existing scenarios: ' + err.message);
}

// 4. Discover and Deploy Blueprints
const BLUEPRINTS_DIR = path.resolve(__dirname, '../blueprints');
const dirs = fs.readdirSync(BLUEPRINTS_DIR).filter(d => fs.statSync(path.join(BLUEPRINTS_DIR, d)).isDirectory());

const results = [];

dirs.forEach((dir, idx) => {
  const bpPath = path.join(BLUEPRINTS_DIR, dir, 'blueprint.json');
  if (!fs.existsSync(bpPath)) return;

  const bpData = JSON.parse(fs.readFileSync(bpPath, 'utf8'));
  const scenarioName = bpData.name;

  const existing = existingScenarios.find(s => s.name === scenarioName);

  if (existing) {
    console.log(`[${idx + 1}/${dirs.length}] 🔄 Scenario already deployed: "${scenarioName}"`);
    console.log(`     -> Live ID: ${existing.id}`);
    results.push({ name: scenarioName, id: existing.id, status: 'EXISTS / LIVE' });
  } else {
    console.log(`[${idx + 1}/${dirs.length}] ⬆️  Deploying new scenario: "${scenarioName}"...`);
    try {
      const blueprintString = JSON.stringify(bpData);
      const cmd = `make-cli scenarios create --team-id=${teamId} --scheduling='{"type":"immediately"}' --blueprint='${blueprintString}' --output json`;
      const createdRaw = execSync(cmd, {
        encoding: 'utf8',
        env: { ...process.env, MAKE_API_KEY: apiKey, MAKE_ZONE: zone }
      });
      const created = JSON.parse(createdRaw);
      console.log(`     ✅ Successfully created! Live ID: ${created.id}`);
      results.push({ name: scenarioName, id: created.id, status: 'CREATED' });
    } catch (err) {
      console.error(`     ❌ Deployment failed: ${err.message}`);
      results.push({ name: scenarioName, id: null, status: 'FAILED' });
    }
  }
});

console.log('\n======================================================');
console.log('📊 Deployment Summary:');
console.table(results);
console.log(`👉 View in your Make dashboard: https://${zone}/organization/9433554/dashboard`);
console.log('======================================================');
