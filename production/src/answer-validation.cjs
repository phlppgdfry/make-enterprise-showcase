'use strict';
function validateAnswer(answer, knowledge) {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) throw new Error('Invalid answer object');
  if (Object.keys(answer).some(key => !['status','answer','citations'].includes(key))) throw new Error('Unexpected answer field');
  if (!['answered','insufficient_context','review_required'].includes(answer.status)) throw new Error('Invalid answer status');
  if (typeof answer.answer !== 'string' || !answer.answer.trim()) throw new Error('Missing answer');
  if (!Array.isArray(answer.citations) || answer.citations.length > 3 || (answer.status === 'answered' && !answer.citations.length)) throw new Error('Invalid citations');
  // Citations may quote the rendered Markdown: ignore bold/inline-code wrappers, never words or punctuation.
  const normalize = value => value.replace(/^\s*\|(.+)\|\s*$/gm, (_, cells) => cells.replace(/\|/g, ' ')).replace(/\*\*([^*\n]+)\*\*/g, '$1').replace(/`([^`\n]+)`/g, '$1').replace(/\s+/g, ' ').trim();
  const seen = new Set();
  for (const citation of answer.citations) {
    if (!citation || typeof citation !== 'object' || Object.keys(citation).some(key => !['source','quote'].includes(key))) throw new Error('Invalid citation shape');
    const source = knowledge.sources.find(s => s.url === citation.source);
    if (!source || typeof citation.quote !== 'string' || citation.quote.trim().length < 12 || !normalize(source.text).includes(normalize(citation.quote))) throw new Error('Unverified quote or source');
    const key = citation.source + '\0' + normalize(citation.quote);
    if (seen.has(key)) throw new Error('Duplicate citation');
    seen.add(key);
  }
  return answer;
}
function decodeAnswer(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid Make response object');
  const fields = ['status','answer','source','quote'];
  if (Object.keys(raw).some(key => !fields.includes(key)) || fields.some(key => typeof raw[key] !== 'string')) throw new Error('Invalid native Make output fields');
  if (!!raw.source !== !!raw.quote) throw new Error('Incomplete citation pair');
  return {status: raw.status, answer: raw.answer, citations: raw.source ? [{source: raw.source, quote: raw.quote}] : []};
}
module.exports = {validateAnswer, decodeAnswer};
