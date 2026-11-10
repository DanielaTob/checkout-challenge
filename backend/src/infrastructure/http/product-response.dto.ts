import { ApiProperty } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '6f1d2c3a-0000-4000-8000-000000000001',
  })
  id!: string;

  @ApiProperty({ example: 'Audífonos inalámbricos' })
  name!: string;

  @ApiProperty({
    example: 'Audífonos over-ear con cancelación de ruido y 30 h de batería.',
  })
  description!: string;

  @ApiProperty({ example: '/images/headphones.webp' })
  imageUrl!: string;

  @ApiProperty({ example: 24990000, description: 'Price in COP cents' })
  priceInCents!: number;

  @ApiProperty({ example: 10, minimum: 0 })
  stock!: number;
}
