#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
function nodesOf(flow) {
  return flow.flatMap(node => [node, ...(node.routes || []).flatMap(route => nodesOf(route.flow || [])), ...nodesOf(node.onerror || node.errorHandler || [])]);
}
function validateBlueprint(bp) {
  if (!bp.name || !Array.isArray(bp.flow) || !bp.flow.length || !bp.metadata) throw new Error('Missing name, nonempty flow or metadata');
  const nodes = nodesOf(bp.flow); const ids = new Set();
  for (const n of nodes) {
    if (!Number.isInteger(n.id) || ids.has(n.id)) throw new Error('Invalid or duplicate node ID ' + n.id);
    ids.add(n.id);
    if (!n.module || !Number.isInteger(n.version) || n.version < 1) throw new Error('Invalid module at ' + n.id);
  }
  for (const n of nodes) {
    for (const match of JSON.stringify(n).matchAll(/\{\{\s*(\d+)\./g)) if (!ids.has(Number(match[1]))) throw new Error('Dangling mapping to ' + match[1]);
  }
  return nodes;
}
function validateManifest(manifest) {
  if (!manifest.name || !Array.isArray(manifest.modules) || !manifest.modules.length || !manifest.scheduling) throw new Error('Invalid manifest');
  const nodes = manifest.modules; const ids = new Set();
  for (const n of nodes) { if (!Number.isInteger(n.id) || ids.has(n.id)) throw new Error('Invalid or duplicate manifest ID'); ids.add(n.id); if (!n.module || !Number.isInteger(n.version)) throw new Error('Invalid manifest module'); }
  if (nodes.filter(n => n.root).length !== 1) throw new Error('Expected one root');
  for (const n of nodes) {
    if (!n.root && !n.follows && !n.parent) throw new Error('Orphaned module ' + n.id);
    const parent = n.follows || (n.parent && n.parent.moduleId);
    if (parent && (!ids.has(parent) || parent === n.id)) throw new Error('Invalid parent at ' + n.id);
    const seen = new Set([n.id]); let cursor = n;
    while (cursor.follows || cursor.parent) { const id = cursor.follows || cursor.parent.moduleId; if (seen.has(id)) throw new Error('Cycle at ' + id); seen.add(id); cursor = nodes.find(item => item.id === id); if (!cursor) throw new Error('Missing parent'); }
  }
  return nodes;
}
function main() {
  const base = path.resolve(__dirname, '../blueprints'); let failures = 0;
  for (const directory of fs.readdirSync(base).filter(d => fs.statSync(path.join(base, d)).isDirectory())) {
    try {
      const read = name => JSON.parse(fs.readFileSync(path.join(base, directory, name), 'utf8'));
      const bp = read('blueprint.json'); const nodes = validateBlueprint(bp); const flat = validateManifest(read('scenario-create.json'));
      if (/^(01|05|06)-/.test(directory)) {
        if (nodes.length !== flat.length || nodes.some((n, index) => n.id !== flat[index].id || n.module !== flat[index].module || JSON.stringify(n.mapper) !== JSON.stringify(flat[index].config.mapper) || JSON.stringify(n.parameters) !== JSON.stringify(flat[index].config.parameters))) throw new Error('Blueprint / manifest parity failure');
        if (nodes.some(n => JSON.stringify(n.filter || {}).includes('text:contains'))) throw new Error('Unsafe text-based policy filter');
      }
      if (fs.readFileSync(path.join(base, directory, 'README.md'), 'utf8').length < 100) throw new Error('Missing configuration documentation');
      console.log('PASS ' + directory + ' (' + nodes.length + ' nodes, structural checks only)');
    } catch (error) { failures++; console.error('FAIL ' + directory + ': ' + error.message); }
  }
  console.log('Local structure and references checked. Make module schemas, credentials and cloud execution are not validated here.');
  if (failures) process.exitCode = 1;
}
if (require.main === module) main();
module.exports = { validateBlueprint, validateManifest };
