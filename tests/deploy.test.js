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

test('private deployment copy is selectable without modifying public templates', async () => {
  await assert.rejects(main(['--blueprint-file=/tmp/not-used'],{}),/requires --scenario/);
  const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'make-private-plan-'));
  try {
    const copy = structuredClone(require('../blueprints/01-ai-agent-autonomous-triage/blueprint.json'));
    copy.name = 'Private configured copy';
    const file = path.join(dir,'private.json'); fs.writeFileSync(file,JSON.stringify(copy));
    await main(['--scenario=01-ai-agent-autonomous-triage','--blueprint-file='+file],{},() => {throw new Error('No network in a plan');});
    assert.notEqual(require('../blueprints/01-ai-agent-autonomous-triage/blueprint.json').name,copy.name);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
for(const failure of ['wrong-team','active','no-version','conflict','wrong-content','wrong-order','success']) test('deployment '+(failure === 'success'?'verifies a matching saved configuration':'rejects '+failure), async () => {
  const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'make-deploy-test-')); let patches=0;
  const blueprint = structuredClone(require('../blueprints/02-idempotent-webhook-dlq-engine/blueprint.json'));
  const args = ['--apply','--scenario=02-idempotent-webhook-dlq-engine','--id=123'];
  const env = {MAKE_API_KEY:'fake-test-key',MAKE_TEAM_ID:'456'};
  const request = async (url,opts) => {
    assert.equal(opts.headers.Authorization,'Token fake-test-key');
    if(opts.method === 'PATCH') {
      patches++; assert.equal(JSON.parse(opts.body).baseVersion,7);
      return new Response('{}',{status:failure === 'conflict'?409:200});
    }
    if(url.endsWith('/blueprint')) {
      const saved = structuredClone(blueprint);
      if(patches && failure === 'wrong-content') saved.flow[1].mapper.key = 'unexpected';
      if(patches && failure === 'wrong-order') saved.flow.reverse();
      return new Response(JSON.stringify({response:{blueprint:saved}}));
    }
    return new Response(JSON.stringify({response:{teamId:failure === 'wrong-team'?999:456,isActive:failure === 'active',version:failure === 'no-version'?undefined:7}}));
  };
  try {
    if(failure === 'success') await main(args,env,request,{backupDir:dir});
    else await assert.rejects(main(args,env,request,{backupDir:dir}),new RegExp({'wrong-team':'different team',active:'inactive','no-version':'concurrency',conflict:'HTTP 409','wrong-content':'differs','wrong-order':'differs'}[failure]));
    assert.equal(patches,['conflict','wrong-content','wrong-order','success'].includes(failure)?1:0);
    if(patches) {const backups=fs.readdirSync(dir);assert.equal(backups.length,1);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,backups[0]))).blueprint,blueprint);}
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
