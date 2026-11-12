import serverlessExpress from '@codegenie/serverless-express';
import { NestFactory } from '@nestjs/core';
import type { Callback, Context, Handler } from 'aws-lambda';
import type { Express } from 'express';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

// The Nest app is cached across warm invocations to soften cold starts.
let cached: Handler | undefined;

const bootstrap = async (): Promise<Handler> => {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  configureApp(app, process.env.CORS_ORIGINS);
  // bufferLogs holds every log until flushed; app.init() (unlike app.listen()) does not flush,
  // so without this the Lambda wrote no log at all (found in production after v1.2.0).
  app.flushLogs();
  await app.init();
  return serverlessExpress({
    app: app.getHttpAdapter().getInstance() as Express,
  });
};

export const handler: Handler = async (
  event: unknown,
  context: Context,
  callback: Callback,
) => {
  cached ??= await bootstrap();
  const response: unknown = await cached(event, context, callback);
  return response;
};
