#!/usr/bin/env node
/**
 * Automated E2E Synthetic Probing Suite for Live Make.com Webhooks
 * Sends real synthetic test payloads to all 5 live webhook endpoints on eu1.make.com
 */

const https = require('https');

const endpoints = [
  { id: 8199345, name: '01. AI Agent & HITL', url: 'https://hook.eu1.make.com/3ng4qyruhzdvjcyll5bx06pt8yyjibvo', payload: { query: 'Probe check tier status', customerId: 'cust_probe_01' } },
  { id: 8199349, name: '02. Idempotent Ingest & DLQ', url: 'https://hook.eu1.make.com/evjp003di7qo8rrkuu3v1d1crsyi8srg', payload: { orderId: 'ORD-PROBE', amount: 99.00 } },
  { id: 8199351, name: '03. CRM Billing Sync', url: 'https://hook.eu1.make.com/ta9a6c4nfg7m5ux3r9zdce4jrmtahmro', payload: { syncType: 'delta', limit: 10 } },
  { id: 8199353, name: '04. ETL Rate Governor', url: 'https://hook.eu1.make.com/1rvaq9sziyyo9dlsziixyyu9dgdrjoyu', payload: { batchId: 'batch_probe_88', items: [1, 2, 3] } },
  { id: 8199357, name: '05. Vector Knowledge RAG', url: 'https://hook.eu1.make.com/vn0oi845t18ogb7kd0ghv8veczd915x8', payload: { query: 'What is the enterprise SLA?', tenantId: 'tenant_probe' } }
];

console.log('================================================================');
console.log('⚡ Make.com Live E2E Synthetic Health Probe Suite');
console.log('Target Cluster: eu1.make.com');
console.log('================================================================\n');

function probeEndpoint(item) {
  return new Promise((resolve) => {
    const start = Date.now();
    const data = JSON.stringify(item.payload);
    const parsedUrl = new URL(item.url);

    const req = https.request({
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-Probe-Source': 'Enterprise-Showcase-CI'
      },
      timeout: 8000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const latency = Date.now() - start;
        resolve({
          scenario: item.name,
          scenarioId: item.id,
          statusCode: res.statusCode,
          latencyMs: `${latency}ms`,
          response: body.trim().slice(0, 30),
          status: (res.statusCode >= 200 && res.statusCode < 300) ? '🟢 HEALTHY' : '🔴 UNHEALTHY'
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        scenario: item.name,
        scenarioId: item.id,
        statusCode: 0,
        latencyMs: `${Date.now() - start}ms`,
        response: err.message,
        status: '🔴 FAILED'
      });
    });

    req.write(data);
    req.end();
  });
}

async function runProbes() {
  const results = [];
  for (const item of endpoints) {
    const res = await probeEndpoint(item);
    results.push(res);
  }

  console.table(results);
  const allHealthy = results.every(r => r.status.includes('HEALTHY'));
  console.log('\n================================================================');
  if (allHealthy) {
    console.log('🎉 ALL 5 LIVE MAKE.COM WEBHOOKS ANSWERING HEALTHY (200/Accepted)');
    console.log('================================================================\n');
    process.exit(0);
  } else {
    console.log('⚠️ Some webhooks did not answer healthy.');
    console.log('================================================================\n');
    process.exit(1);
  }
}

runProbes();
