import { Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { CardInput } from '../../domain/payment/card';
import { HttpPaymentGateway, type FetchFn } from './http-payment-gateway';

const config = {
  baseUrl: 'https://gateway.test/v1/',
  publicKey: 'pub_test_key',
  privateKey: 'prv_test_key',
  integritySecret: 'test_integrity',
  timeoutMs: 50,
};
const card: CardInput = {
  number: '4242 4242 4242 4242',
  cvc: '123',
  expMonth: '12',
  expYear: '29',
  holderName: 'Ana Perez',
};
const acceptance = {
  acceptanceToken: 'acc_tok',
  personalDataAuthToken: 'pers_tok',
};
const paymentRequest = {
  acceptance,
  cardToken: 'tok_test_1',
  reference: 'ref-1',
  amountInCents: 2500000,
  currency: 'COP',
  customerEmail: 'ana@example.com',
};

const json = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

const setup = (...responses: Array<() => Promise<Response>>) => {
  const fetchFn = jest.fn<ReturnType<FetchFn>, Parameters<FetchFn>>();
  for (const r of responses) fetchFn.mockImplementationOnce(r);
  return { gateway: new HttpPaymentGateway(config, fetchFn), fetchFn };
};

const sentBody = (fetchFn: jest.Mock, call = 0): Record<string, unknown> =>
  JSON.parse(
    (fetchFn.mock.calls[call] as [string, RequestInit])[1].body as string,
  ) as Record<string, unknown>;
const sentInit = (fetchFn: jest.Mock, call = 0) =>
  fetchFn.mock.calls[call] as [string, RequestInit];

beforeEach(() => {
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('HttpPaymentGateway', () => {
  it('AC-004-07 gets both acceptance tokens from the merchant endpoint', async () => {
    const { gateway, fetchFn } = setup(() =>
      json(200, {
        data: {
          presigned_acceptance: { acceptance_token: 'acc_tok' },
          presigned_personal_data_auth: { acceptance_token: 'pers_tok' },
        },
      }),
    );
    await expect(gateway.getAcceptanceTokens()).resolves.toEqual({
      ok: true,
      value: acceptance,
    });
    expect(sentInit(fetchFn)[0]).toBe(
      'https://gateway.test/v1/merchants/pub_test_key',
    );
  });

  it('AC-004-13 a merchant response without tokens is a GATEWAY_ERROR', async () => {
    const { gateway } = setup(() => json(200, { data: {} }));
    const r = await gateway.getAcceptanceTokens();
    expect(!r.ok && r.error.code).toBe('GATEWAY_ERROR');
  });

  it('AC-004-07 tokenizes the card with the public key and returns the token id', async () => {
    const { gateway, fetchFn } = setup(() =>
      json(201, { status: 'CREATED', data: { id: 'tok_test_1' } }),
    );
    await expect(gateway.tokenizeCard(card)).resolves.toEqual({
      ok: true,
      value: { id: 'tok_test_1' },
    });
    const [url, init] = sentInit(fetchFn);
    expect(url).toBe('https://gateway.test/v1/tokens/cards');
    expect((init.headers as Record<string, string>).authorization).toBe(
      'Bearer pub_test_key',
    );
    expect(sentBody(fetchFn)).toEqual({
      number: '4242424242424242',
      cvc: '123',
      exp_month: '12',
      exp_year: '29',
      card_holder: 'Ana Perez',
    });
  });

  it('AC-004-05 a 422 while tokenizing is a VALIDATION error (bad card data, not a gateway outage)', async () => {
    const { gateway } = setup(() =>
      json(422, { error: { type: 'INPUT_VALIDATION_ERROR' } }),
    );
    const r = await gateway.tokenizeCard(card);
    expect(!r.ok && r.error.code).toBe('VALIDATION');
  });

  it.each([
    ['a 5xx', () => json(503, {})],
    ['an unexpected 4xx', () => json(401, { error: {} })],
    ['a body without id', () => json(201, { data: {} })],
    [
      'invalid JSON',
      () => Promise.resolve(new Response('<html>', { status: 201 })),
    ],
    ['a network failure', () => Promise.reject(new TypeError('fetch failed'))],
  ])('AC-004-13 tokenizing with %s is a GATEWAY_ERROR', async (_, response) => {
    const { gateway } = setup(response);
    const r = await gateway.tokenizeCard(card);
    expect(!r.ok && r.error.code).toBe('GATEWAY_ERROR');
  });

  it('AC-004-07 creates the transaction with token, acceptance tokens, signature, reference, amount, currency, email and 1 installment', async () => {
    const { gateway, fetchFn } = setup(() =>
      json(201, {
        data: { id: 'gw-1', status: 'PENDING', status_message: null },
      }),
    );
    await expect(gateway.createTransaction(paymentRequest)).resolves.toEqual({
      ok: true,
      value: { id: 'gw-1', status: 'PENDING', statusMessage: null },
    });
    const [url, init] = sentInit(fetchFn);
    expect(url).toBe('https://gateway.test/v1/transactions');
    expect((init.headers as Record<string, string>).authorization).toBe(
      'Bearer prv_test_key',
    );
    expect(sentBody(fetchFn)).toEqual({
      acceptance_token: 'acc_tok',
      accept_personal_auth: 'pers_tok',
      amount_in_cents: 2500000,
      currency: 'COP',
      signature: createHash('sha256')
        .update('ref-12500000COPtest_integrity')
        .digest('hex'),
      customer_email: 'ana@example.com',
      reference: 'ref-1',
      payment_method: { type: 'CARD', token: 'tok_test_1', installments: 1 },
    });
  });

  it('AC-004-13 a refused or malformed creation is a GATEWAY_ERROR', async () => {
    const { gateway } = setup(
      () => json(422, { error: { type: 'INPUT_VALIDATION_ERROR' } }),
      () => json(201, { data: { id: 'gw-1', status: 'WHATEVER' } }),
    );
    const refused = await gateway.createTransaction(paymentRequest);
    const malformed = await gateway.createTransaction(paymentRequest);
    expect(!refused.ok && refused.error.code).toBe('GATEWAY_ERROR');
    expect(!malformed.ok && malformed.error.code).toBe('GATEWAY_ERROR');
  });

  it.each([
    ['APPROVED', 'APPROVED'],
    ['DECLINED', 'DECLINED'],
    ['VOIDED', 'DECLINED'],
    ['ERROR', 'ERROR'],
    ['PENDING', 'PENDING'],
  ])(
    'AC-004-08 maps gateway status %s to %s when reading a transaction',
    async (gatewayStatus, status) => {
      const { gateway, fetchFn } = setup(() =>
        json(200, {
          data: { id: 'gw/1', status: gatewayStatus, status_message: 'msg' },
        }),
      );
      await expect(gateway.getTransaction('gw/1')).resolves.toEqual({
        ok: true,
        value: { id: 'gw/1', status, statusMessage: 'msg' },
      });
      expect(sentInit(fetchFn)[0]).toBe(
        'https://gateway.test/v1/transactions/gw%2F1',
      );
    },
  );

  it('AC-004-14 reading an unknown gateway transaction is a GATEWAY_ERROR', async () => {
    const { gateway } = setup(() => json(404, { error: {} }));
    const r = await gateway.getTransaction('nope');
    expect(!r.ok && r.error.code).toBe('GATEWAY_ERROR');
  });

  it('AC-004-13 a request that exceeds the timeout is aborted and becomes a GATEWAY_ERROR', async () => {
    const hang: FetchFn = (_url, init) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(init.signal?.reason as Error),
        );
      });
    const { gateway } = setup(hang as () => Promise<Response>);
    const r = await gateway.getAcceptanceTokens();
    expect(r).toEqual({
      ok: false,
      error: {
        code: 'GATEWAY_ERROR',
        message: 'The payment gateway did not answer in time',
      },
    });
  });

  it('AC-005-11 every request carries an abort signal so a silent gateway is cut at the timeout', async () => {
    const { gateway, fetchFn } = setup(() => json(200, { data: {} }));
    await gateway.getAcceptanceTokens();
    expect(sentInit(fetchFn)[1].signal).toBeInstanceOf(AbortSignal);
  });

  it('AC-005-12 a transient failure reading the status is retried up to 2 times', async () => {
    const ok200 = () => json(200, { data: { id: 'gw-1', status: 'APPROVED' } });
    const { gateway, fetchFn } = setup(
      () => json(503, {}),
      () => Promise.reject(new TypeError('fetch failed')),
      ok200,
    );
    const r = await gateway.getTransaction('gw-1');
    expect(r.ok && r.value.status).toBe('APPROVED');
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('AC-005-12 the status read gives up after 3 attempts and a 4xx is not retried', async () => {
    const down = setup(
      () => json(503, {}),
      () => json(502, {}),
      () => json(500, {}),
    );
    const r = await down.gateway.getTransaction('gw-1');
    expect(!r.ok && r.error.code).toBe('GATEWAY_ERROR');
    expect(down.fetchFn).toHaveBeenCalledTimes(3);

    const notFound = setup(() => json(404, {}));
    await notFound.gateway.getTransaction('gw-1');
    expect(notFound.fetchFn).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['tokenizing', (g: HttpPaymentGateway) => g.tokenizeCard(card)],
    [
      'creating the transaction',
      (g: HttpPaymentGateway) => g.createTransaction(paymentRequest),
    ],
  ])('AC-005-12 %s is never retried', async (_, call) => {
    const { gateway, fetchFn } = setup(() => json(503, {}));
    await call(gateway);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('AC-005-14 a per-call timeoutMs shorter than the configured timeout aborts sooner', async () => {
    const hang: FetchFn = (_url, init) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(init.signal?.reason as Error),
        );
      });
    const gateway = new HttpPaymentGateway(
      { ...config, timeoutMs: 60000 },
      hang,
    );
    const started = Date.now();
    const r = await gateway.tokenizeCard(card, { timeoutMs: 20 });
    expect(!r.ok && r.error.message).toBe(
      'The payment gateway did not answer in time',
    );
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('AC-005-14 the status read does not retry once its time limit is spent', async () => {
    const late503: FetchFn = () =>
      new Promise((resolve) =>
        setTimeout(() => resolve(new Response('{}', { status: 503 })), 15),
      );
    const fetchFn = jest.fn(late503);
    const gateway = new HttpPaymentGateway(
      { ...config, timeoutMs: 1000 },
      fetchFn,
    );
    const r = await gateway.getTransaction('gw-1', { timeoutMs: 5 });
    expect(!r.ok && r.error.code).toBe('GATEWAY_ERROR');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
