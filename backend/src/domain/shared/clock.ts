/** Port: time, injectable so that polling and expiry checks are deterministic in tests. */
export interface Clock {
  now(): Date;
  sleep(ms: number): Promise<void>;
}

export const CLOCK = Symbol('Clock');

export const systemClock: Clock = {
  now: () => new Date(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};
