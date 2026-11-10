import { Logger } from '@nestjs/common';
import request from 'supertest';
import { HttpPaymentGateway } from '../infrastructure/gateway/http-payment-gateway';
import { bootCheckoutApp } from './checkout-app';
import { anInput } from './checkout-fixture';

const NUMBER = '5555555555554444';
const CVC = '987';

/** Captures everything written by Nest's Logger and console during a request. */
const captureLogs = () => {
  const lines: string[] = [];
  const push = (...args: unknown[]) => {
    lines.push(args.map((a) => JSON.stringify(a) ?? String(a)).join(' '));
  };
  for (const m of [
    'log',
    'error',
    'warn',
    'debug',
    'verbose',
    'fatal',
  ] as const)
    jest.spyOn(Logger.prototype, m).mockImplementation(push);
  for (const m of ['log', 'error', 'warn', 'info', 'debug'] as const)
    jest.spyOn(console, m).mockImplementation(push);
  return lines;
};

const expectNoCardData = (text: string) => {
  expect(text).not.toContain(NUMBER);
  expect(text).not.toContain(CVC);
  expect(text).not.toMatch(/"cvc"/i);
};

const body = (card: Record<string, string> = {}) => {
  const { idempotencyKey: _k, ...input } = anInput({
    card: { ...anInput().card, number: NUMBER, cvc: CVC },
  });
  void _k;
  return { ...input, card: { ...input.card, ...card } };
};

afterEach(() => jest.restoreAllMocks());

describe('Card data never leaks', () => {
  it('AC-004-16 an approved payment stores only brand and last 4; number and CVC are not in the DB, logs or response', async () => {
    const logs = captureLogs();
    const ctx = await bootCheckoutApp();
    try {
      const res = await request(ctx.app.getHttpServer())
        .post('/transactions')
        .send(body())
        .expect(201);
      expectNoCardData(JSON.stringify(res.body));
      expectNoCardData(JSON.stringify(ctx.transactions.rows));
      expectNoCardData(logs.join('\n'));
      expect(ctx.transactions.rows[0]).toMatchObject({
        cardBrand: 'MASTERCARD',
        cardLast4: '4444',
      });
      // The full card only goes to the gateway's tokenization.
      expect(ctx.gateway.tokenizeCard).toHaveBeenCalledWith(
        expect.objectContaining({ number: NUMBER, cvc: CVC }),
      );
    } finally {
      await ctx.app.close();
    }
  });

  it('AC-004-16 validation errors (400 and 422) do not echo the card back', async () => {
    const logs = captureLogs();
    const ctx = await bootCheckoutApp();
    try {
      const bad = await request(ctx.app.getHttpServer())
        .post('/transactions')
        .send(body({ expMonth: 'XX' }))
        .expect(400);
      const luhn = await request(ctx.app.getHttpServer())
        .post('/transactions')
        .send(body({ number: '5555555555554445' }))
        .expect(422);
      expectNoCardData(JSON.stringify(bad.body) + JSON.stringify(luhn.body));
      expect(JSON.stringify(luhn.body)).not.toContain('5555555555554445');
      expectNoCardData(logs.join('\n'));
    } finally {
      await ctx.app.close();
    }
  });

  it('AC-004-16 a gateway failure while tokenizing logs neither the request body nor the card', async () => {
    const logs = captureLogs();
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              presigned_acceptance: { acceptance_token: 'a' },
              presigned_personal_data_auth: { acceptance_token: 'p' },
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response('{}', { status: 503 }));
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
    const ctx = await bootCheckoutApp(5, gateway);
    try {
      const res = await request(ctx.app.getHttpServer())
        .post('/transactions')
        .send(body())
        .expect(502);
      expect(
        logs.some((l) => l.includes('tokenize failed with HTTP 503')),
      ).toBe(true);
      expectNoCardData(logs.join('\n'));
      expectNoCardData(JSON.stringify(res.body));
      expectNoCardData(JSON.stringify(ctx.transactions.rows));
    } finally {
      await ctx.app.close();
    }
  });
});
