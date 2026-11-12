import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { requestContext } from './request-context';

export const REQUEST_ID_HEADER = 'x-request-id';
const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

const logger = new Logger('Http');

/**
 * Express middleware (spec 010): reuses a valid incoming x-request-id or generates a UUID v4,
 * echoes it in the response, runs the request inside its context (so every log line carries it)
 * and writes exactly one `http.request` access log with status and duration.
 */
export const requestLogging = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const incoming = req.header(REQUEST_ID_HEADER);
  const requestId =
    incoming && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, requestId);
  const started = process.hrtime.bigint();
  let logged = false;

  const done = () => {
    if (logged) return;
    logged = true;
    const durationMs =
      Math.round(Number(process.hrtime.bigint() - started) / 1e5) / 10;
    const statusCode = res.statusCode;
    const entry = {
      event: 'http.request',
      method: req.method,
      path: (req.originalUrl ?? req.url).split('?')[0],
      statusCode,
      durationMs,
    };
    requestContext.run({ requestId }, () => {
      if (statusCode >= 500) logger.error(entry);
      else if (statusCode >= 400) logger.warn(entry);
      else logger.log(entry);
    });
  };
  res.on('finish', done);
  res.on('close', done);

  requestContext.run({ requestId }, () => next());
};
