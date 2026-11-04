#!/usr/bin/env node
'use strict';
const { run } = require('../docs/lib/agent-core');
const data = require('../docs/data/reference.json');
console.log('Executable fixture workflows. No cloud, model, CRM or messaging calls.');
for (const [kind, input] of [
  ['support', { tenantId: 'north', customerId: 'customer-north', query: 'P1 incident response', action: 'answer' }],
  ['support', { tenantId: 'north', customerId: 'customer-north', query: 'Please refund invoice', action: 'refund', amount: 2400 }],
  ['knowledge', { tenantId: 'south', query: 'P1 incident response' }],
  ['knowledge', { tenantId: 'north', query: 'Office lunch menu' }],
  ['leads', { tenantId: 'north', domain: 'north-logistics.example' }],
  ['leads', { tenantId: 'north', domain: 'unknown.example' }]
]) {
  const result = run(kind, input, data);
  console.log('\n' + kind + ': ' + result.status);
  console.log(result.trace.map(t => '  ' + t.tool + ': ' + t.detail).join('\n'));
}
