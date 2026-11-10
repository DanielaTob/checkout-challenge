import { Module } from '@nestjs/common';
import { CreateCustomer } from '../application/customers/create-customer.use-case';
import {
  CUSTOMER_REPOSITORY,
  type CustomerRepository,
} from '../domain/customer/customer.repository';
import { CustomersController } from './http/customers.controller';
import { PrismaCustomerRepository } from './prisma/prisma-customer.repository';

@Module({
  controllers: [CustomersController],
  providers: [
    { provide: CUSTOMER_REPOSITORY, useClass: PrismaCustomerRepository },
    {
      provide: CreateCustomer,
      useFactory: (repo: CustomerRepository) => new CreateCustomer(repo),
      inject: [CUSTOMER_REPOSITORY],
    },
  ],
  exports: [CUSTOMER_REPOSITORY],
})
export class CustomersModule {}
