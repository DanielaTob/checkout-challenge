import { Logger } from '@nestjs/common';
import { captureStdout } from '../../test/capture-stdout';
import { JsonLogger } from './json-logger';
import { REDACTED } from './redact';
import { requestContext } from './request-context';

const NOW = new Date('2026-11-11T12:00:00.000Z');
const make = (level?: string) => {
  const lines: string[] = [];
  const logger = new JsonLogger({
    level,
    write: (l) => void lines.push(l),
    now: () => NOW,
  });
  const json = () => lines.map((l) => JSON.parse(l) as Record<string, unknown>);
  return { logger, lines, json };
};

afterEach(() => jest.restoreAllMocks());

describe('JsonLogger (spec 010)', () => {
  it('AC-010-05 writes one JSON line per call with timestamp, level, context and message', () => {
    const { logger, lines, json } = make('debug');
    logger.log('Nest application successfully started', 'NestApplication');
    logger.warn('tokenize failed with HTTP 503', 'PaymentGateway');
    logger.debug('details', 'X');
    logger.verbose('more', 'X');
    logger.fatal('boom', 'X');
    expect(
      lines.every((l) => l.endsWith('\n') && !l.slice(0, -1).includes('\n')),
    ).toBe(true);
    expect(json()).toEqual([
      {
        timestamp: '2026-11-11T12:00:00.000Z',
        level: 'info',
        context: 'NestApplication',
        message: 'Nest application successfully started',
      },
      {
        timestamp: '2026-11-11T12:00:00.000Z',
        level: 'warn',
        context: 'PaymentGateway',
        message: 'tokenize failed with HTTP 503',
      },
      expect.objectContaining({ level: 'debug', message: 'details' }),
      expect.objectContaining({ level: 'debug', message: 'more' }),
      expect.objectContaining({ level: 'fatal', message: 'boom' }),
    ]);
  });

  it('AC-010-05 errors keep the stack apart from the context; Error objects and structured messages are fields', () => {
    const { logger, json } = make();
    logger.error(
      'Unhandled',
      'Error: x\n    at foo (a.ts:1:1)',
      'ExceptionsHandler',
    );
    logger.error(new Error('kaput'), 'Svc');
    logger.log({ event: 'http.request', statusCode: 200 }, 'Http');
    const [a, b, c] = json();
    expect(a).toMatchObject({
      level: 'error',
      context: 'ExceptionsHandler',
      message: 'Unhandled',
    });
    expect(String(a.stack)).toContain('at foo');
    expect(b).toMatchObject({
      level: 'error',
      context: 'Svc',
      message: 'kaput',
    });
    expect(String(b.stack)).toContain('kaput');
    expect(c).toMatchObject({
      level: 'info',
      event: 'http.request',
      statusCode: 200,
    });
    expect(c).not.toHaveProperty('message');
  });

  it('AC-010-05 a logged object cannot overwrite timestamp, level, context or requestId', () => {
    const { logger, json } = make();
    requestContext.run({ requestId: 'req-real' }, () =>
      logger.warn(
        {
          event: 'x',
          timestamp: 'fake',
          level: 'debug',
          context: 'Fake',
          requestId: 'req-fake',
        },
        'Real',
      ),
    );
    expect(json()[0]).toEqual({
      timestamp: '2026-11-11T12:00:00.000Z',
      level: 'warn',
      context: 'Real',
      requestId: 'req-real',
      event: 'x',
    });
    expect(Object.keys(json()[0]).slice(0, 4)).toEqual([
      'timestamp',
      'level',
      'context',
      'requestId',
    ]);
  });

  it('AC-010-05 adds the requestId of the current request and none outside a request', () => {
    const { logger, json } = make();
    logger.log('boot');
    requestContext.run({ requestId: 'req-1' }, () => logger.log('inside'));
    expect(json()[0]).not.toHaveProperty('requestId');
    expect(json()[1]).toMatchObject({ requestId: 'req-1', message: 'inside' });
  });

  it('AC-010-05 writes straight to process.stdout (no console.*, so Lambda adds no prefix)', () => {
    const out = captureStdout();
    const consoleLog = jest.spyOn(console, 'log');
    try {
      new JsonLogger().log('hello', 'Ctx');
    } finally {
      out.restore();
    }
    expect(consoleLog).not.toHaveBeenCalled();
    expect(out.json()).toEqual([
      expect.objectContaining({ message: 'hello', context: 'Ctx' }),
    ]);
  });

  it('AC-010-05 Nest Logger instances go through it once installed as the app logger', () => {
    const { logger, json } = make();
    Logger.overrideLogger(logger);
    try {
      new Logger('PaymentGateway').warn('merchant timed out');
    } finally {
      Logger.overrideLogger(false);
    }
    expect(json()).toEqual([
      expect.objectContaining({
        level: 'warn',
        context: 'PaymentGateway',
        message: 'merchant timed out',
      }),
    ]);
  });

  it.each([
    ['warn', ['warn', 'error', 'fatal']],
    ['error', ['error', 'fatal']],
    ['debug', ['debug', 'info', 'warn', 'error', 'fatal']],
    [undefined, ['info', 'warn', 'error', 'fatal']],
    ['nonsense', ['info', 'warn', 'error', 'fatal']],
    ['silent', []],
  ])('AC-010-04 LOG_LEVEL=%s keeps only %j', (level, kept) => {
    const { logger, json } = make(level);
    logger.debug('d');
    logger.log('i');
    logger.warn('w');
    logger.error('e');
    logger.fatal('f');
    expect(json().map((e) => e.level)).toEqual(kept);
  });

  it('AC-010-07 a card number or CVC logged by mistake comes out as [REDACTED]', () => {
    const { logger, lines } = make();
    logger.log('card 4242424242424242 charged');
    logger.log({
      event: 'oops',
      card: { number: '4242424242424242', cvc: '123' },
    });
    const text = lines.join('');
    expect(text).not.toContain('4242424242424242');
    expect(text).not.toContain('"123"');
    expect(text.split(REDACTED).length - 1).toBe(3);
  });
});
