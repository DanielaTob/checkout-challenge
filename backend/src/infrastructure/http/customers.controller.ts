import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CreateCustomer } from '../../application/customers/create-customer.use-case';
import { CreateCustomerDto, CustomerResponseDto } from './customer.dto';
import { unwrapOrThrow } from './result-to-http';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly createCustomer: CreateCustomer) {}

  @Post()
  @ApiOperation({ summary: 'Create a customer or reuse it by email' })
  @ApiCreatedResponse({ type: CustomerResponseDto, description: 'Created' })
  @ApiOkResponse({
    type: CustomerResponseDto,
    description: 'Email already existed: same id, data updated',
  })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  async create(
    @Body() body: CreateCustomerDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CustomerResponseDto> {
    const { customer, created } = unwrapOrThrow(
      await this.createCustomer.execute(body),
    );
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return customer;
  }
}
