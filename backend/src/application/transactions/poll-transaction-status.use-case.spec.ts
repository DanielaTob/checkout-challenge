import { domainError } from '../../domain/shared/domain-error';
import { err } from '../../domain/shared/result';
import { FakeClock, FakePaymentGateway } from '../../test/fake-payment-gateway';
import { PollTransactionStatus } from './poll-transaction-status.use-case';

const pending = { id: 'gw-1', status: 'PENDING' as const, statusMessage: null };

describe('PollTransactionStatus', () => {
  it('AC-004-08 reads every 1 s until the status is final', async () => {
    const gateway = new FakePaymentGateway().answerStatuses(
      'PENDING',
      'PENDING',
      'APPROVED',
    );
    const clock = new FakeClock();
    const result = await new PollTransactionStatus(gateway, clock).execute(
      pending,
    );
    expect(result.ok && result.value.status).toBe('APPROVED');
    expect(gateway.getTransaction).toHaveBeenCalledTimes(3);
    expect(clock.sleeps).toEqual([1000, 1000, 1000]);
  });

  it('AC-004-08 gives up after 10 attempts and keeps PENDING', async () => {
    const gateway = new FakePaymentGateway().answerStatuses('PENDING');
    const clock = new FakeClock();
    const result = await new PollTransactionStatus(gateway, clock).execute(
      pending,
    );
    expect(result.ok && result.value.status).toBe('PENDING');
    expect(gateway.getTransaction).toHaveBeenCalledTimes(10);
    expect(clock.sleeps).toHaveLength(10);
  });

  it('AC-004-08 does not poll a status that is already final', async () => {
    const gateway = new FakePaymentGateway();
    await new PollTransactionStatus(gateway, new FakeClock()).execute({
      ...pending,
      status: 'DECLINED',
    });
    expect(gateway.getTransaction).not.toHaveBeenCalled();
  });

  it('AC-004-08 a read error stops polling and keeps the last known status', async () => {
    const gateway = new FakePaymentGateway();
    gateway.getTransaction.mockResolvedValue(
      err(domainError('GATEWAY_ERROR', 'down')),
    );
    const result = await new PollTransactionStatus(
      gateway,
      new FakeClock(),
    ).execute(pending);
    expect(result).toEqual({ ok: true, value: pending });
    expect(gateway.getTransaction).toHaveBeenCalledTimes(1);
  });
});
