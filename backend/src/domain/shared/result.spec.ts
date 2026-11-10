import { andThen, andThenAsync, err, map, ok, Result } from './result';

describe('Result (ROP)', () => {
  it('ok/err build both tracks', () => {
    expect(ok(1)).toEqual({ ok: true, value: 1 });
    expect(err('boom')).toEqual({ ok: false, error: 'boom' });
  });

  it('map only transforms the success track', () => {
    expect(map(ok(2), (v) => v * 2)).toEqual(ok(4));
    const failed = err('e') as Result<number, string>;
    expect(map(failed, (v) => v * 2)).toEqual(err('e'));
  });

  it('andThen chains and short-circuits on failure', () => {
    const half = (v: number): Result<number, string> =>
      v % 2 === 0 ? ok(v / 2) : err('odd');
    expect(andThen(ok(4), half)).toEqual(ok(2));
    expect(andThen(ok(3), half)).toEqual(err('odd'));
    expect(andThen(err<string>('first'), half)).toEqual(err('first'));
  });

  it('andThenAsync chains promises and short-circuits', async () => {
    const next = jest.fn((v: number) => Promise.resolve(ok(v + 1)));
    await expect(andThenAsync(Promise.resolve(ok(1)), next)).resolves.toEqual(
      ok(2),
    );
    await expect(andThenAsync(err<string>('x'), next)).resolves.toEqual(
      err('x'),
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});
