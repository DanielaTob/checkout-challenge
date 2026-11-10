import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types';
import { configureApp } from '../configure-app';
import { DELIVERY_REPOSITORY } from '../domain/delivery/delivery.repository';
import { CUSTOMER_REPOSITORY } from '../domain/customer/customer.repository';
import {
  PAYMENT_GATEWAY,
  type PaymentGateway,
} from '../domain/payment/payment-gateway';
import { PRODUCT_REPOSITORY } from '../domain/product/product.repository';
import { FEES_PROVIDER } from '../domain/quote/quote';
import { CLOCK } from '../domain/shared/clock';
import { TRANSACTION_REPOSITORY } from '../domain/transaction/transaction.repository';
import { CheckoutModule } from '../infrastructure/checkout.module';
import { checkoutFixture } from './checkout-fixture';

/** Boots the real HTTP stack (pipes, filters, controllers) on in-memory adapters. */
export const bootCheckoutApp = async (stock = 5, gateway?: PaymentGateway) => {
  const f = checkoutFixture(stock);
  const moduleRef = await Test.createTestingModule({
    imports: [CheckoutModule],
  })
    .overrideProvider(PRODUCT_REPOSITORY)
    .useValue(f.products)
    .overrideProvider(CUSTOMER_REPOSITORY)
    .useValue(f.customers)
    .overrideProvider(TRANSACTION_REPOSITORY)
    .useValue(f.transactions)
    .overrideProvider(PAYMENT_GATEWAY)
    .useValue(gateway ?? f.gateway)
    .overrideProvider(FEES_PROVIDER)
    .useValue(f.fees)
    .overrideProvider(CLOCK)
    .useValue(f.clock)
    .overrideProvider(DELIVERY_REPOSITORY)
    .useValue(f.transactions.deliveries)
    .compile();
  const app: INestApplication<App> = moduleRef.createNestApplication();
  configureApp(app, undefined);
  await app.init();
  return { app, ...f };
};
