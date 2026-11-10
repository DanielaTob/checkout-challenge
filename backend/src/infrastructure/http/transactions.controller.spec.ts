import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { domainError } from '../../domain/shared/domain-error';
import { err } from '../../domain/shared/result';
import { bootCheckoutApp } from '../../test/checkout-app';
import { anInput } from '../../test/checkout-fixture';

type Booted = Awaited<ReturnType<typeof bootCheckoutApp>>;
type Body = Record<string, unknown>;

const body = (overrides: Body = {}): Body => {
  const { idempotencyKey: _ignored, ...rest } = anInput();
  void _ignored;
  return { ...rest, ...overrides };
};

describe('TransactionsController (HTTP)', () => {
  let ctx: Booted;
  let app: INestApplication<App>;

  beforeEach(async () => {
    ctx = await bootCheckoutApp(5);
    app = ctx.app;
  });
  afterEach(() => app.close());

  const post = (payload: Body) =>
    request(app.getHttpServer()).post('/transactions').send(payload);

  it('AC-004-02 POST /transactions answers 201 with status, reference and backend amounts', async () => {
    const res = await post(body()).expect(201);
    const price = ctx.product.priceInCents;
    expect(res.body).toEqual({
      id: expect.any(String) as string,
      reference: expect.stringMatching(/^TX-[0-9a-f-]{36}$/) as string,
      status: 'APPROVED',
      productId: ctx.product.id,
      customerId: ctx.customer.id,
      quantity: 2,
      subtotalInCents: price * 2,
      baseFeeInCents: 300000,
      deliveryFeeInCents: 1000000,
      totalInCents: price * 2 + 1300000,
      currency: 'COP',
      cardBrand: 'VISA',
      cardLast4: '4242',
      failureReason: null,
      delivery: expect.objectContaining({ status: 'PENDING' }) as unknown,
      createdAt: '2026-11-10T00:00:00.000Z',
    });
  });

  it('AC-004-08 POST /transactions answers 201 with status PENDING when the gateway is not final yet', async () => {
    ctx.gateway.answerStatuses('PENDING');
    const res = await post(body()).expect(201);
    expect((res.body as Body).status).toBe('PENDING');
  });

  it('AC-004-03 POST /transactions answers 409 when quantity exceeds stock', async () => {
    await post(body({ quantity: 6 })).expect(409);
    expect(ctx.transactions.rows).toHaveLength(0);
    expect(ctx.gateway.getAcceptanceTokens).not.toHaveBeenCalled();
  });

  it('AC-004-04 POST /transactions answers 404 for an unknown product or customer', async () => {
    await post(
      body({ productId: '00000000-0000-4000-8000-000000000000' }),
    ).expect(404);
    await post(
      body({ customerId: '00000000-0000-4000-8000-000000000000' }),
    ).expect(404);
  });

  it.each([
    ['fails Luhn', { number: '4242424242424241' }],
    ['is expired', { expMonth: '01', expYear: '20' }],
    ['is an unsupported brand', { number: '378282246310005' }],
  ])(
    'AC-004-05 POST /transactions answers 422 when the card %s, without calling the gateway',
    async (_, card) => {
      await post(body({ card: { ...anInput().card, ...card } })).expect(422);
      expect(ctx.gateway.tokenizeCard).not.toHaveBeenCalled();
    },
  );

  it.each<[string, Body]>([
    ['missing card', body({ card: undefined })],
    ['missing shipping', body({ shipping: undefined })],
    ['card as a string', body({ card: '4242424242424242' })],
    ['non-UUID productId', body({ productId: 'x' })],
    ['quantity 0', body({ quantity: 0 })],
    ['quantity 11', body({ quantity: 11 })],
    [
      'card number with letters',
      body({ card: { ...anInput().card, number: 'abc' } }),
    ],
    [
      'missing postal code',
      body({ shipping: { ...anInput().shipping, postalCode: undefined } }),
    ],
    ['unknown field', body({ admin: true })],
  ])(
    'AC-004-05 POST /transactions answers 400 for a malformed body: %s',
    async (_, payload) => {
      await post(payload).expect(400);
      expect(ctx.transactions.rows).toHaveLength(0);
    },
  );

  it('AC-004-05 POST /transactions answers 400 for an Idempotency-Key that is not a UUID', async () => {
    await post(body()).set('Idempotency-Key', 'not-a-uuid').expect(400);
  });

  it('AC-004-13 POST /transactions answers 502 when the gateway fails and leaves the transaction in ERROR', async () => {
    ctx.gateway.createTransaction.mockResolvedValueOnce(
      err(domainError('GATEWAY_ERROR', 'Payment gateway error (HTTP 503)')),
    );
    const res = await post(body()).expect(502);
    expect(res.body).toEqual({
      statusCode: 502,
      error: 'Bad Gateway',
      message: 'Payment gateway error (HTTP 503)',
    });
    expect(ctx.transactions.rows[0].status).toBe('ERROR');
  });

  it('AC-004-14 GET /transactions/:id answers 200 with status, reference, amounts, card brand/last4 and delivery', async () => {
    const created = await post(body()).expect(201);
    const id = (created.body as Body).id as string;
    const res = await request(app.getHttpServer())
      .get(`/transactions/${id}`)
      .expect(200);
    expect(res.body).toEqual(created.body);
  });

  it('AC-004-14 GET /transactions/:id refreshes a PENDING transaction from the gateway', async () => {
    ctx.gateway.answerStatuses('PENDING');
    const created = await post(body()).expect(201);
    ctx.gateway.answerStatuses('DECLINED');
    const res = await request(app.getHttpServer())
      .get(`/transactions/${(created.body as Body).id as string}`)
      .expect(200);
    expect(res.body).toMatchObject({
      status: 'DECLINED',
      failureReason: 'Rechazada',
      delivery: null,
    });
  });

  it('AC-004-14 GET /transactions/:id answers 404 when missing, 400 for a non-UUID and 502 if the refresh fails', async () => {
    await request(app.getHttpServer())
      .get('/transactions/00000000-0000-4000-8000-000000000000')
      .expect(404);
    await request(app.getHttpServer()).get('/transactions/nope').expect(400);
    ctx.gateway.answerStatuses('PENDING');
    const created = await post(body()).expect(201);
    ctx.gateway.getTransaction.mockResolvedValueOnce(
      err(domainError('GATEWAY_ERROR', 'down')),
    );
    await request(app.getHttpServer())
      .get(`/transactions/${(created.body as Body).id as string}`)
      .expect(502);
  });

  it('AC-005-09 POST /transactions with a known Idempotency-Key answers 200 with the same transaction', async () => {
    const key = '00000000-0000-4000-8000-0000000000c1';
    const first = await post(body()).set('Idempotency-Key', key).expect(201);
    const again = await post(body()).set('Idempotency-Key', key).expect(200);
    expect(again.body).toEqual(first.body);
    expect(ctx.gateway.createTransaction).toHaveBeenCalledTimes(1);
  });

  it('AC-005-10 POST /transactions with a known Idempotency-Key and another body answers 409', async () => {
    const key = '00000000-0000-4000-8000-0000000000c2';
    await post(body()).set('Idempotency-Key', key).expect(201);
    await post(body({ quantity: 1 }))
      .set('Idempotency-Key', key)
      .expect(409);
  });

  it('AC-005-13 GET /transactions/by-key/:key answers 200 with the transaction, 404 for an unknown key and 400 for a non-UUID', async () => {
    const key = '00000000-0000-4000-8000-0000000000c3';
    const created = await post(body()).set('Idempotency-Key', key).expect(201);
    const res = await request(app.getHttpServer())
      .get(`/transactions/by-key/${key}`)
      .expect(200);
    expect(res.body).toEqual(created.body);
    await request(app.getHttpServer())
      .get('/transactions/by-key/00000000-0000-4000-8000-0000000000c4')
      .expect(404);
    await request(app.getHttpServer())
      .get('/transactions/by-key/nope')
      .expect(400);
  });

  it('AC-005-14 POST /transactions answers 201 PENDING when the gateway is too slow to finish within the budget', async () => {
    const create = ctx.gateway.createTransaction.getMockImplementation()!;
    ctx.gateway.createTransaction.mockImplementationOnce((r, o) => {
      ctx.clock.advance(14500);
      return create(r, o);
    });
    const res = await post(body()).expect(201);
    expect((res.body as Body).status).toBe('PENDING');
    expect(ctx.gateway.getTransaction).not.toHaveBeenCalled();
  });

  it('AC-005-15 GET /transactions/:id and /by-key/:key bound the gateway re-read to 10 s and answer 502 if it runs out, keeping PENDING', async () => {
    const key = '00000000-0000-4000-8000-0000000000c5';
    ctx.gateway.answerStatuses('PENDING');
    const created = await post(body()).set('Idempotency-Key', key).expect(201);
    const id = (created.body as Body).id as string;
    const timedOut = err(
      domainError(
        'GATEWAY_ERROR',
        'The payment gateway did not answer in time',
      ),
    );
    ctx.gateway.getTransaction.mockClear();
    ctx.gateway.getTransaction
      .mockResolvedValueOnce(timedOut)
      .mockResolvedValueOnce(timedOut);

    await request(app.getHttpServer()).get(`/transactions/${id}`).expect(502);
    await request(app.getHttpServer())
      .get(`/transactions/by-key/${key}`)
      .expect(502);

    const gatewayId = ctx.transactions.rows[0].gatewayTransactionId;
    expect(ctx.gateway.getTransaction.mock.calls).toEqual([
      [gatewayId, { timeoutMs: 10000 }],
      [gatewayId, { timeoutMs: 10000 }],
    ]);
    expect(ctx.transactions.rows[0].status).toBe('PENDING');
  });

  it('documents the transaction routes in Swagger', async () => {
    const res = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);
    expect(Object.keys((res.body as { paths: Body }).paths)).toEqual(
      expect.arrayContaining([
        '/transactions',
        '/transactions/{id}',
        '/transactions/by-key/{idempotencyKey}',
      ]),
    );
  });
});
