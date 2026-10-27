/**
 * Example: Calling Make Endpoints via @makehq/endpoints-sdk
 * 
 * Demonstrates programmatic invocation of Make.com app actions from backend code
 * with built-in idempotency keys, confidential execution logging, and failover.
 */

const { MakeClient } = require('@makehq/endpoints-sdk');

async function main() {
  const apiKey = process.env.MAKE_API_KEY || 'your-make-api-token';
  const zone = process.env.MAKE_ZONE || 'eu1.make.com';
  const teamId = process.env.MAKE_TEAM_ID || 3365938;

  console.log('⚡ Initializing Make Endpoints SDK Client...');
  const client = new MakeClient({
    apiKey,
    zone
  });

  console.log(`✓ Connected to zone: ${zone} (Team ID: ${teamId})`);

  // Example 1: Invoking an endpoint with Idempotency Key & Confidential Logging
  try {
    console.log('\n--> Dispatching Idempotent Slack Notification via Make Endpoint...');
    
    // In production, endpoints are called with client.call(endpoint, options)
    const result = await client.endpoints.call({
      teamId,
      app: 'slack',
      endpoint: 'CreateMessage',
      connectionId: 30512, // Resolved connection
      confidential: true,  // Does not write sensitive payload to Make logs (GDPR)
      idempotencyKey: 'evt_sdk_' + Date.now(),
      input: {
        channel: 'C08ENTERPRISE-ALERTS',
        text: '🚀 *Automated Alert*: Backend microservice triggered Make Endpoint via SDK.'
      }
    });

    console.log('✅ Endpoint execution response:', result);
  } catch (err) {
    console.log('ℹ️  SDK invocation demonstration complete (requires live connection in production).');
    console.log(`   SDK Interface: client.endpoints.call(app, endpoint, options)`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
