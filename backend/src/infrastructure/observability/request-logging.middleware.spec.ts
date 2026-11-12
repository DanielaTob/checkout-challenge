import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { requestLogging } from './request-logging.middleware';

const fakeReqRes = () => {
  const req = {
    method: 'POST',
    originalUrl: '/transactions?x=1',
    url: '/transactions?x=1',
    header: () => undefined,
  } as unknown as Request;
  const res = Object.assign(new EventEmitter(), {
    statusCode: 200,
    writableFinished: false,
    writableEnded: false,
    setHeader: jest.fn(),
  });
  return { req, res };
};

afterEach(() => jest.restoreAllMocks());

describe('requestLogging middleware (spec 010)', () => {
  it('AC-010-01 a connection closed before the response finished is logged once as 499 aborted, not as the default 200', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const { req, res } = fakeReqRes();
    const next: NextFunction = jest.fn();
    requestLogging(req, res as unknown as Response, next);
    expect(next).toHaveBeenCalledTimes(1);

    res.emit('close');
    res.emit('close');

    expect(log).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'http.request',
        path: '/transactions',
        statusCode: 499,
        aborted: true,
      }),
    );
  });

  it('AC-010-01 on Lambda (serverless-express: writableFinished never true) a finished response logs its real status, not 499', () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const { req, res } = fakeReqRes();
    requestLogging(req, res as unknown as Response, jest.fn());
    res.statusCode = 201;
    res.writableEnded = true; // the app called end(); the fake socket never "finishes"
    res.emit('close'); // close can arrive first
    res.emit('finish');
    expect(warn).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toMatchObject({ statusCode: 201 });
    expect(log.mock.calls[0][0]).not.toHaveProperty('aborted');
  });

  it('AC-010-01 a finish event alone is enough, whatever writableFinished says', () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const { req, res } = fakeReqRes();
    requestLogging(req, res as unknown as Response, jest.fn());
    res.emit('finish');
    expect(log.mock.calls[0][0]).toMatchObject({ statusCode: 200 });
    expect(log.mock.calls[0][0]).not.toHaveProperty('aborted');
  });

  it('AC-010-01 finish then close writes a single line with the real status', () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const { req, res } = fakeReqRes();
    requestLogging(req, res as unknown as Response, jest.fn());
    res.statusCode = 201;
    res.writableEnded = true;
    res.writableFinished = true;
    res.emit('finish');
    res.emit('close');
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toMatchObject({ statusCode: 201 });
    expect(log.mock.calls[0][0]).not.toHaveProperty('aborted');
  });
});
