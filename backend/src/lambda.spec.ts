import { NestFactory } from '@nestjs/core';
import type { Context, Handler } from 'aws-lambda';

// Fake environment (no real secrets; /health never touches the database).
const ENV = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  GATEWAY_BASE_URL: 'https://sandbox.example.test/v1',
  GATEWAY_PUBLIC_KEY: 'pub_test',
  GATEWAY_PRIVATE_KEY: 'prv_test',
  GATEWAY_INTEGRITY_SECRET: 'integrity',
  BASE_FEE_IN_CENTS: '300000',
  DELIVERY_FEE_IN_CENTS: '800000',
  CORS_ORIGINS: 'https://d111111abcdef8.cloudfront.net',
};

const httpApiEvent = (
  method: string,
  rawPath: string,
  headers: Record<string, string> = {},
) => ({
  version: '2.0',
  routeKey: '$default',
  rawPath,
  rawQueryString: '',
  headers: { host: 'abc123.execute-api.us-east-2.amazonaws.com', ...headers },
  requestContext: {
    http: {
      method,
      path: rawPath,
      protocol: 'HTTP/1.1',
      sourceIp: '203.0.113.1',
      userAgent: 'jest',
    },
    requestId: 'req-1',
    stage: '$default',
    timeEpoch: 0,
  },
  isBase64Encoded: false,
});

const context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'checkout-challenge-api',
  awsRequestId: 'req-1',
  getRemainingTimeInMillis: () => 29000,
} as unknown as Context;

type LambdaResponse = {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
};

describe('Lambda handler (API Gateway HTTP API, payload v2)', () => {
  const saved = { ...process.env };
  let handler: Handler;
  let createSpy: jest.SpyInstance;

  beforeAll(() => {
    // The env must exist before AppModule is imported (ConfigModule validates it at import time).
    Object.assign(process.env, ENV);
    createSpy = jest.spyOn(NestFactory, 'create');
    handler = jest.requireActual<typeof import('./lambda')>('./lambda').handler;
  });

  afterAll(() => {
    process.env = saved;
    createSpy.mockRestore();
  });

  const invoke = (event: object) =>
    handler(event, context, () => {}) as Promise<LambdaResponse>;

  it('AC-006-01 GET /health through an HTTP API v2 event answers 200 {"status":"ok"}', async () => {
    const res = await invoke(httpApiEvent('GET', '/health'));
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: 'ok' });
    expect(res.headers['strict-transport-security']).toMatch(/max-age/);
  });

  it('AC-006-02 warm invocations reuse the same Nest app (bootstrapped once)', async () => {
    await invoke(httpApiEvent('GET', '/health'));
    const preflight = await invoke(
      httpApiEvent('OPTIONS', '/products', {
        origin: ENV.CORS_ORIGINS,
        'access-control-request-method': 'GET',
      }),
    );
    expect(preflight.headers['access-control-allow-origin']).toBe(
      ENV.CORS_ORIGINS,
    );
    expect(createSpy).toHaveBeenCalledTimes(1);
  });
});
