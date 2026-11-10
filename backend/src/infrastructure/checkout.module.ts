import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplyTransactionResult } from '../application/transactions/apply-transaction-result.use-case';
import { CreateTransaction } from '../application/transactions/create-transaction.use-case';
import { GetTransaction } from '../application/transactions/get-transaction.use-case';
import { PollTransactionStatus } from '../application/transactions/poll-transaction-status.use-case';
import { RefreshTransaction } from '../application/transactions/refresh-transaction.use-case';
import {
  CUSTOMER_REPOSITORY,
  type CustomerRepository,
} from '../domain/customer/customer.repository';
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
import { CustomersModule } from './customers.module';
import { gatewayConfigFrom } from './gateway/gateway-config';
import { HttpPaymentGateway } from './gateway/http-payment-gateway';
import { TransactionsController } from './http/transactions.controller';
import { PrismaTransactionRepository } from './prisma/prisma-transaction.repository';
import { ProductsModule } from './products.module';

/** Wires transactions and deliveries: ports → adapters, use cases built by factory. */
@Module({
  imports: [ProductsModule, CustomersModule],
  controllers: [TransactionsController],
  providers: [
    { provide: TRANSACTION_REPOSITORY, useClass: PrismaTransactionRepository },
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
    {
      provide: ApplyTransactionResult,
      useFactory: (repo: TransactionRepository) =>
        new ApplyTransactionResult(repo),
      inject: [TRANSACTION_REPOSITORY],
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
      ],
    },
    {
      provide: GetTransaction,
      useFactory: (repo: TransactionRepository, refresh: RefreshTransaction) =>
        new GetTransaction(repo, refresh),
      inject: [TRANSACTION_REPOSITORY, RefreshTransaction],
    },
  ],
})
export class CheckoutModule {}
