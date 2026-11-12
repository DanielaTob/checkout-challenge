import request from 'supertest';
import { captureStdout, withLogLevel } from '../../test/capture-stdout';
import { bootCheckoutApp } from '../../test/checkout-app';
import { anInput } from '../../test/checkout-fixture';
import { HttpPaymentGateway } from '../gateway/http-payment-gateway';

const NUMBER = '5555555555554444';
const CVC = '987';

const body = (card: Record<string, string> = {}) => {
  const { idempotencyKey: _k, ...input } = anInput({
    card: { ...anInput().card, number: NUMBER, cvc: CVC },
  });
  void _k;
  return { ...input, card: { ...input.card, ...card } };
};

const failingGateway = () =>
  new HttpPaymentGateway(
    {
      baseUrl: 'https://gateway.test',
      publicKey: 'pub',
      privateKey: 'prv',
      integritySecret: 'sec',
      timeoutMs: 1000,
    },
    jest
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
      .mockResolvedValueOnce(new Response('{}', { status: 503 })),
  );

afterEach(() => jest.restoreAllMocks());

describe('Card data never reaches stdout (spec 010)', () => {
  it.each([
    ['approved (201)', 201, {}, undefined],
    ['validation error (400)', 400, { expMonth: 'XX' }, undefined],
    ['Luhn failure (422)', 422, { number: '5555555555554445' }, undefined],
    ['gateway failure (502)', 502, {}, failingGateway],
  ] as const)(
    'AC-010-06 %s: no card number, CVC or "cvc" key in any line, even at debug level',
    async (_case, status, card, gateway) => {
      const out = await withLogLevel('debug', async () => {
        const capture = captureStdout();
        const ctx = await bootCheckoutApp(5, gateway?.());
        try {
          await request(ctx.app.getHttpServer())
            .post('/transactions')
            .send(body(card))
            .expect(status);
        } finally {
          await ctx.app.close();
          capture.restore();
        }
        return capture;
      });
      const text = out.lines().join('\n');
      expect(out.json().some((e) => e.event === 'http.request')).toBe(true);
      expect(text).not.toContain(NUMBER);
      expect(text).not.toContain('5555555555554445');
      expect(text).not.toContain(`"${CVC}"`);
      expect(text).not.toMatch(/"cvc"/i);
    },
  );
});
