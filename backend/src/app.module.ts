import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './infrastructure/config/env';
import { CustomersModule } from './infrastructure/customers.module';
import { HealthController } from './infrastructure/http/health.controller';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { ProductsModule } from './infrastructure/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    PrismaModule,
    ProductsModule,
    CustomersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
