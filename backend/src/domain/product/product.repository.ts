import type { Product } from './product';

/** Port: how the application reads products. Implemented by an infrastructure adapter. */
export interface ProductRepository {
  findAll(): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
}

export const PRODUCT_REPOSITORY = Symbol('ProductRepository');
