import { HttpStatus } from '@nestjs/common';
import { domainError, DomainErrorCode } from '../../domain/shared/domain-error';
import { err, ok } from '../../domain/shared/result';
import { toHttpException, unwrapOrThrow } from './result-to-http';

describe('Result → HTTP', () => {
  it.each<[DomainErrorCode, HttpStatus]>([
    ['NOT_FOUND', HttpStatus.NOT_FOUND],
    ['VALIDATION', HttpStatus.UNPROCESSABLE_ENTITY],
    ['OUT_OF_STOCK', HttpStatus.CONFLICT],
    ['CONFLICT', HttpStatus.CONFLICT],
    ['GATEWAY_ERROR', HttpStatus.BAD_GATEWAY],
  ])('maps %s to %i', (code, status) => {
    expect(toHttpException(domainError(code, 'msg')).getStatus()).toBe(status);
  });

  it('unwrapOrThrow returns the value or throws the mapped exception', () => {
    expect(unwrapOrThrow(ok('v'))).toBe('v');
    expect(() => unwrapOrThrow(err(domainError('NOT_FOUND', 'nope')))).toThrow(
      'nope',
    );
  });
});
