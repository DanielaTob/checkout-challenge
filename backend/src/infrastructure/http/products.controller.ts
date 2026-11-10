import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetProduct } from '../../application/products/get-product.use-case';
import { ListProducts } from '../../application/products/list-products.use-case';
import { QuoteCheckout } from '../../application/quote/quote-checkout.use-case';
import { ProductResponseDto } from './product-response.dto';
import { QuoteQueryDto, QuoteResponseDto } from './quote.dto';
import { unwrapOrThrow } from './result-to-http';

/** HTTP adapter only: delegates to use cases and maps the Result to HTTP. */
@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly listProducts: ListProducts,
    private readonly getProduct: GetProduct,
    private readonly quoteCheckout: QuoteCheckout,
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

  @Get(':id/quote')
  @ApiOperation({
    summary: 'Payment breakdown: subtotal + base fee + delivery fee',
  })
  @ApiOkResponse({ type: QuoteResponseDto })
  @ApiBadRequestResponse({
    description: 'id is not a UUID or quantity is not an integer 1..10',
  })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiConflictResponse({ description: 'Not enough stock' })
  async quote(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: QuoteQueryDto,
  ): Promise<QuoteResponseDto> {
    return unwrapOrThrow(await this.quoteCheckout.execute(id, query.quantity));
  }
}
