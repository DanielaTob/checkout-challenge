import type { LoggerService } from '@nestjs/common';
import { redact } from './redact';
import { currentRequestId } from './request-context';

/**
 * NestJS logger that writes one JSON object per line straight to stdout (spec 010). Using
 * process.stdout.write instead of console.* keeps the Lambda runtime from prefixing the line,
 * so CloudWatch metric filters can match JSON fields (`{ $.event = "payment.finalized" }`).
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const ORDER: Record<LogLevel | 'silent', number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
  silent: 99,
};

const isLevel = (v: string | undefined): v is keyof typeof ORDER =>
  v !== undefined && v in ORDER;

export interface JsonLoggerOptions {
  /** Minimum level (LOG_LEVEL); unknown values fall back to info. `silent` writes nothing. */
  readonly level?: string;
  readonly write?: (line: string) => void;
  readonly now?: () => Date;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' &&
  v !== null &&
  !Array.isArray(v) &&
  !(v instanceof Error);

const looksLikeStack = (v: string) => /\n\s+at /.test(v);

export class JsonLogger implements LoggerService {
  private readonly threshold: number;
  private readonly out: (line: string) => void;
  private readonly now: () => Date;

  constructor(options: JsonLoggerOptions = {}) {
    const level = options.level?.toLowerCase();
    this.threshold = ORDER[isLevel(level) ? level : 'info'];
    this.out = options.write ?? ((line) => void process.stdout.write(line));
    this.now = options.now ?? (() => new Date());
  }

  log(message: unknown, ...params: unknown[]): void {
    this.write('info', message, params);
  }
  error(message: unknown, ...params: unknown[]): void {
    this.write('error', message, params);
  }
  warn(message: unknown, ...params: unknown[]): void {
    this.write('warn', message, params);
  }
  debug(message: unknown, ...params: unknown[]): void {
    this.write('debug', message, params);
  }
  verbose(message: unknown, ...params: unknown[]): void {
    this.write('debug', message, params);
  }
  fatal(message: unknown, ...params: unknown[]): void {
    this.write('fatal', message, params);
  }

  private write(level: LogLevel, message: unknown, params: unknown[]): void {
    if (ORDER[level] < this.threshold) return;
    // Nest appends the logger context as the last string param; error() may pass a stack first.
    const strings = params.filter((p): p is string => typeof p === 'string');
    const context =
      strings.length > 0 && !looksLikeStack(strings[strings.length - 1])
        ? strings[strings.length - 1]
        : undefined;
    const stack = strings.find(looksLikeStack);
    const requestId = currentRequestId();

    let body: Record<string, unknown>;
    if (message instanceof Error) {
      body = { message: message.message, stack: message.stack };
    } else if (isPlainObject(message)) {
      body = { ...message };
    } else {
      body = { message: String(message) };
    }

    const entry = redact({
      timestamp: this.now().toISOString(),
      level,
      ...(context ? { context } : {}),
      ...(requestId ? { requestId } : {}),
      ...body,
      ...(stack ? { stack } : {}),
    });
    this.out(`${JSON.stringify(entry)}\n`);
  }
}
