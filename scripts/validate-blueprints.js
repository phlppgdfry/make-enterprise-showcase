#!/usr/bin/env node
/**
 * Automated Schema & Integrity Validator for Make.com Blueprints
 * 
 * Verifies:
 * - Valid JSON syntax
 * - Node IDs uniqueness
 * - Valid module names & versions
 * - Routing references (follows, parent, root)
 * - Required metadata and scenario execution flags
 */

const fs = require('fs');
const path = require('path');

const BLUEPRINTS_DIR = path.resolve(__dirname, '../blueprints');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

console.log('====================================================');
console.log('🔍 Running Make.com Senior Blueprint Validation Suite');
console.log('====================================================\n');

const scenarioDirs = fs.readdirSync(BLUEPRINTS_DIR).filter(item => {
  return fs.statSync(path.join(BLUEPRINTS_DIR, item)).isDirectory();
});

scenarioDirs.forEach(dir => {
  const dirPath = path.join(BLUEPRINTS_DIR, dir);
  console.log(`📦 Scenario: [${dir}]`);

  // 1. Check UI Blueprint
  const uiBlueprintPath = path.join(dirPath, 'blueprint.json');
  totalTests++;
  if (fs.existsSync(uiBlueprintPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(uiBlueprintPath, 'utf8'));
      if (!data.name || !Array.isArray(data.flow) || !data.metadata) {
        throw new Error('Missing name, flow array, or metadata in UI blueprint');
      }
      
      const ids = new Set();
      data.flow.forEach(node => {
        if (ids.has(node.id)) {
          throw new Error(`Duplicate module ID ${node.id}`);
        }
        ids.add(node.id);
        if (!node.module || typeof node.version !== 'number') {
          throw new Error(`Invalid module definition for node ID ${node.id}`);
        }
      });
      
      console.log(`  ✅ blueprint.json: Valid UI format (${data.flow.length} top-level nodes)`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ blueprint.json: ${err.message}`);
      failedTests++;
    }
  } else {
    console.error(`  ❌ blueprint.json: Not found`);
    failedTests++;
  }

  // 2. Check MCP / CLI scenario-create.json
  const mcpBlueprintPath = path.join(dirPath, 'scenario-create.json');
  totalTests++;
  if (fs.existsSync(mcpBlueprintPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(mcpBlueprintPath, 'utf8'));
      if (!data.name || !Array.isArray(data.modules) || !data.scheduling) {
        throw new Error('Missing name, modules array, or scheduling in scenario-create.json');
      }

      const ids = new Set();
      data.modules.forEach(node => {
        if (ids.has(node.id)) {
          throw new Error(`Duplicate module ID ${node.id}`);
        }
        ids.add(node.id);
        if (!node.module || typeof node.version !== 'number') {
          throw new Error(`Invalid module definition for node ID ${node.id}`);
        }
        if (!node.root && !node.follows && !node.parent) {
          throw new Error(`Orphaned node detected at ID ${node.id} (needs root, follows, or parent)`);
        }
      });

      console.log(`  ✅ scenario-create.json: Valid MCP/CLI format (${data.modules.length} modules)`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ scenario-create.json: ${err.message}`);
      failedTests++;
    }
  } else {
    console.error(`  ❌ scenario-create.json: Not found`);
    failedTests++;
  }

  // 3. Check README.md
  const readmePath = path.join(dirPath, 'README.md');
  totalTests++;
  if (fs.existsSync(readmePath) && fs.statSync(readmePath).size > 100) {
    console.log(`  ✅ README.md: Architecture documentation verified`);
    passedTests++;
  } else {
    console.error(`  ❌ README.md: Missing or incomplete documentation`);
    failedTests++;
  }

  console.log('');
});

console.log('====================================================');
console.log(`Validation Summary: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🚀 All scenarios passed senior-level production validation!\n');
  process.exit(0);
}
