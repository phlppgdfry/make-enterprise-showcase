'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {main,unresolved} = require('../scripts/deploy');
test('deployment defaults to an offline plan', async () => { await main([], {}, () => { throw new Error('Unexpected network request'); }); });
test('selected deployment requires explicit ID and resolved placeholders', async () => {
  await assert.rejects(main(['--apply'], {}), /requires/);
  await assert.rejects(main(['--apply','--scenario=01-ai-agent-autonomous-triage','--id=1'], {}), /placeholders/);
});
test('deployment cannot select paths outside the blueprint catalog', async () => { await assert.rejects(main(['--scenario=../../secrets'], {}), /Unknown/); });
test('unresolved URL and schema placeholders are detected', () => { assert.equal(unresolved({url:'https://gateway.example.invalid/api/support',type:'__REQUEST_DATA_STRUCTURE_ID__'}).length,2); });

test('shell wrapper forwards explicit apply arguments and reports missing selection', () => {
  const {spawnSync} = require('node:child_process');
  const path = require('node:path');
  const result = spawnSync('bash', [path.resolve(__dirname, '../scripts/make-deploy.sh'), '--apply'], {encoding:'utf8'});
  assert.equal(result.status, 1); assert.match(result.stderr, /Apply requires/);
});
