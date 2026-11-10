import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

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
  app.use(helmet());
  app.enableCors({
    origin: parseOrigins(corsOrigins),
    methods: ['GET', 'POST', 'PATCH'],
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
