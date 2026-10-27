/**
 * Make.com Custom IML Function
 * Syntax: {{computeHmac(body, secret)}}
 * Calculates an HMAC-SHA256 signature for payload verification.
 */
function computeHmac(body, secret) {
  if (!body || !secret) return '';
  const crypto = require('crypto');
  return crypto.createHmac('sha256', secret).update(typeof body === 'string' ? body : JSON.stringify(body)).digest('hex');
}

module.exports = computeHmac;
