import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../../configure-app';
import { PRODUCT_REPOSITORY } from '../../domain/product/product.repository';
import { FEES_PROVIDER } from '../../domain/quote/quote';
import {
  aProduct,
  InMemoryProductRepository,
} from '../../test/in-memory-product.repository';
import { ProductsModule } from '../products.module';
import type { ProductResponseDto } from './product-response.dto';

const headphones = aProduct();
const watch = aProduct({
  id: '6f1d2c3a-0000-4000-8000-000000000002',
  name: 'Reloj deportivo',
  stock: 0,
});

describe('ProductsController (HTTP)', () => {
  let app: INestApplication<App>;
  let repo: InMemoryProductRepository;

  beforeEach(async () => {
    repo = new InMemoryProductRepository([headphones, watch]);
    const moduleRef = await Test.createTestingModule({
      imports: [ProductsModule],
    })
      .overrideProvider(PRODUCT_REPOSITORY)
      .useValue(repo)
      .overrideProvider(FEES_PROVIDER)
      .useValue({
        getFees: () => ({
          baseFeeInCents: 300000,
          deliveryFeeInCents: 1000000,
        }),
      })
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app, undefined);
    await app.init();
  });

  afterEach(() => app.close());

  it('AC-001-01 GET /products answers 200 with id, name, description, imageUrl, priceInCents and stock', async () => {
    const res = await request(app.getHttpServer()).get('/products').expect(200);
    const body = res.body as ProductResponseDto[];
    expect(body).toEqual([headphones, watch]);
    for (const p of body) {
      expect(Object.keys(p).sort()).toEqual(
        [
          'description',
          'id',
          'imageUrl',
          'name',
          'priceInCents',
          'stock',
        ].sort(),
      );
    }
  });

  it('AC-001-02 GET /products/:id answers 200 with that product', async () => {
    const res = await request(app.getHttpServer())
      .get(`/products/${watch.id}`)
      .expect(200);
    expect(res.body).toEqual(watch);
  });

  it('AC-001-03 GET /products/:id answers 404 for a UUID that does not exist', async () => {
    const res = await request(app.getHttpServer())
      .get('/products/00000000-0000-4000-8000-000000000000')
      .expect(404);
    expect(res.body).toMatchObject({ statusCode: 404, error: 'Not Found' });
  });

  it('AC-001-04 GET /products/:id answers 400 for a non-UUID id without querying the repository', async () => {
    const res = await request(app.getHttpServer())
      .get('/products/not-a-uuid')
      .expect(400);
    expect(res.body).toMatchObject({ statusCode: 400 });
    expect(repo.calls.findById).toBe(0);
  });

  it('AC-003-01 GET /products/:id/quote answers 200 with the breakdown computed in the backend', async () => {
    const res = await request(app.getHttpServer())
      .get(`/products/${headphones.id}/quote?quantity=2`)
      .expect(200);
    expect(res.body).toEqual({
      productId: headphones.id,
      quantity: 2,
      unitPriceInCents: headphones.priceInCents,
      subtotalInCents: headphones.priceInCents * 2,
      baseFeeInCents: 300000,
      deliveryFeeInCents: 1000000,
      totalInCents: headphones.priceInCents * 2 + 1300000,
      currency: 'COP',
    });
  });

  it('AC-003-02 GET /products/:id/quote answers 409 when quantity exceeds stock', async () => {
    await request(app.getHttpServer())
      .get(`/products/${watch.id}/quote?quantity=1`)
      .expect(409);
  });

  it.each(['0', '11', '1.5', 'abc', ''])(
    'AC-003-03 GET /products/:id/quote answers 400 for quantity=%p',
    async (quantity) => {
      await request(app.getHttpServer())
        .get(`/products/${headphones.id}/quote?quantity=${quantity}`)
        .expect(400);
    },
  );

  it('AC-003-03 GET /products/:id/quote answers 400 for a non-UUID id and 404 for an unknown product', async () => {
    await request(app.getHttpServer())
      .get('/products/nope/quote?quantity=1')
      .expect(400);
    await request(app.getHttpServer())
      .get('/products/00000000-0000-4000-8000-000000000000/quote?quantity=1')
      .expect(404);
  });

  it('documents both routes in Swagger', async () => {
    const res = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);
    const paths = Object.keys(
      (res.body as { paths: Record<string, unknown> }).paths,
    );
    expect(paths).toEqual(
      expect.arrayContaining([
        '/products',
        '/products/{id}',
        '/products/{id}/quote',
      ]),
    );
  });
});
