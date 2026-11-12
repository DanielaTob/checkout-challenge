/** Captures every line written to process.stdout (where JsonLogger writes) and parses JSON ones. */
export const captureStdout = () => {
  const raw: string[] = [];
  const spy = jest
    .spyOn(process.stdout, 'write')
    .mockImplementation((chunk: string | Uint8Array) => {
      raw.push(String(chunk));
      return true;
    });
  const lines = () => raw.join('').split('\n').filter(Boolean);
  const json = () =>
    lines().map((l) => JSON.parse(l) as Record<string, unknown>);
  return { raw, lines, json, restore: () => spy.mockRestore() };
};

/** Runs `fn` with LOG_LEVEL set, restoring the previous value afterwards. */
export const withLogLevel = async <T>(
  level: string,
  fn: () => Promise<T>,
): Promise<T> => {
  const previous = process.env.LOG_LEVEL;
  process.env.LOG_LEVEL = level;
  try {
    return await fn();
  } finally {
    process.env.LOG_LEVEL = previous;
  }
};
