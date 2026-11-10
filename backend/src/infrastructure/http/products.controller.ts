import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetProduct } from '../../application/products/get-product.use-case';
import { ListProducts } from '../../application/products/list-products.use-case';
import { ProductResponseDto } from './product-response.dto';
import { unwrapOrThrow } from './result-to-http';

/** HTTP adapter only: delegates to use cases and maps the Result to HTTP. */
@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly listProducts: ListProducts,
    private readonly getProduct: GetProduct,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List products with their current stock' })
  @ApiOkResponse({ type: [ProductResponseDto] })
  async findAll(): Promise<ProductResponseDto[]> {
    return unwrapOrThrow(await this.listProducts.execute());
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one product with its current stock' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiBadRequestResponse({ description: 'id is not a UUID' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ProductResponseDto> {
    return unwrapOrThrow(await this.getProduct.execute(id));
  }
}
