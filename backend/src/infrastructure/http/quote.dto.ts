import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { MAX_QUANTITY } from '../../domain/quote/quote';

export class QuoteQueryDto {
  @ApiProperty({ example: 1, minimum: 1, maximum: MAX_QUANTITY })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_QUANTITY)
  quantity!: number;
}

export class QuoteResponseDto {
  @ApiProperty({ format: 'uuid' }) productId!: string;
  @ApiProperty({ example: 2 }) quantity!: number;
  @ApiProperty({ example: 24990000 }) unitPriceInCents!: number;
  @ApiProperty({ example: 49980000 }) subtotalInCents!: number;
  @ApiProperty({ example: 300000 }) baseFeeInCents!: number;
  @ApiProperty({ example: 1000000 }) deliveryFeeInCents!: number;
  @ApiProperty({ example: 51280000 }) totalInCents!: number;
  @ApiProperty({ example: 'COP' }) currency!: string;
}
