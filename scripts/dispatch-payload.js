#!/usr/bin/env node
/**
 * Enterprise Scenario Payload Dispatcher
 * Sends realistic production test payloads to live Make.com webhooks on eu1.make.com
 * 
 * Usage:
 *   node scripts/dispatch-payload.js          # Dispatches sample to all 5 scenarios
 *   node scripts/dispatch-payload.js 1        # Dispatches AI Agent VIP ticket payload
 *   node scripts/dispatch-payload.js 2        # Dispatches Stripe Idempotent Payment payload
 *   node scripts/dispatch-payload.js 3        # Dispatches CRM High-Watermark Delta Sync payload
 *   node scripts/dispatch-payload.js 4        # Dispatches ETL Rate Governor Batch payload
 *   node scripts/dispatch-payload.js 5        # Dispatches Tenant Vector Knowledge Query
 */

const https = require('https');
const crypto = require('crypto');

const SCENARIOS = {
  1: {
    id: 8199345,
    name: '01 - Autonomous Multi-Tool AI Agent & HITL',
    url: 'https://hook.eu1.make.com/3ng4qyruhzdvjcyll5bx06pt8yyjibvo',
    payload: {
      eventId: `evt_agent_${Date.now()}`,
      customerId: 'cust_enterprise_gold_902',
      customerTier: 'Enterprise VIP',
      ticketType: 'Billing & Account Dispute',
      inboundMessage: 'We were double billed for our Enterprise seat expansion ($189.50) on invoice INV-90412. Please issue an immediate refund and update our seat count.',
      amountRequested: 189.50,
      confidenceThreshold: 0.85,
      requiresHumanInTheLoop: true,
      metadata: {
        crmId: 'hubspot_deal_78102',
        sentiment: 'Urgent',
        escalationChannel: '#ops-executive-support'
      }
    }
  },
  2: {
    id: 8199349,
    name: '02 - Idempotent Ingestion & DLQ Engine',
    url: 'https://hook.eu1.make.com/evjp003di7qo8rrkuu3v1d1crsyi8srg',
    payload: {
      eventId: `evt_stripe_charge_${Math.floor(Date.now() / 1000)}`,
      idempotencyKey: `idemp_${crypto.randomBytes(8).toString('hex')}`,
      eventType: 'payment_intent.succeeded',
      livemode: true,
      data: {
        object: {
          id: `pi_${crypto.randomBytes(12).toString('hex')}`,
          amount: 49900,
          currency: 'eur',
          customer: 'cus_AcmeCorp_EU',
          receipt_email: 'billing@acmecorp.eu',
          payment_method_types: ['sepa_debit', 'card']
        }
      },
      signature: `t=${Math.floor(Date.now() / 1000)},v1=${crypto.randomBytes(32).toString('hex')}`
    }
  },
  3: {
    id: 8199351,
    name: '03 - Bi-Directional CRM & Billing Reconciliation',
    url: 'https://hook.eu1.make.com/ta9a6c4nfg7m5ux3r9zdce4jrmtahmro',
    payload: {
      reconciliationRunId: `recon_${Date.now()}`,
      syncMode: 'high_watermark_delta',
      lastWatermarkTimestamp: '2026-10-27T00:00:00Z',
      batchLimit: 25,
      primaryEntities: ['contacts', 'subscriptions', 'invoices'],
      sourceA: 'Stripe Billing (EU-West)',
      sourceB: 'HubSpot Enterprise CRM',
      digestRecipient: '#finance-reconciliation'
    }
  },
  4: {
    id: 8199353,
    name: '04 - Self-Healing ETL Pipeline & Rate Governor',
    url: 'https://hook.eu1.make.com/1rvaq9sziyyo9dlsziixyyu9dgdrjoyu',
    payload: {
      batchId: `batch_etl_${Date.now()}`,
      source: 'telemetry_stream_ingress',
      recordsCount: 4,
      tokenBucketLimit: 250,
      records: [
        { deviceId: 'gw-node-01', metric: 'cpu_load', value: 42.8, timestamp: new Date().toISOString() },
        { deviceId: 'gw-node-02', metric: 'memory_alloc', value: 78.1, timestamp: new Date().toISOString() },
        { deviceId: 'gw-node-03', metric: 'disk_io_iops', value: 1250, timestamp: new Date().toISOString() },
        { deviceId: 'gw-node-04', metric: 'network_tx_mbps', value: 94.3, timestamp: new Date().toISOString() }
      ],
      compensatingActionRequired: true
    }
  },
  5: {
    id: 8199357,
    name: '05 - Multi-Tenant Enterprise Knowledge RAG Engine',
    url: 'https://hook.eu1.make.com/vn0oi845t18ogb7kd0ghv8veczd915x8',
    payload: {
      tenantId: 'tenant_enterprise_finance_nl',
      queryId: `rag_q_${Date.now()}`,
      inboundQuery: 'What is our contractual SLA uptime requirement for European financial services customers and what is the penalty credit percentage for P1 downtime exceeding 30 minutes?',
      vectorNamespace: 'legal-contracts-eu-2026',
      topK: 5,
      temperature: 0.1,
      includeCitations: true
    }
  }
};

function dispatch(item) {
  return new Promise((resolve) => {
    const start = Date.now();
    const data = JSON.stringify(item.payload, null, 2);
    const parsedUrl = new URL(item.url);

    const req = https.request({
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-Enterprise-Source': 'Showcase-Payload-Dispatcher',
        'X-Correlation-Id': `corr_${Date.now()}`
      },
      timeout: 10000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const duration = Date.now() - start;
        resolve({
          scenario: item.name,
          scenarioId: item.id,
          httpStatus: `HTTP ${res.statusCode}`,
          latency: `${duration}ms`,
          makeResponse: body.trim() || '(Empty ACK)',
          healthy: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        scenario: item.name,
        scenarioId: item.id,
        httpStatus: 'ERROR',
        latency: `${Date.now() - start}ms`,
        makeResponse: err.message,
        healthy: false
      });
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  const arg = process.argv[2];
  console.log('================================================================');
  console.log('⚡ Make.com Enterprise Scenario Payload Dispatcher');
  console.log('Target Cluster: eu1.make.com');
  console.log('================================================================\n');

  let targets = [];
  if (arg && SCENARIOS[arg]) {
    targets = [SCENARIOS[arg]];
    console.log(`🎯 Dispatching to Scenario [${arg}]: ${targets[0].name}`);
    console.log(`📦 Payload preview:\n${JSON.stringify(targets[0].payload, null, 2)}\n`);
  } else {
    targets = Object.values(SCENARIOS);
    console.log(`🚀 Dispatching realistic enterprise payloads to all ${targets.length} scenarios...\n`);
  }

  const results = [];
  for (const target of targets) {
    const res = await dispatch(target);
    results.push(res);
  }

  console.table(results);
  const allSuccess = results.every(r => r.healthy);

  if (allSuccess) {
    console.log('\n🎉 ALL PAYLOADS DISPATCHED & ACKNOWLEDGED BY MAKE.COM CLOUD');
  } else {
    console.log('\n⚠️ Some payloads failed or timed out.');
  }
  console.log('================================================================\n');
}

main();
