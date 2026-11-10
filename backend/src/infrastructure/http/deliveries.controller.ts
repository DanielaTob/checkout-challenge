import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { GetDelivery } from '../../application/deliveries/get-delivery.use-case';
import { unwrapOrThrow } from './result-to-http';
import { DeliveryResponseDto, toDeliveryResponse } from './transaction.dto';

@ApiTags('deliveries')
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly getDelivery: GetDelivery) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Get a delivery (created when a payment is APPROVED)',
  })
  @ApiOkResponse({ type: DeliveryResponseDto })
  @ApiBadRequestResponse({ description: 'id is not a UUID' })
  @ApiNotFoundResponse({ description: 'Delivery not found' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<DeliveryResponseDto> {
    return toDeliveryResponse(
      unwrapOrThrow(await this.getDelivery.execute(id)),
    );
  }
}
