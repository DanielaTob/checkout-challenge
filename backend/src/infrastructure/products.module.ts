import { Module } from '@nestjs/common';
import { GetProduct } from '../application/products/get-product.use-case';
import { ListProducts } from '../application/products/list-products.use-case';
import { QuoteCheckout } from '../application/quote/quote-checkout.use-case';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../domain/product/product.repository';
import { FEES_PROVIDER, type FeesProvider } from '../domain/quote/quote';
import { ConfigFeesProvider } from './config/config-fees.provider';
import { ProductsController } from './http/products.controller';
import { PrismaProductRepository } from './prisma/prisma-product.repository';

/** Wires the products slice: port → Prisma adapter, use cases built by factory (framework-free). */
@Module({
  controllers: [ProductsController],
  providers: [
    { provide: PRODUCT_REPOSITORY, useClass: PrismaProductRepository },
    {
      provide: ListProducts,
      useFactory: (repo: ProductRepository) => new ListProducts(repo),
      inject: [PRODUCT_REPOSITORY],
    },
    {
      provide: GetProduct,
      useFactory: (repo: ProductRepository) => new GetProduct(repo),
      inject: [PRODUCT_REPOSITORY],
    },
    { provide: FEES_PROVIDER, useClass: ConfigFeesProvider },
    {
      provide: QuoteCheckout,
      useFactory: (repo: ProductRepository, fees: FeesProvider) =>
        new QuoteCheckout(repo, fees),
      inject: [PRODUCT_REPOSITORY, FEES_PROVIDER],
    },
  ],
  exports: [PRODUCT_REPOSITORY, FEES_PROVIDER],
})
export class ProductsModule {}
