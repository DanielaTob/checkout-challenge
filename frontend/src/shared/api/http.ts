import { API_URL } from '../config';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const errorMessage = async (res: Response): Promise<string> => {
  try {
    const body = (await res.json()) as { message?: unknown };
    return typeof body.message === 'string' ? body.message : `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
};

export const getJson = async <T>(path: string, signal?: AbortSignal): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { headers: { Accept: 'application/json' }, signal });
  } catch {
    throw new ApiError(0, 'Network error');
  }
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  return (await res.json()) as T;
};
