import { createHash } from 'node:crypto';

/** Integrity signature the gateway expects: sha256(reference + amount + currency + secret), hex. */
export const integritySignature = (
  reference: string,
  amountInCents: number,
  currency: string,
  secret: string,
): string =>
  createHash('sha256')
    .update(`${reference}${amountInCents}${currency}${secret}`)
    .digest('hex');
