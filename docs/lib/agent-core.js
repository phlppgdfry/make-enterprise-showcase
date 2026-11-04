/* Shared, deterministic reference tools and policy. No network calls or model claims. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AgentCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const actions = new Set(['answer', 'refund', 'cancel', 'upgrade']);
  const stop = new Set('what is the a an for of to in our my how do does het de een wat voor van ik mijn hoe kan sla'.split(' '));
  function text(value, name, max = 2000) {
    if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Invalid ' + name);
    return value.trim();
  }
  function tokens(value) {
    return [...new Set(value.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').match(/[\p{L}\p{N}]+/gu) || [])].filter(t => t.length > 1 && !stop.has(t));
  }
  function retrieve(query, tenantId, documents) {
    text(query, 'query'); text(tenantId, 'tenantId', 100);
    const terms = tokens(query);
    return documents.filter(d => d.tenantId === tenantId).map(d => {
      const index = new Set(tokens(d.title + ' ' + d.text + ' ' + (d.keywords || []).join(' ')));
      const matched = terms.filter(t => index.has(t));
      return { ...d, matched, relevance: terms.length ? matched.length / terms.length : 0 };
    }).filter(d => d.matched.length >= 1 && d.relevance >= 0.25)
      .sort((a, b) => b.relevance - a.relevance || a.id.localeCompare(b.id)).slice(0, 3);
  }
  function evidence(docs) {
    return docs.map(d => ({ id: d.id, title: d.title, quote: d.text, url: d.url }));
  }
  function knowledge(input, data) {
    const query = text(input.query, 'query');
    const matches = retrieve(query, input.tenantId, data.documents);
    return {
      kind: 'knowledge', mode: 'reference', status: matches.length ? 'grounded' : 'insufficient_context',
      answer: matches.length ? matches[0].text : 'No matching source was found in this tenant’s knowledge base.',
      citations: evidence(matches),
      trace: [
        { tool: 'knowledge.search', detail: 'Search only tenant ' + input.tenantId, count: matches.length },
        { tool: 'evidence.check', detail: matches.length ? 'Answer extracted from the first retrieved document.' : 'Abstained: no source available.' }
      ],
      metrics: { modelCalls: 0, toolCalls: 1, externalWrites: 0 }
    };
  }
  function support(input, data) {
    text(input.tenantId, 'tenantId', 100); text(input.customerId, 'customerId', 100);
    const action = input.action === undefined ? 'answer' : input.action;
    if (!actions.has(action)) throw new Error('Invalid action');
    if (input.amount !== undefined && (typeof input.amount !== 'number' || !Number.isFinite(input.amount) || input.amount < 0)) throw new Error('Invalid amount');
    const result = knowledge(input, data);
    const customer = data.customers.find(c => c.id === input.customerId && c.tenantId === input.tenantId);
    const reasons = [];
    if (!customer) reasons.push('CUSTOMER_NOT_FOUND');
    // A caller or model cannot authorize money/account changes through this endpoint.
    if (action !== 'answer') reasons.push('SENSITIVE_ACTION_REQUIRES_REVIEW');
    if (!result.citations.length) reasons.push('INSUFFICIENT_CONTEXT');
    return {
      ...result, kind: 'support', status: reasons.length ? 'needs_review' : 'draft_ready',
      draft: result.citations.length ? result.answer : '',
      escalated: reasons.length > 0, reasons,
      proposedAction: action, actionExecuted: false,
      customer: customer ? { id: customer.id, plan: customer.plan } : null,
      trace: [{ tool: 'customer.lookup', detail: customer ? 'Tenant-scoped customer found: ' + customer.plan : 'No customer in this tenant.' }, ...result.trace,
        { tool: 'policy.evaluate', detail: reasons.length ? reasons.join(', ') : 'Evidence present. Read-only answer draft permitted.' }],
      metrics: { modelCalls: 0, toolCalls: 2, externalWrites: 0 }
    };
  }
  function leads(input, data) {
    text(input.tenantId, 'tenantId', 100);
    const domain = text(input.domain, 'domain', 253).toLowerCase();
    if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain)) throw new Error('Invalid domain');
    const company = data.companies.find(c => c.domain === domain && c.tenantId === input.tenantId);
    const rules = [
      { criterion: 'Industry: logistics or manufacturing', points: 40, matches: c => ['logistics', 'manufacturing'].includes(c.industry) },
      { criterion: 'Region: Belgium or Netherlands', points: 30, matches: c => ['BE', 'NL'].includes(c.country) },
      { criterion: 'Company size: 50–1000 employees', points: 30, matches: c => c.employees >= 50 && c.employees <= 1000 }
    ];
    const breakdown = rules.map(rule => ({ criterion: rule.criterion, points: company && rule.matches(company) ? rule.points : 0, maximum: rule.points, evidenceId: company ? company.source.id : null }));
    const score = company ? breakdown.reduce((sum, r) => sum + r.points, 0) : null;
    return {
      kind: 'leads', mode: 'reference', status: !company ? 'needs_research' : score >= 70 ? 'qualified' : 'low_fit',
      company: company ? company.name : domain, score, breakdown,
      citations: company ? [{ ...company.source, quote: company.name + ': ' + company.industry + ', ' + company.country + ', ' + company.employees + ' employees.' }] : [],
      draft: score >= 70 ? 'Hello ' + company.name + ',\n\nWe help logistics and manufacturing teams connect operational systems and reduce repetitive work. Would a short conversation about your integration priorities be useful?' : '',
      reasons: !company ? ['NO_VERIFIED_COMPANY_DATA'] : [],
      trace: [{ tool: 'company.lookup', detail: company ? 'Loaded a synthetic company research fixture.' : 'Unknown domain. Research required; no facts invented.' },
        { tool: 'icp.score', detail: score === null ? 'Score withheld.' : 'Applied three published rules: ' + score + '/100.' },
        { tool: 'outreach.draft', detail: score >= 70 ? 'Draft created. Sending requires a separate approved workflow.' : 'No outreach draft.' }],
      metrics: { modelCalls: 0, toolCalls: 2, externalWrites: 0 }
    };
  }
  // Validate model output against the same retrieved evidence. A confidence claim is never authorization.
  function validateCandidate(candidate, result) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) throw new Error('Invalid agent output');
    text(candidate.draft, 'draft', 8000);
    if (!Array.isArray(candidate.citations) || !candidate.citations.length) throw new Error('Missing citations');
    if (typeof candidate.escalated !== 'boolean') throw new Error('Invalid escalated flag');
    if (!['answer', 'refund', 'cancel', 'upgrade'].includes(candidate.proposedAction)) throw new Error('Invalid proposedAction');
    const allowed = new Map(result.citations.map(c => [c.id, c]));
    const citations = candidate.citations.map(c => {
      const source = allowed.get(c.id);
      if (!source || typeof c.quote !== 'string' || c.quote.trim().length < 12 || !source.quote.includes(c.quote)) throw new Error('Unverified citation');
      return { ...source, quote: c.quote };
    });
    const reasons = [...(result.reasons || [])];
    if (candidate.escalated) reasons.push('AGENT_REQUESTED_REVIEW');
    if (candidate.proposedAction !== 'answer') reasons.push('SENSITIVE_ACTION_REQUIRES_REVIEW');
    // Citation matching proves provenance, not semantic correctness. Every model draft needs review.
    reasons.push('MODEL_DRAFT_REQUIRES_REVIEW');
    return { ...result, mode: 'agent', status: 'needs_review', draft: candidate.draft, citations,
      escalated: true, reasons: [...new Set(reasons)], proposedAction: candidate.proposedAction, actionExecuted: false,
      metrics: { ...result.metrics, modelCalls: null, agentRequests: 1 },
      trace: [...result.trace, { tool: 'agent.draft', detail: 'Agent output checked against retrieved source quotes; human review required.' }] };
  }
  function run(kind, input, data) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid input');
    if (!data || !Array.isArray(data.documents) || !Array.isArray(data.customers) || !Array.isArray(data.companies)) throw new Error('Invalid reference data');
    if (kind === 'support') return support(input, data);
    if (kind === 'knowledge') return knowledge(input, data);
    if (kind === 'leads') return leads(input, data);
    throw new Error('Unknown workflow');
  }
  return { run, retrieve, validateCandidate };
});
