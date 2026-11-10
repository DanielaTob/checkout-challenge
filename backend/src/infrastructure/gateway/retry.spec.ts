import { err, ok } from '../../domain/shared/result';
import { retry } from './retry';

describe('retry', () => {
  it('AC-005-12 retries a failing read up to 2 extra times and stops on success', async () => {
    const fn = jest
      .fn()
      .mockResolvedValueOnce(err('e1'))
      .mockResolvedValueOnce(ok('v'));
    await expect(retry(fn, 2)).resolves.toEqual(ok('v'));
    expect(fn).toHaveBeenCalledTimes(2);

    const always = jest.fn().mockResolvedValue(err('down'));
    await expect(retry(always, 2)).resolves.toEqual(err('down'));
    expect(always).toHaveBeenCalledTimes(3);
  });
});
