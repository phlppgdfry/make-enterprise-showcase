#!/usr/bin/env node
/**
 * Automated Data Store & Data Structure Provisioner for Make.com
 * Reads datastores/schemas.json and provisions them using make-cli
 */

const fs = require('fs');
const path = require('path');


const SCHEMAS_PATH = path.resolve(__dirname, '../datastores/schemas.json');
const schemas = JSON.parse(fs.readFileSync(SCHEMAS_PATH, 'utf8'));

const ZONE = process.env.MAKE_ZONE || 'eu1.make.com';
const TEAM_ID = process.env.MAKE_TEAM_ID;
const API_KEY = process.env.MAKE_API_KEY;

console.log('====================================================');
console.log('🗄️  Make.com Enterprise Data Store Provisioner');
console.log(`Target Zone: ${ZONE}`);
console.log(`Team ID:     ${TEAM_ID || '(Not provided - dry run)'}`);
console.log('====================================================\n');

if (!API_KEY || !TEAM_ID) {
  console.log('⚠️  MAKE_API_KEY or MAKE_TEAM_ID not detected in environment.');
  console.log('Displaying data store definitions that will be created:\n');

  schemas.forEach((store, idx) => {
    console.log(`${idx + 1}. [${store.name}]`);
    console.log(`   Description: ${store.description}`);
    console.log(`   Fields: ${store.spec.map(f => `${f.name} (${f.type})`).join(', ')}`);
    console.log('');
  });

  console.log('To provision these automatically to your Make account:');
  console.log('  export MAKE_API_KEY="your-token"');
  console.log('  export MAKE_TEAM_ID="your-team-id"');
  console.log('  export MAKE_ZONE="eu1.make.com"');
  console.log('  npm run setup-datastores\n');
  process.exit(0);
}

console.error('Legacy automatic provisioning is disabled: it does not apply the declared field schemas. Use reviewed migrations and the documented production deployment. No changes made.');
process.exitCode = 1;
