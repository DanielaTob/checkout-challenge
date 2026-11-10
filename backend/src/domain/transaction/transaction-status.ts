export const TRANSACTION_STATUSES = [
  'PENDING',
  'APPROVED',
  'DECLINED',
  'ERROR',
] as const;

export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];
export type FinalStatus = Exclude<TransactionStatus, 'PENDING'>;

export const isFinal = (status: TransactionStatus): status is FinalStatus =>
  status !== 'PENDING';
