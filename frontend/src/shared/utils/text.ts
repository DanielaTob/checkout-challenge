const HEAD = 7;
const TAIL = 4;

/** "TX-c92a8f13-…-5e8b1a7c2661" → "TX-c92a…2661" (short values stay whole). */
export const truncateMiddle = (value: string): string =>
  value.length <= HEAD + TAIL + 3 ? value : `${value.slice(0, HEAD)}…${value.slice(-TAIL)}`;
