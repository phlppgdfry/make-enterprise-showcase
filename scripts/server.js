#!/usr/bin/env node
'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const core = require('../docs/lib/agent-core');
const reference = require('../docs/data/reference.json');
const root = path.resolve(__dirname, '../docs');
const kinds = new Set(['support', 'knowledge', 'leads']);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8' };
function equal(a, b) {
  const left = crypto.createHash('sha256').update(a).digest();
  const right = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(left, right);
}
function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
async function readBody(req) {
  let size = 0; const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16384) { const err = new Error('Request too large'); err.status = 413; throw err; }
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new Error('Invalid JSON'); }
}
async function agentDraft(input, result, options) {
  const response = await (options.fetch || fetch)(options.agentUrl, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(12000),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + options.agentToken },
    body: JSON.stringify({ query: input.query, proposedAction: input.action || 'answer', context: result.citations, customer: result.customer || null })
  });
  if (!response.ok) throw new Error('Agent unavailable');
  // Bound bytes while receiving, rather than after buffering an unbounded response.
  const chunks = [];
  let size = 0;
  if (!response.body) throw new Error('Empty agent response');
  const reader = response.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32768) {
        await reader.cancel();
        throw new Error('Agent output too large');
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  const body = Buffer.concat(chunks).toString('utf8');
  return core.validateCandidate(JSON.parse(body), result);
}
function createServer(options = {}) {
  const apiToken = options.apiToken || '';
  const tenantId = options.tenantId || 'north';
  if (options.agentUrl) {
    const url = new URL(options.agentUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash || !options.agentToken) throw new Error('Agent needs HTTPS URL and token, without URL credentials or fragments');
  }
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'");
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (pathname === '/health' && req.method === 'GET') return send(res, 200, { status: 'ok', mode: options.agentUrl ? 'agent' : 'reference', storage: 'synthetic-fixtures' });
      if (pathname.startsWith('/api/')) {
        if (!apiToken) return send(res, 503, { error: 'Set SHOWCASE_API_TOKEN to enable the API' });
        if (!equal(req.headers.authorization || '', 'Bearer ' + apiToken)) return send(res, 401, { error: 'Unauthorized' });
        if (req.method !== 'POST') return send(res, 405, { error: 'Use POST' });
        const kind = pathname.slice(5);
        if (!kinds.has(kind)) return send(res, 404, { error: 'Unknown workflow' });
        if ((req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') return send(res, 415, { error: 'Use application/json' });
        const input = await readBody(req);
        if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid input');
        if (input.tenantId !== undefined && input.tenantId !== tenantId) return send(res, 403, { error: 'Tenant mismatch' });
        input.tenantId = tenantId; // Trusted server binding; never a model-selected argument.
        const started = performance.now();
        let result = core.run(kind, input, options.data || reference);
        if (options.agentUrl && kind !== 'leads' && result.citations.length) {
          try { result = await agentDraft(input, result, options); }
          catch {
            result = { ...result, mode: 'agent', status: 'needs_review', draft: '', escalated: true, actionExecuted: false,
              reasons: [...(result.reasons || []), 'AGENT_OUTPUT_REJECTED'],
              metrics: { ...result.metrics, modelCalls: null, agentRequests: 1 },
              trace: [...result.trace, { tool: 'agent.draft', detail: 'Provider failed or returned unverified output. Review required.' }] };
          }
        }
        return send(res, 200, { ...result, requestId: crypto.randomUUID(), durationMs: Math.round(performance.now() - started) });
      }
      if (!['GET', 'HEAD'].includes(req.method)) return send(res, 405, { error: 'Method not allowed' });
      const file = path.resolve(root, '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(root + path.sep)) return send(res, 404, { error: 'Not found' });
      const content = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
      return res.end(req.method === 'HEAD' ? undefined : content);
    } catch (err) {
      send(res, err.code === 'ENOENT' || err.code === 'EISDIR' ? 404 : err.status || 400, { error: err.code ? 'Not found' : err.message });
    }
  });
}
if (require.main === module) {
  const port = Number(process.env.PORT || 4173);
  createServer({ apiToken: process.env.SHOWCASE_API_TOKEN, tenantId: process.env.SHOWCASE_TENANT_ID,
    agentUrl: process.env.MAKE_AGENT_URL, agentToken: process.env.MAKE_AGENT_TOKEN })
    .listen(port, '127.0.0.1', () => console.log('Agent Workbench: http://127.0.0.1:' + port + ' (synthetic reference data; no external writes)'));
}
module.exports = { createServer };
