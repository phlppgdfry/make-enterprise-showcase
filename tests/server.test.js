'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../scripts/server');
let server, base;
const payload = { query: 'P1 incident response', customerId: 'customer-north', action: 'answer' };
before(async () => { server = createServer({ apiToken: 'test-token', tenantId: 'north' }); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); base = 'http://127.0.0.1:' + server.address().port; });
after(() => new Promise(resolve => server.close(resolve)));
const post = (body, token = 'test-token', route = 'support') => fetch(base + '/api/' + route, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body) });
test('static app and shared core load with security headers', async () => {
  const response = await fetch(base); assert.equal(response.status, 200); assert.match(await response.text(), /Agent Workbench/); assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal((await fetch(base + '/lib/agent-core.js')).status, 200);
});
test('health reports fixture storage explicitly', async () => { assert.equal((await (await fetch(base + '/health')).json()).storage, 'synthetic-fixtures'); });
test('API rejects missing or wrong credentials', async () => { assert.equal((await post(payload, '')).status, 401); assert.equal((await post(payload, 'wrong')).status, 401); });
test('trusted server binding supplies tenant', async () => { const r = await post(payload); assert.equal(r.status, 200); const body = await r.json(); assert.match(body.draft, /15 minutes/); assert.ok(body.requestId); assert.equal(typeof body.durationMs, 'number'); });
test('tenant spoofing fails before retrieval', async () => { assert.equal((await post({ ...payload, tenantId: 'south' })).status, 403); });
test('malformed payload fails validation', async () => { assert.equal((await post({ ...payload, query: 0 })).status, 400); assert.equal((await post(null)).status, 400); });
test('request size is bounded', async () => { assert.equal((await post({ ...payload, query: 'x'.repeat(18000) })).status, 413); });
test('unknown API and methods return errors', async () => {
  assert.equal((await post(payload, 'test-token', 'missing')).status, 404);
  assert.equal((await fetch(base + '/api/support', { headers: { Authorization: 'Bearer test-token' } })).status, 405);
  assert.equal((await fetch(base + '/api/support', { method: 'POST', headers: { Authorization: 'Bearer test-token' }, body: '{}' })).status, 415);
});
test('static file traversal and private files stay inaccessible', async () => { for (const route of ['/..%2fpackage.json', '/%2e%2e%2fpackage.json', '/.env', '/missing']) assert.equal((await fetch(base + route)).status, 404); });
test('disabled API does not silently open access', async () => {
  const disabled = createServer(); await new Promise(resolve => disabled.listen(0, '127.0.0.1', resolve));
  try { assert.equal((await fetch('http://127.0.0.1:' + disabled.address().port + '/api/support')).status, 503); } finally { await new Promise(resolve => disabled.close(resolve)); }
});
for (const broken of ['throw', 'bad-citation', 'unavailable']) test('agent ' + broken + ' returns a review decision', async () => {
  const api = createServer({ apiToken: 'test-token', agentUrl: 'https://agent.example', agentToken: 'test-agent', fetch: async () => {
    if (broken === 'throw') throw new Error('Timeout');
    return { ok: broken !== 'unavailable', text: async () => JSON.stringify({ draft: 'Invented!', citations: [{ id: 'fake', quote: 'a fabricated source' }], escalated: false, proposedAction: 'answer' }) };
  } });
  await new Promise(resolve => api.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch('http://127.0.0.1:' + api.address().port + '/api/support', { method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const body = await response.json(); assert.equal(body.status, 'needs_review'); assert.ok(body.reasons.includes('AGENT_OUTPUT_REJECTED')); assert.equal(body.draft, ''); assert.equal(body.actionExecuted, false);
  } finally { await new Promise(resolve => api.close(resolve)); }
});
test('valid agent output is a reviewable draft and uses authenticated bounded call', async () => {
  const quote = require('../docs/data/reference.json').documents[0].text;
  const api = createServer({ apiToken: 'test-token', agentUrl: 'https://agent.example', agentToken: 'secret-test', fetch: async (url, opts) => {
    assert.equal(url, 'https://agent.example'); assert.equal(opts.redirect, 'error'); assert.equal(opts.headers.Authorization, 'Bearer secret-test'); assert.equal(JSON.parse(opts.body).context[0].id, 'sla-north-01');
    return { ok: true, text: async () => JSON.stringify({ draft: 'P1 response is within 15 minutes.', citations: [{ id: 'sla-north-01', quote }], escalated: false, proposedAction: 'answer' }) };
  } });
  await new Promise(resolve => api.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch('http://127.0.0.1:' + api.address().port + '/api/support', { method: 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const body = await response.json(); assert.equal(body.mode, 'agent'); assert.equal(body.status, 'needs_review'); assert.equal(body.metrics.modelCalls, null); assert.equal(body.metrics.agentRequests, 1);
  } finally { await new Promise(resolve => api.close(resolve)); }
});
test('agent URLs require HTTPS and a token', () => { assert.throws(() => createServer({ agentUrl: 'http://agent.example', agentToken: 'token' })); assert.throws(() => createServer({ agentUrl: 'https://agent.example' })); });
