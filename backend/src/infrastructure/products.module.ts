import { Module } from '@nestjs/common';
import { GetProduct } from '../application/products/get-product.use-case';
import { ListProducts } from '../application/products/list-products.use-case';
import {
  PRODUCT_REPOSITORY,
  type ProductRepository,
} from '../domain/product/product.repository';
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
  ],
})
export class ProductsModule {}
