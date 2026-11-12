import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetDelivery } from '../application/deliveries/get-delivery.use-case';
import { ApplyTransactionResult } from '../application/transactions/apply-transaction-result.use-case';
import { CreateTransaction } from '../application/transactions/create-transaction.use-case';
import { GetTransaction } from '../application/transactions/get-transaction.use-case';
import { GetTransactionByKey } from '../application/transactions/get-transaction-by-key.use-case';
import { PollTransactionStatus } from '../application/transactions/poll-transaction-status.use-case';
import { RefreshTransaction } from '../application/transactions/refresh-transaction.use-case';
import {
  CUSTOMER_REPOSITORY,
  type CustomerRepository,
} from '../domain/customer/customer.repository';
import {
  DELIVERY_REPOSITORY,
  type DeliveryRepository,
} from '../domain/delivery/delivery.repository';
import {
  PAYMENT_GATEWAY,
  type PaymentGateway,
} from '../domain/payment/payment-gateway';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../domain/product/product.repository';
import { FEES_PROVIDER, type FeesProvider } from '../domain/quote/quote';
import { CLOCK, type Clock, systemClock } from '../domain/shared/clock';
import {
  TRANSACTION_REPOSITORY,
  type TransactionRepository,
} from '../domain/transaction/transaction.repository';
import {
  PAYMENT_EVENTS,
  type PaymentEvents,
} from '../domain/transaction/payment-events';
import { CustomersModule } from './customers.module';
import { gatewayConfigFrom } from './gateway/gateway-config';
import { HttpPaymentGateway } from './gateway/http-payment-gateway';
import { LogPaymentEvents } from './observability/log-payment-events';
import { DeliveriesController } from './http/deliveries.controller';
import { TransactionsController } from './http/transactions.controller';
import { PrismaDeliveryRepository } from './prisma/prisma-delivery.repository';
import { PrismaTransactionRepository } from './prisma/prisma-transaction.repository';
import { ProductsModule } from './products.module';

/** Wires transactions and deliveries: ports → adapters, use cases built by factory. */
@Module({
  imports: [ProductsModule, CustomersModule],
  controllers: [TransactionsController, DeliveriesController],
  providers: [
    { provide: TRANSACTION_REPOSITORY, useClass: PrismaTransactionRepository },
    { provide: DELIVERY_REPOSITORY, useClass: PrismaDeliveryRepository },
    {
      provide: GetDelivery,
      useFactory: (repo: DeliveryRepository) => new GetDelivery(repo),
      inject: [DELIVERY_REPOSITORY],
    },
    {
      provide: PAYMENT_GATEWAY,
      useFactory: (config: ConfigService) =>
        new HttpPaymentGateway(gatewayConfigFrom(config)),
      inject: [ConfigService],
    },
    { provide: CLOCK, useValue: systemClock },
    {
      provide: PollTransactionStatus,
      useFactory: (gateway: PaymentGateway, clock: Clock) =>
        new PollTransactionStatus(gateway, clock),
      inject: [PAYMENT_GATEWAY, CLOCK],
    },
    { provide: PAYMENT_EVENTS, useValue: new LogPaymentEvents() },
    {
      provide: ApplyTransactionResult,
      useFactory: (repo: TransactionRepository, events: PaymentEvents) =>
        new ApplyTransactionResult(repo, events),
      inject: [TRANSACTION_REPOSITORY, PAYMENT_EVENTS],
    },
    {
      provide: RefreshTransaction,
      useFactory: (gateway: PaymentGateway, apply: ApplyTransactionResult) =>
        new RefreshTransaction(gateway, apply),
      inject: [PAYMENT_GATEWAY, ApplyTransactionResult],
    },
    {
      provide: CreateTransaction,
      useFactory: (
        products: ProductRepository,
        customers: CustomerRepository,
        transactions: TransactionRepository,
        gateway: PaymentGateway,
        fees: FeesProvider,
        clock: Clock,
        poll: PollTransactionStatus,
        apply: ApplyTransactionResult,
        refresh: RefreshTransaction,
        events: PaymentEvents,
      ) =>
        new CreateTransaction({
          products,
          customers,
          transactions,
          gateway,
          fees,
          clock,
          poll,
          apply,
          refresh,
          events,
        }),
      inject: [
        PRODUCT_REPOSITORY,
        CUSTOMER_REPOSITORY,
        TRANSACTION_REPOSITORY,
        PAYMENT_GATEWAY,
        FEES_PROVIDER,
        CLOCK,
        PollTransactionStatus,
        ApplyTransactionResult,
        RefreshTransaction,
        PAYMENT_EVENTS,
      ],
    },
    {
      provide: GetTransaction,
      useFactory: (repo: TransactionRepository, refresh: RefreshTransaction) =>
        new GetTransaction(repo, refresh),
      inject: [TRANSACTION_REPOSITORY, RefreshTransaction],
    },
    {
      provide: GetTransactionByKey,
      useFactory: (repo: TransactionRepository, refresh: RefreshTransaction) =>
        new GetTransactionByKey(repo, refresh),
      inject: [TRANSACTION_REPOSITORY, RefreshTransaction],
    },
  ],
})
export class CheckoutModule {}
