'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('../scripts/server');
const fixtures = require('../docs/data/reference.json');

test('complete local journey: support draft, review, knowledge isolation and lead research', async () => {
  const server = createServer({apiToken:'journey-token',tenantId:'north'});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = 'http://127.0.0.1:'+server.address().port;
  async function call(kind,body) {
    const response = await fetch(base+'/api/'+kind,{method:'POST',headers:{Authorization:'Bearer journey-token','Content-Type':'application/json'},body:JSON.stringify(body)});
    assert.equal(response.status,200); return response.json();
  }
  try {
    const draft = await call('support',{query:'SLA',customerId:'customer-north'});
    assert.equal(draft.status,'draft_ready');
    assert.ok(draft.citations.every(c => fixtures.documents.some(d => d.tenantId === 'north' && d.id === c.id && d.text.includes(c.quote))));
    const review = await call('support',{query:'refund invoice',customerId:'customer-north',action:'refund',amount:2400});
    assert.equal(review.status,'needs_review'); assert.equal(review.actionExecuted,false);
    const missing = await call('knowledge',{query:'interplanetary office insurance'});
    assert.equal(missing.status,'insufficient_context'); assert.equal(missing.citations.length,0);
    const isolated = await call('knowledge',{query:'SLA'});
    assert.match(isolated.answer,/15 minutes/); assert.doesNotMatch(isolated.answer,/30 minutes/);
    const lead = await call('leads',{domain:'north-logistics.example'});
    assert.equal(lead.score,100); assert.equal(lead.status,'qualified'); assert.equal(lead.metrics.externalWrites,0);
    const research = await call('leads',{domain:'unknown.example'});
    assert.equal(research.status,'needs_research'); assert.equal(research.score,null); assert.equal(research.draft,'');
    assert.equal(new Set([draft,review,missing,isolated,lead,research].map(r => r.requestId)).size,6);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
