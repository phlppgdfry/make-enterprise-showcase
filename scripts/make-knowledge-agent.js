#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const definition = require('../agents/repository/sources.json');
const parser = require('../agents/repository/output.make.json');
const stateFile = path.join(root, 'exports/repository-agent-state.json');
function buildKnowledge(ref = definition.sourceCommit || execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim()) {
  if (!/^[a-f0-9]{40}$/.test(ref)) throw new Error('Use a full source commit SHA');
  const sources = definition.sources.map(source => {
    const text = execFileSync('git', ['show', ref + ':' + source.path], {cwd: root, encoding: 'utf8'});
    const url = 'https://github.com/' + definition.repository + '/blob/' + ref + '/' + source.path;
    return {...source, text, url, sha256: crypto.createHash('sha256').update(text).digest('hex')};
  });
  const instructions = fs.readFileSync(path.join(root, 'agents/repository/instructions.md'), 'utf8');
  const catalog = sources.map(s => s.id + ': ' + s.url + ' — ' + s.description).join('\n');
  const byId = id => sources.find(source => source.id === id);
  const row = (id, heading, column) => {
    const line = byId(id).text.split('\n').find(line => line.startsWith('| ' + heading + ' |'));
    if (!line) throw new Error('Missing verified knowledge table row: ' + heading);
    return line.split('|')[column].trim();
  };
  const browserQuote = byId('readme').text.match(/The browser demo uses[^\n]+?accounts\./)?.[0];
  if (!browserQuote) throw new Error('Missing browser knowledge statement');
  const extracts = [
    {topic: 'Support triage workflow', source: byId('readme').url, quote: row('readme', 'Support triage', 2)},
    {topic: 'Knowledge search workflow', source: byId('readme').url, quote: row('readme', 'Knowledge search', 2)},
    {topic: 'Lead qualification workflow', source: byId('readme').url, quote: row('readme', 'Lead qualification', 2)},
    {topic: 'Browser demo does NOT use an LLM', source: byId('readme').url, quote: browserQuote},
    {topic: 'Local test results at the source snapshot date', source: byId('verification').url, quote: row('verification', '`npm test`', 2)},
    {topic: 'Limits of local tests and Make cloud proof', source: byId('verification').url, quote: row('verification', '`npm run test:e2e`', 3)}
  ];
  const orientation = '\n\nVERIFIED SOURCE EXTRACTS:\nThese are exact excerpts extracted programmatically from the pinned sources. They are available alongside retrieval. If a search omits one of these facts, use the excerpt and cite its source instead of claiming the fact is absent. Do not infer facts beyond these excerpts.\n' + JSON.stringify(extracts);
  return {ref, sources, extracts, systemPrompt: instructions + '\n\nSOURCE CATALOG (snapshot ' + ref + '):\n' + catalog + orientation};
}
function auth(env = process.env) {
  let saved = {};
  if (!env.MAKE_API_KEY) {
    const file = path.join(env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'make-cli/config.json');
    if (fs.existsSync(file)) saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  const token = env.MAKE_API_KEY || saved.apiKey;
  const zone = env.MAKE_ZONE || saved.zone || 'eu1.make.com';
  if (!token || !/^(eu[12]|us[12])\.make\.com$/.test(zone)) throw new Error('Existing Make CLI login or explicit MAKE_API_KEY and valid MAKE_ZONE required');
  return {token, zone};
}
function client(credentials, fetchImpl = fetch) {
  return async (method, resource, body) => {
    const response = await fetchImpl('https://' + credentials.zone + '/api/v2' + resource, {
      method, redirect: 'error', signal: AbortSignal.timeout(70000),
      headers: {Authorization: 'Token ' + credentials.token, ...(body ? {'Content-Type': 'application/json'} : {})},
      ...(body ? {body: JSON.stringify(body)} : {})
    });
    const raw = await response.text();
    let data; try {data = raw ? JSON.parse(raw) : null;} catch {data = null;}
    if (!response.ok) {
      const error = new Error('Make HTTP ' + response.status + (data && data.message ? ': ' + data.message : ''));
      error.status = response.status; throw error;
    }
    return data;
  };
}
function saveState(state) {
  fs.mkdirSync(path.dirname(stateFile), {recursive: true});
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n', {mode: 0o600});
}
const {validateAnswer, decodeAnswer} = require('../production/src/answer-validation.cjs');
async function provision(api, knowledge) {
  const team = '?teamId=' + definition.teamId;
  let state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : null;
  const listed = await api('GET', '/ai-agents/v1/agents' + team);
  const agents = Array.isArray(listed) ? listed : listed.agents || [];
  const existing = agents.filter(agent => agent.name === definition.name);
  if (existing.length > 1) throw new Error('Multiple matching agents; inspect Make before updating');
  if (state && state.sourceCommit !== knowledge.ref) throw new Error('Existing snapshot differs; explicitly review a knowledge refresh before provisioning again');
  if (existing.length && state && (existing[0].id || existing[0].agentId) !== state.agentId) throw new Error('Named agent and saved state disagree; inspect Make before updating');
  if (existing.length && !state) throw new Error('An existing named agent has no local provisioning state; inspect it before changing it');
  if (!state) {
    const created = await api('POST', '/ai-agents/v1/agents' + team, {
      name: definition.name, teamId: definition.teamId, makeConnectionId: definition.connectionId,
      defaultModel: definition.model, systemPrompt: knowledge.systemPrompt,
      llmConfig: {maxTokens: 2400}, historyConfig: {iterationsFromHistoryCount: 0},
      scenarios: [], mcpConfigs: [], outputParserFormat: parser
    });
    const agentId = created.agentId || created.id;
    if (!agentId) throw new Error('Make did not return an agent ID');
    state = {agentId, sourceCommit: knowledge.ref, contexts: [], createdAt: new Date().toISOString()}; saveState(state);
  }
  const base = '/ai-agents/v1/agents/' + state.agentId;
  await api('PATCH', base + team, {systemPrompt: knowledge.systemPrompt, defaultModel: definition.model,
    invocationConfig: {recursionLimit: 5, timeout: 45000}, llmConfig: {maxTokens: 2400},
    historyConfig: {iterationsFromHistoryCount: 0}, scenarios: [], mcpConfigs: [], outputParserFormat: parser});
  for (const source of knowledge.sources) {
    if (state.contexts.some(c => c.sourceId === source.id)) continue;
    const content = 'SOURCE_ID: ' + source.id + '\nSOURCE_URL: ' + source.url + '\nSOURCE_COMMIT: ' + knowledge.ref + '\n\n' + source.text;
    const result = await api('POST', '/ai-agents/v1/contexts' + team, {agentId: state.agentId, name: source.id + '.txt', content, autosave: 'true'});
    state.contexts.push({sourceId: source.id, result}); saveState(state);
    console.log('Knowledge uploaded: ' + source.id);
  }
  const payload = await api('GET', base + team);
  const current = payload.agent || payload;
  if (current.id !== state.agentId || current.contexts?.length !== knowledge.sources.length || current.scenarios?.length || current.mcpConfigs?.length) throw new Error('Saved agent configuration does not match its read-only knowledge scope');
  return {state, current};
}
async function ask(api, agentId, question, knowledge, options = {}) {
  if (typeof question !== 'string' || !question.trim() || question.length > 2000) throw new Error('Question must contain 1–2000 characters');
  const result = await api('POST', '/ai-agents/v1/agents/' + agentId + '/run?teamId=' + definition.teamId, {
    messages: [{role: 'user', content: question}], threadId: crypto.randomUUID(), config: {}
  });
  if (options.recordRun !== false) {
    fs.mkdirSync(path.join(root, 'exports'), {recursive: true});
    fs.writeFileSync(path.join(root, 'exports/repository-agent-last-run.json'), JSON.stringify(result, null, 2), {mode: 0o600});
  }
  let answer = result.jsonResponse;
  if (!answer) answer = JSON.parse(result.response);
  answer = decodeAnswer(answer);
  validateAnswer(answer, knowledge);
  return {answer, executionTimeMs: result.executionTimeMs, tokenUsage: result.tokenUsageSummary,
    iterationId: result.lastAgentIterationId, centicredits: result.centicreditsConsumption,
    retrievalSteps: (result.executionSteps || []).filter(step => step.role === 'tool' || (step.toolCalls || []).length).map(step => ({role: step.role, toolCalls: step.toolCalls, toolResponse: step.toolResponse ? {name: step.toolResponse.name, status: step.toolResponse.status, toolType: step.toolResponse.toolType} : undefined}))};
}
async function main(args = process.argv.slice(2)) {
  const ref = args.find(arg => arg.startsWith('--ref='))?.slice(6);
  const knowledge = buildKnowledge(ref);
  if (!args.includes('--apply') && !args.includes('--ask')) {
    console.log(JSON.stringify({mode: 'plan', name: definition.name, sourceCommit: knowledge.ref, sources: knowledge.sources.map(({text,...s})=>s)}, null, 2)); return;
  }
  const api = client(auth());
  if (args.includes('--ask')) {
    const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : require('../agents/repository/deployment.json');
    const currentKnowledge = buildKnowledge(state.sourceCommit);
    const question = args[args.indexOf('--ask') + 1];
    console.log(JSON.stringify(await ask(api, state.agentId, question, currentKnowledge), null, 2)); return;
  }
  const result = await provision(api, knowledge);
  fs.writeFileSync(path.join(root, 'exports/repository-agent-config.json'), JSON.stringify(result.current, null, 2), {mode: 0o600});
  console.log(JSON.stringify({agentId: result.state.agentId, sourceCommit: knowledge.ref, contextsUploaded: result.state.contexts.length, current: {name: result.current.name, model: result.current.defaultModel, contexts: result.current.contexts?.length, limits: result.current.invocationConfig}}, null, 2));
}
if (require.main === module) main().catch(error => {console.error(error.message); process.exitCode = 1;});
module.exports = {buildKnowledge, validateAnswer, decodeAnswer, client, auth, provision, ask};
