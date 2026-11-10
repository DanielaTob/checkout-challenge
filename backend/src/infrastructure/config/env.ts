import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  validateSync,
} from 'class-validator';

export class Env {
  @IsString() DATABASE_URL!: string;
  @IsUrl({ require_tld: false }) GATEWAY_BASE_URL!: string;
  @IsString() GATEWAY_PUBLIC_KEY!: string;
  @IsString() GATEWAY_PRIVATE_KEY!: string;
  @IsString() GATEWAY_INTEGRITY_SECRET!: string;
  @IsOptional() @IsString() GATEWAY_EVENTS_SECRET?: string;
  @IsInt() @Min(0) BASE_FEE_IN_CENTS!: number;
  @IsInt() @Min(0) DELIVERY_FEE_IN_CENTS!: number;
  /** Comma-separated list of allowed origins for CORS. */
  @IsOptional() @IsString() CORS_ORIGINS?: string;
}

export const validateEnv = (raw: Record<string, unknown>): Env => {
  const env = plainToInstance(Env, raw, { enableImplicitConversion: true });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length > 0) {
    // Only property names are reported, never values (they may be secrets).
    const names = errors.map((e) => e.property).join(', ');
    throw new Error(`Invalid environment variables: ${names}`);
  }
  return env;
};
