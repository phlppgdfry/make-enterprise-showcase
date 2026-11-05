'use strict';
let kind = 'support';
let data;
let latest;
const $ = id => document.getElementById(id);
const labels = { draft_ready: 'Draft ready', needs_review: 'Human review required', grounded: 'Source found', insufficient_context: 'More context needed', qualified: 'Qualified lead', low_fit: 'Low ICP fit', needs_research: 'Research needed' };
const reasonLabels = { CUSTOMER_NOT_FOUND: 'No customer was found in this workspace.', SENSITIVE_ACTION_REQUIRES_REVIEW: 'Account and financial changes require human approval.', INSUFFICIENT_CONTEXT: 'The available sources do not answer this request.', NO_VERIFIED_COMPANY_DATA: 'No verified company profile is available.', INCOMPLETE_COMPANY_DATA: 'The company profile is incomplete. Verify the missing facts before scoring.' };
const presets = {
  support: [{ label: 'P1 incident', query: 'What is the response time for a P1 incident?', action: 'answer', amount: 0 }, { label: 'Refund request', query: 'Please refund my invoice for €2400.', action: 'refund', amount: 2400 }, { label: 'Unknown policy', query: 'Can I bring a pet to the office?', action: 'answer', amount: 0 }],
  knowledge: [{ label: 'P1 SLA', query: 'What is the P1 incident response time?' }, { label: 'Password reset', query: 'How do I reset my password?' }, { label: 'Missing answer', query: 'What is our office lunch menu?' }],
  leads: [{ label: 'Strong fit', domain: 'north-logistics.example' }, { label: 'Low fit', domain: 'studio-small.example' }, { label: 'Unknown company', domain: 'unknown.example' }]
};
function node(tag, content, className) {
  const el = document.createElement(tag);
  if (content !== undefined) el.textContent = content;
  if (className) el.className = className;
  return el;
}
function setExamples() {
  $('examples').replaceChildren(...presets[kind].map(preset => {
    const button = node('button', preset.label, 'example'); button.type = 'button';
    button.addEventListener('click', () => { for (const key of ['query', 'action', 'amount', 'domain']) if (preset[key] !== undefined) $(key).value = preset[key]; clearResult(); });
    return button;
  }));
}
function clearResult() {
  latest = null; $('export').disabled = true; $('form-error').textContent = '';
  const empty = node('div', undefined, 'empty-state');
  empty.append(node('h3', 'Ready for a new request.'), node('p', 'Run the workflow to inspect the decision for these inputs.'));
  $('result').replaceChildren(empty);
}
function choose(next) {
  kind = next;
  for (const tab of document.querySelectorAll('[role=tab]')) { const selected = tab.dataset.kind === kind; tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1; }
  $('workflow-panel').setAttribute('aria-labelledby', 'tab-' + kind);
  $('query-fields').hidden = kind === 'leads'; $('query').required = kind !== 'leads';
  $('support-fields').hidden = kind !== 'support'; $('lead-fields').hidden = kind !== 'leads'; $('domain').required = kind === 'leads';
  for (const key of ['query', 'action', 'amount', 'domain']) if (presets[kind][0][key] !== undefined) $(key).value = presets[kind][0][key];
  setExamples(); clearResult();
}
function render(result, duration) {
  const fragment = document.createDocumentFragment();
  const top = node('div', undefined, 'decision-top');
  const review = ['needs_review', 'insufficient_context', 'needs_research', 'low_fit'].includes(result.status);
  top.append(node('span', labels[result.status], 'decision-status' + (review ? ' review' : '')), node('span', duration.toFixed(1) + ' ms · local execution', 'execution-time')); fragment.append(top);
  if (result.kind === 'leads') {
    fragment.append(node('h3', result.company));
    const score = node('div', result.score === null ? '—' : String(result.score), 'score'); score.append(node('span', ' / 100 ICP fit')); fragment.append(score);
    for (const row of result.breakdown) { const item = node('div', undefined, 'score-row'); item.append(node('span', row.criterion), node('strong', row.points === null ? 'Unknown' : row.points + ' / ' + row.maximum)); fragment.append(item); }
  }
  if (result.reasons && result.reasons.length) fragment.append(node('p', result.reasons.map(r => reasonLabels[r] || r).join(' '), 'reasons'));
  if (result.draft || result.answer) { fragment.append(node('p', result.kind === 'leads' ? 'Outreach draft · not sent' : result.kind === 'support' ? 'Response draft · not sent' : 'Extracted answer', 'subheading'), node('p', result.draft || result.answer, 'answer')); }
  fragment.append(node('p', 'Evidence · ' + result.citations.length + ' source' + (result.citations.length === 1 ? '' : 's'), 'subheading'));
  if (!result.citations.length) fragment.append(node('p', 'No source found. Add verified information before proceeding.', 'field-note'));
  for (const citation of result.citations) {
    const source = node('article', undefined, 'source'); source.id = 'source-' + citation.id;
    source.append(node('strong', citation.title), node('blockquote', citation.quote), node('small', citation.id + ' · synthetic fixture')); fragment.append(source);
  }
  fragment.append(node('p', 'Execution trace', 'subheading'));
  const trace = node('ol', undefined, 'trace'); for (const step of result.trace) { const li = node('li'); const body = node('div'); body.append(node('strong', step.tool), node('p', step.detail)); li.append(body); trace.append(li); } fragment.append(trace);
  const metrics = node('div', undefined, 'metrics');
  for (const [label, value] of [['Tool calls', result.metrics.toolCalls], ['Model calls', result.metrics.modelCalls], ['External writes', result.metrics.externalWrites]]) { const item = node('div'); item.append(node('strong', value === null ? 'Unknown' : String(value)), node('span', label)); metrics.append(item); } fragment.append(metrics);
  $('result').replaceChildren(fragment); $('export').disabled = false;
}
for (const tab of document.querySelectorAll('[role=tab]')) {
  tab.addEventListener('click', () => choose(tab.dataset.kind));
  tab.addEventListener('keydown', event => { const tabs = [...document.querySelectorAll('[role=tab]')]; const index = tabs.indexOf(tab); let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0; if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); choose(tabs[next].dataset.kind); tabs[next].focus(); }
  });
}
$('request-form').addEventListener('input', clearResult);
$('tenant').addEventListener('change', () => { if (kind === 'leads') $('domain').value = $('tenant').value === 'north' ? 'north-logistics.example' : 'south-manufacturing.example'; });
$('request-form').addEventListener('submit', event => {
  event.preventDefault(); $('form-error').textContent = '';
  const tenantId = $('tenant').value;
  try {
    const input = { tenantId, query: $('query').value, customerId: 'customer-' + tenantId, action: $('action').value, amount: Number($('amount').value), domain: $('domain').value };
    const started = performance.now(); latest = AgentCore.run(kind, input, data); const duration = performance.now() - started;
    latest = { ...latest, durationMs: Number(duration.toFixed(2)) }; render(latest, duration);
  } catch (error) { clearResult(); $('form-error').textContent = error.message; }
});
$('export').addEventListener('click', () => {
  if (!latest) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(latest, null, 2)], { type: 'application/json' })); const a = node('a');
  a.href = url; a.download = 'agent-workbench-' + kind + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
setExamples();
fetch('data/reference.json').then(response => { if (!response.ok) throw new Error('Sample data could not be loaded. Reload the page.'); return response.json(); }).then(value => { data = value; $('run-button').disabled = false; $('run-button').replaceChildren(node('span', 'Run workflow'), node('span', '↗')); }).catch(error => { $('form-error').textContent = error.message; });
