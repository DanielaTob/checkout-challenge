import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp, parseOrigins } from './configure-app';
import { HealthController } from './infrastructure/http/health.controller';

describe('configureApp', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app, 'https://allowed.example');
    await app.init();
  });

  afterAll(() => app.close());

  it('GET /health answers 200 with security headers', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('CORS only allows the configured origin', async () => {
    const allowed = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'https://allowed.example');
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'https://allowed.example',
    );
    const denied = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'https://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('serves Swagger at /docs', async () => {
    await request(app.getHttpServer()).get('/docs-json').expect(200);
  });

  it('parseOrigins trims and drops empties', () => {
    expect(parseOrigins(' a , ,b ')).toEqual(['a', 'b']);
    expect(parseOrigins(undefined)).toEqual([]);
  });
});
