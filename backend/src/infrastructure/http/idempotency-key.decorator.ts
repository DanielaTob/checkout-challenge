import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** Reads the Idempotency-Key header (pipes can be attached, unlike @Headers). */
export const IdempotencyKey = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined =>
    ctx.switchToHttp().getRequest<Request>().header('idempotency-key'),
);
