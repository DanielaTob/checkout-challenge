import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../../configure-app';
import { CUSTOMER_REPOSITORY } from '../../domain/customer/customer.repository';
import { InMemoryCustomerRepository } from '../../test/in-memory-customer.repository';
import { CustomersModule } from '../customers.module';

const body = {
  fullName: 'Ana Pérez',
  email: 'ana@example.com',
  phone: '+573001234567',
};

describe('CustomersController (HTTP)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CustomersModule],
    })
      .overrideProvider(CUSTOMER_REPOSITORY)
      .useValue(new InMemoryCustomerRepository())
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app, undefined);
    await app.init();
  });

  afterEach(() => app.close());

  it('AC-004-01 POST /customers answers 201 with the id for a new email and 200 with the same id when it exists', async () => {
    const created = await request(app.getHttpServer())
      .post('/customers')
      .send(body)
      .expect(201);
    const createdBody = created.body as { id: string };
    expect(created.body).toEqual({ id: expect.any(String) as string, ...body });

    const again = await request(app.getHttpServer())
      .post('/customers')
      .send({ ...body, fullName: 'Ana María Pérez' })
      .expect(200);
    expect(again.body).toEqual({
      ...body,
      id: createdBody.id,
      fullName: 'Ana María Pérez',
    });
  });

  it.each([
    ['missing email', { fullName: 'Ana', phone: '+573001234567' }],
    ['bad email', { ...body, email: 'nope' }],
    ['bad phone', { ...body, phone: 'abc' }],
    ['unknown field', { ...body, admin: true }],
  ])('AC-004-01 POST /customers answers 400 for %s', async (_, payload) => {
    await request(app.getHttpServer())
      .post('/customers')
      .send(payload)
      .expect(400);
  });
});
