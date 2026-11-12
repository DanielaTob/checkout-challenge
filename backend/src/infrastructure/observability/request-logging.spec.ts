import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { captureStdout, withLogLevel } from '../../test/capture-stdout';
import { bootCheckoutApp } from '../../test/checkout-app';
import { anInput } from '../../test/checkout-fixture';
import { FakePaymentGateway } from '../../test/fake-payment-gateway';
import { HttpPaymentGateway } from '../gateway/http-payment-gateway';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const MISSING_TX = '8b1d2c3a-0000-4000-8000-0000000000ff';

type Entry = Record<string, unknown>;
const accessLogs = (entries: Entry[]) =>
  entries.filter((e) => e.event === 'http.request');

/** Boots the app with LOG_LEVEL, captures stdout during `fn` and closes the app. */
const run = async (
  level: string,
  fn: (app: INestApplication<App>) => Promise<unknown>,
  boot: () => ReturnType<typeof bootCheckoutApp> = () => bootCheckoutApp(),
) =>
  withLogLevel(level, async () => {
    const out = captureStdout();
    const ctx = await boot();
    try {
      await fn(ctx.app);
    } finally {
      await ctx.app.close();
      out.restore();
    }
    return out;
  });

afterEach(() => jest.restoreAllMocks());

describe('Request id and access log (spec 010)', () => {
  it('AC-010-01 every request writes exactly one http.request JSON line with method, path without query, status and duration', async () => {
    let res!: request.Response;
    const out = await run('info', async (app) => {
      res = await request(app.getHttpServer())
        .get('/products?limit=5')
        .expect(200);
    });
    const logs = accessLogs(out.json());
    expect(logs).toHaveLength(1);
    expect(logs[0]).toEqual({
      timestamp: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      ) as unknown,
      level: 'info',
      context: 'Http',
      requestId: res.headers['x-request-id'],
      event: 'http.request',
      method: 'GET',
      path: '/products',
      statusCode: 200,
      durationMs: expect.any(Number) as unknown,
    });
    expect(logs[0].durationMs as number).toBeGreaterThanOrEqual(0);
  });

  it('AC-010-02 a valid incoming x-request-id is echoed and carried by every line of the request, adapters included', async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValue(new Response('{}', { status: 503 }));
    const gateway = new HttpPaymentGateway(
      {
        baseUrl: 'https://gateway.test',
        publicKey: 'pub',
        privateKey: 'prv',
        integritySecret: 'sec',
        timeoutMs: 1000,
      },
      fetchFn,
    );
    const { idempotencyKey: _k, ...body } = anInput();
    void _k;
    let res!: request.Response;
    const out = await run(
      'info',
      async (app) => {
        res = await request(app.getHttpServer())
          .post('/transactions')
          .set('x-request-id', 'checkout-test.42_A')
          .send(body)
          .expect(502);
      },
      () => bootCheckoutApp(5, gateway),
    );
    expect(res.headers['x-request-id']).toBe('checkout-test.42_A');
    const entries = out.json();
    const gatewayLine = entries.find((e) => e.context === 'PaymentGateway');
    expect(gatewayLine).toMatchObject({
      level: 'warn',
      message: 'merchant failed with HTTP 503',
      requestId: 'checkout-test.42_A',
    });
    const duringRequest = entries.filter((e) => e.requestId !== undefined);
    expect(duringRequest.length).toBeGreaterThanOrEqual(3); // gateway, payment event, access log
    expect(
      duringRequest.every((e) => e.requestId === 'checkout-test.42_A'),
    ).toBe(true);
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['too long', 'a'.repeat(129)],
    ['bad characters', 'abc def<script>'],
  ])(
    'AC-010-03 %s x-request-id → a fresh UUID v4 is generated, returned and logged; the bad value is never logged',
    async (_case, header) => {
      let res!: request.Response;
      const out = await run('info', async (app) => {
        const req = request(app.getHttpServer()).get('/products');
        res = await (
          header === undefined ? req : req.set('x-request-id', header)
        ).expect(200);
      });
      const id = res.headers['x-request-id'];
      expect(id).toMatch(UUID_V4);
      expect(accessLogs(out.json())[0].requestId).toBe(id);
      if (header) expect(out.lines().join('\n')).not.toContain(header);
    },
  );

  it('AC-010-03 two requests without id get different ids', async () => {
    const ids: string[] = [];
    await run('info', async (app) => {
      for (let i = 0; i < 2; i++) {
        const r = await request(app.getHttpServer()).get('/products');
        ids.push(r.headers['x-request-id']);
      }
    });
    expect(new Set(ids).size).toBe(2);
  });

  it('AC-010-04 the access log level follows the status: 2xx info, 4xx warn, 5xx error', async () => {
    const gateway = new FakePaymentGateway();
    gateway.getAcceptanceTokens.mockRejectedValueOnce(
      new Error('socket hang up'),
    );
    const { idempotencyKey: _k, ...body } = anInput();
    void _k;
    const out = await run(
      'info',
      async (app) => {
        const http = request(app.getHttpServer());
        await http.get('/products').expect(200);
        await http.get(`/transactions/${MISSING_TX}`).expect(404);
        await http.post('/transactions').send({}).expect(400);
        await http.post('/transactions').send(body).expect(500);
      },
      () => bootCheckoutApp(5, gateway),
    );
    expect(accessLogs(out.json()).map((e) => [e.statusCode, e.level])).toEqual([
      [200, 'info'],
      [404, 'warn'],
      [400, 'warn'],
      [500, 'error'],
    ]);
  });

  it('AC-010-04 with LOG_LEVEL=warn the info access logs are not written, the 4xx ones are', async () => {
    const out = await run('warn', async (app) => {
      const http = request(app.getHttpServer());
      await http.get('/products').expect(200);
      await http.get(`/transactions/${MISSING_TX}`).expect(404);
    });
    expect(
      out.json().every((e) => e.level !== 'info' && e.level !== 'debug'),
    ).toBe(true);
    expect(accessLogs(out.json()).map((e) => e.statusCode)).toEqual([404]);
  });

  it('AC-010-01 CORS preflights (OPTIONS) also get their access log', async () => {
    const out = await run(
      'info',
      async (app) => {
        await request(app.getHttpServer())
          .options('/transactions')
          .set('Origin', 'https://web.test')
          .set('Access-Control-Request-Method', 'POST')
          .expect(204);
      },
      () => bootCheckoutApp(5, undefined, 'https://web.test'),
    );
    expect(accessLogs(out.json())).toEqual([
      expect.objectContaining({
        method: 'OPTIONS',
        path: '/transactions',
        statusCode: 204,
      }),
    ]);
  });

  it('AC-010-10 CORS responses expose x-request-id to the browser', async () => {
    let res!: request.Response;
    await run(
      'silent',
      async (app) => {
        res = await request(app.getHttpServer())
          .get('/products')
          .set('Origin', 'https://web.test')
          .expect(200);
      },
      () => bootCheckoutApp(5, undefined, 'https://web.test'),
    );
    expect(res.headers['access-control-allow-origin']).toBe('https://web.test');
    expect(res.headers['access-control-expose-headers']).toContain(
      'x-request-id',
    );
  });
});
