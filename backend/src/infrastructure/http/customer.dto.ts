import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Ana Pérez', minLength: 2, maxLength: 120 })
  @IsString()
  @Length(2, 120)
  fullName!: string;

  @ApiProperty({ example: 'ana@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '+573001234567', pattern: '^\\+?\\d{7,15}$' })
  @Matches(/^\+?\d{7,15}$/, { message: 'phone must have 7 to 15 digits' })
  phone!: string;
}

export class CustomerResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Ana Pérez' }) fullName!: string;
  @ApiProperty({ example: 'ana@example.com' }) email!: string;
  @ApiProperty({ example: '+573001234567' }) phone!: string;
}
