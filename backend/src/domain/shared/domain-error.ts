export type DomainErrorCode =
  'NOT_FOUND' | 'VALIDATION' | 'OUT_OF_STOCK' | 'CONFLICT' | 'GATEWAY_ERROR';

export interface DomainError {
  readonly code: DomainErrorCode;
  readonly message: string;
}

export const domainError = (
  code: DomainErrorCode,
  message: string,
): DomainError => ({
  code,
  message,
});
