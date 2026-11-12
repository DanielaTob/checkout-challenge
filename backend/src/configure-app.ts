import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { JsonLogger } from './infrastructure/observability/json-logger';
import {
  REQUEST_ID_HEADER,
  requestLogging,
} from './infrastructure/observability/request-logging.middleware';

export const parseOrigins = (raw: string | undefined): string[] =>
  (raw ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

/** Shared HTTP setup for local (main.ts), Lambda (lambda.ts) and tests. */
export const configureApp = (
  app: INestApplication,
  corsOrigins: string | undefined,
): void => {
  // Spec 010: JSON logs to stdout (LOG_LEVEL), request id + access log for every request
  // (registered first so CORS preflights are logged too).
  app.useLogger(new JsonLogger({ level: process.env.LOG_LEVEL }));
  app.use(requestLogging);
  app.use(helmet());
  app.enableCors({
    origin: parseOrigins(corsOrigins),
    methods: ['GET', 'POST', 'PATCH'],
    exposedHeaders: [REQUEST_ID_HEADER],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const doc = new DocumentBuilder()
    .setTitle('Checkout API')
    .setDescription('Products/stock, customers, transactions and deliveries')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('docs', app, () =>
    SwaggerModule.createDocument(app, doc),
  );
};
