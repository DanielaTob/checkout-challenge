import request from 'supertest';
import { bootCheckoutApp } from '../../test/checkout-app';
import { anInput } from '../../test/checkout-fixture';

describe('DeliveriesController (HTTP)', () => {
  it('AC-004-15 GET /deliveries/:id answers 200 with address and status, 404 if missing and 400 for a non-UUID', async () => {
    const ctx = await bootCheckoutApp();
    try {
      const created = await ctx.createTransaction.execute(anInput());
      const deliveryId = created.ok
        ? created.value.transaction.delivery!.id
        : '';
      const server = ctx.app.getHttpServer();

      const res = await request(server)
        .get(`/deliveries/${deliveryId}`)
        .expect(200);
      expect(res.body).toEqual({
        id: deliveryId,
        transactionId: expect.any(String) as string,
        customerId: ctx.customer.id,
        ...anInput().shipping,
        status: 'PENDING',
      });
      await request(server)
        .get('/deliveries/00000000-0000-4000-8000-000000000000')
        .expect(404);
      await request(server).get('/deliveries/nope').expect(400);
    } finally {
      await ctx.app.close();
    }
  });
});
