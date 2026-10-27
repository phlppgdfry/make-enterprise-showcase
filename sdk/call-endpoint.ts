import { MakeClient, type EndpointCallOptions } from '@makehq/endpoints-sdk';

/**
 * Enterprise Microservice Integration Example
 * Type-safe execution of Make Endpoints from Node.js / TypeScript backends.
 */
export async function invokeMakeEndpoint(
  app: string,
  endpoint: string,
  connectionId: number,
  payload: Record<string, unknown>,
  idempotencyKey?: string
) {
  const client = new MakeClient({
    apiKey: process.env.MAKE_API_KEY!,
    zone: process.env.MAKE_ZONE || 'eu1.make.com'
  });

  const options: EndpointCallOptions = {
    teamId: Number(process.env.MAKE_TEAM_ID || 3365938),
    app,
    endpoint,
    connectionId,
    confidential: true,
    idempotencyKey: idempotencyKey || `req_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    input: payload
  };

  return await client.endpoints.call(options);
}
