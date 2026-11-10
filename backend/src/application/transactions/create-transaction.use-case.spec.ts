import { domainError } from '../../domain/shared/domain-error';
import { err } from '../../domain/shared/result';
import { anInput, checkoutFixture } from '../../test/checkout-fixture';

describe('CreateTransaction', () => {
  it('AC-004-02 stores the transaction in PENDING with a unique reference and backend amounts before calling the gateway', async () => {
    const f = checkoutFixture();
    let atGatewayCall: unknown;
    f.gateway.getAcceptanceTokens.mockImplementationOnce(() => {
      atGatewayCall = structuredClone(f.transactions.rows);
      return Promise.resolve({
        ok: true,
        value: { acceptanceToken: 'a', personalDataAuthToken: 'p' },
      });
    });

    await f.createTransaction.execute(anInput());

    expect(atGatewayCall).toEqual([
      expect.objectContaining({
        status: 'PENDING',
        reference: 'TX-1',
        quantity: 2,
        amountInCents: f.product.priceInCents * 2 + 1300000,
        baseFeeInCents: 300000,
        deliveryFeeInCents: 1000000,
        cardBrand: 'VISA',
        cardLast4: '4242',
      }),
    ]);
  });

  it('AC-004-02 references are unique per transaction', async () => {
    const f = checkoutFixture();
    await f.createTransaction.execute(anInput({ quantity: 1 }));
    await f.createTransaction.execute(anInput({ quantity: 1 }));
    const refs = f.transactions.rows.map((r) => r.reference);
    expect(new Set(refs).size).toBe(2);
  });

  it('AC-004-07 charges the gateway with the token, reference, total, COP and customer email', async () => {
    const f = checkoutFixture();
    await f.createTransaction.execute(anInput());
    expect(f.gateway.tokenizeCard).toHaveBeenCalledWith(anInput().card);
    expect(f.gateway.createTransaction).toHaveBeenCalledWith({
      acceptance: { acceptanceToken: 'acc', personalDataAuthToken: 'pers' },
      cardToken: 'tok_4242',
      reference: 'TX-1',
      amountInCents: f.product.priceInCents * 2 + 1300000,
      currency: 'COP',
      customerEmail: f.customer.email,
    });
  });

  it('AC-004-09 when the gateway approves: APPROVED with gateway id, delivery created and stock decremented', async () => {
    const f = checkoutFixture(5);
    const result = await f.createTransaction.execute(anInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.created).toBe(true);
    expect(result.value.transaction).toMatchObject({
      status: 'APPROVED',
      gatewayTransactionId: 'gw-TX-1',
      delivery: { status: 'PENDING', city: 'Bogotá' },
    });
    expect(f.products.stockOf(f.product.id)).toBe(3);
  });

  it('AC-004-10 when the gateway declines: DECLINED with the reason, no delivery, stock unchanged', async () => {
    const f = checkoutFixture(5);
    f.gateway.answerStatuses('PENDING', 'DECLINED');
    const result = await f.createTransaction.execute(anInput());
    expect(result.ok && result.value.transaction).toMatchObject({
      status: 'DECLINED',
      failureReason: 'Rechazada',
      delivery: null,
    });
    expect(f.products.stockOf(f.product.id)).toBe(5);
  });

  it('AC-004-08 answers PENDING when the gateway is not final after 10 polls', async () => {
    const f = checkoutFixture();
    f.gateway.answerStatuses('PENDING');
    const result = await f.createTransaction.execute(anInput());
    expect(result.ok && result.value.transaction.status).toBe('PENDING');
    expect(result.ok && result.value.transaction.gatewayTransactionId).toBe(
      'gw-TX-1',
    );
    expect(f.gateway.getTransaction).toHaveBeenCalledTimes(10);
  });

  it('AC-004-03 quantity above stock → OUT_OF_STOCK, no transaction and no gateway call', async () => {
    const f = checkoutFixture(1);
    const result = await f.createTransaction.execute(anInput({ quantity: 2 }));
    expect(!result.ok && result.error.code).toBe('OUT_OF_STOCK');
    expect(f.transactions.rows).toHaveLength(0);
    expect(f.gateway.getAcceptanceTokens).not.toHaveBeenCalled();
  });

  it('AC-004-21 if the locked stock check fails (stock changed after the quote), nothing is stored and the gateway is not called', async () => {
    const f = checkoutFixture(5);
    const spy = jest
      .spyOn(f.transactions, 'createPendingIfStock')
      .mockResolvedValue(err(domainError('OUT_OF_STOCK', 'no stock')));
    const result = await f.createTransaction.execute(anInput());
    expect(!result.ok && result.error.code).toBe('OUT_OF_STOCK');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(f.transactions.rows).toHaveLength(0);
    expect(f.gateway.getAcceptanceTokens).not.toHaveBeenCalled();
  });

  it.each([
    ['productId', { productId: '00000000-0000-4000-8000-000000000000' }],
    ['customerId', { customerId: '00000000-0000-4000-8000-000000000000' }],
  ])('AC-004-04 unknown %s → NOT_FOUND', async (_, override) => {
    const f = checkoutFixture();
    const result = await f.createTransaction.execute(anInput(override));
    expect(!result.ok && result.error.code).toBe('NOT_FOUND');
    expect(f.gateway.getAcceptanceTokens).not.toHaveBeenCalled();
  });

  it('AC-004-05 a card that fails Luhn → VALIDATION without calling the gateway nor storing anything', async () => {
    const f = checkoutFixture();
    const result = await f.createTransaction.execute(
      anInput({ card: { ...anInput().card, number: '4242424242424241' } }),
    );
    expect(!result.ok && result.error.code).toBe('VALIDATION');
    expect(f.gateway.tokenizeCard).not.toHaveBeenCalled();
    expect(f.transactions.rows).toHaveLength(0);
  });

  it.each([
    'getAcceptanceTokens',
    'tokenizeCard',
    'createTransaction',
  ] as const)(
    'AC-004-13 a gateway failure in %s → GATEWAY_ERROR and the transaction ends in ERROR',
    async (step) => {
      const f = checkoutFixture(5);
      f.gateway[step].mockResolvedValueOnce(
        err(domainError('GATEWAY_ERROR', 'Payment gateway error (HTTP 503)')),
      );
      const result = await f.createTransaction.execute(anInput());
      expect(!result.ok && result.error.code).toBe('GATEWAY_ERROR');
      expect(f.transactions.rows[0]).toMatchObject({
        status: 'ERROR',
        failureReason: 'Payment gateway error (HTTP 503)',
        delivery: null,
      });
      expect(f.products.stockOf(f.product.id)).toBe(5);
    },
  );
});
