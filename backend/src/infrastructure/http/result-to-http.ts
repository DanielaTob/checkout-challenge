import {
  BadGatewayException,
  ConflictException,
  HttpException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DomainError } from '../../domain/shared/domain-error';
import { Result } from '../../domain/shared/result';

export const toHttpException = (error: DomainError): HttpException => {
  switch (error.code) {
    case 'NOT_FOUND':
      return new NotFoundException(error.message);
    case 'VALIDATION':
      return new UnprocessableEntityException(error.message);
    case 'OUT_OF_STOCK':
    case 'CONFLICT':
      return new ConflictException(error.message);
    case 'GATEWAY_ERROR':
      return new BadGatewayException(error.message);
  }
};

/** Unwraps the success track or throws the matching HTTP exception. */
export const unwrapOrThrow = <T>(result: Result<T, DomainError>): T => {
  if (result.ok) return result.value;
  throw toHttpException(result.error);
};
