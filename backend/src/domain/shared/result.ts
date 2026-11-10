/**
 * Railway Oriented Programming: every use case returns a Result instead of throwing
 * for business errors. The HTTP layer translates the failure track into a status code.
 */
export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export const map = <T, U, E>(r: Result<T, E>, fn: (v: T) => U): Result<U, E> =>
  r.ok ? ok(fn(r.value)) : r;

export const andThen = <T, U, E>(
  r: Result<T, E>,
  fn: (v: T) => Result<U, E>,
): Result<U, E> => (r.ok ? fn(r.value) : r);

export const andThenAsync = async <T, U, E>(
  r: Result<T, E> | Promise<Result<T, E>>,
  fn: (v: T) => Promise<Result<U, E>>,
): Promise<Result<U, E>> => {
  const resolved = await r;
  return resolved.ok ? fn(resolved.value) : resolved;
};
