import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsObject,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import type { Delivery } from '../../domain/delivery/delivery';
import { CURRENCY, MAX_QUANTITY } from '../../domain/quote/quote';
import type { Transaction } from '../../domain/transaction/transaction';
import { TRANSACTION_STATUSES } from '../../domain/transaction/transaction-status';

export class ShippingDto {
  @ApiProperty({ example: 'Calle 1 # 2-3' })
  @IsString()
  @Length(5, 200)
  address!: string;

  @ApiProperty({ example: 'Bogotá' })
  @IsString()
  @Length(2, 80)
  city!: string;

  @ApiProperty({ example: 'Cundinamarca' })
  @IsString()
  @Length(2, 80)
  region!: string;

  @ApiProperty({ example: '110111' })
  @Matches(/^[A-Za-z0-9 -]{3,10}$/, { message: 'postalCode is not valid' })
  postalCode!: string;
}

/**
 * Raw card data: only format is checked here (400). Luhn, expiry and brand are business
 * rules checked in the domain (422). Never logged, stored or returned.
 */
export class CardDto {
  @ApiProperty({ example: '4242424242424242', description: 'Digits only' })
  @Matches(/^\d{13,19}$/, { message: 'card number must have 13 to 19 digits' })
  number!: string;

  @ApiProperty({ example: '123' })
  @Matches(/^\d{3,4}$/, { message: 'cvc must have 3 or 4 digits' })
  cvc!: string;

  @ApiProperty({ example: '12', description: 'MM' })
  @Matches(/^\d{2}$/, { message: 'expMonth must be MM' })
  expMonth!: string;

  @ApiProperty({ example: '29', description: 'YY' })
  @Matches(/^\d{2}$/, { message: 'expYear must be YY' })
  expYear!: string;

  @ApiProperty({ example: 'Ana Perez' })
  @IsString()
  @Length(5, 60)
  holderName!: string;
}

export class CreateTransactionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: MAX_QUANTITY })
  @IsInt()
  @Min(1)
  @Max(MAX_QUANTITY)
  quantity!: number;

  @ApiProperty({ type: ShippingDto })
  @IsObject()
  @ValidateNested()
  @Type(() => ShippingDto)
  shipping!: ShippingDto;

  @ApiProperty({ type: CardDto })
  @IsObject()
  @ValidateNested()
  @Type(() => CardDto)
  card!: CardDto;
}

export class DeliveryResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) transactionId!: string;
  @ApiProperty({ format: 'uuid' }) customerId!: string;
  @ApiProperty({ example: 'Calle 1 # 2-3' }) address!: string;
  @ApiProperty({ example: 'Bogotá' }) city!: string;
  @ApiProperty({ example: 'Cundinamarca' }) region!: string;
  @ApiProperty({ example: '110111' }) postalCode!: string;
  @ApiProperty({ enum: ['PENDING', 'DISPATCHED', 'DELIVERED'] })
  status!: string;
}

export class TransactionResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'TX-6f1d2c3a-…' }) reference!: string;
  @ApiProperty({ enum: TRANSACTION_STATUSES }) status!: string;
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty({ format: 'uuid' }) customerId!: string;
  @ApiProperty({ example: 2 }) quantity!: number;
  @ApiProperty({ example: 49980000 }) subtotalInCents!: number;
  @ApiProperty({ example: 300000 }) baseFeeInCents!: number;
  @ApiProperty({ example: 1000000 }) deliveryFeeInCents!: number;
  @ApiProperty({ example: 51280000 }) totalInCents!: number;
  @ApiProperty({ example: CURRENCY }) currency!: string;
  @ApiProperty({ example: 'VISA', nullable: true, type: String })
  cardBrand!: string | null;
  @ApiProperty({ example: '4242', nullable: true, type: String })
  cardLast4!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String })
  failureReason!: string | null;
  @ApiProperty({ type: DeliveryResponseDto, nullable: true })
  delivery!: DeliveryResponseDto | null;
  @ApiProperty() createdAt!: string;
}

export const toDeliveryResponse = (d: Delivery): DeliveryResponseDto => ({
  id: d.id,
  transactionId: d.transactionId,
  customerId: d.customerId,
  address: d.address,
  city: d.city,
  region: d.region,
  postalCode: d.postalCode,
  status: d.status,
});

/** Explicit allow-list: internal fields (idempotency key, gateway id, shipping copy) stay inside. */
export const toTransactionResponse = (
  t: Transaction,
): TransactionResponseDto => ({
  id: t.id,
  reference: t.reference,
  status: t.status,
  productId: t.productId,
  customerId: t.customerId,
  quantity: t.quantity,
  subtotalInCents: t.amountInCents - t.baseFeeInCents - t.deliveryFeeInCents,
  baseFeeInCents: t.baseFeeInCents,
  deliveryFeeInCents: t.deliveryFeeInCents,
  totalInCents: t.amountInCents,
  currency: CURRENCY,
  cardBrand: t.cardBrand,
  cardLast4: t.cardLast4,
  failureReason: t.failureReason,
  delivery: t.delivery ? toDeliveryResponse(t.delivery) : null,
  createdAt: t.createdAt.toISOString(),
});
