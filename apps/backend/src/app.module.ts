import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

// Core modules
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { RateLimitingModule } from './rate-limiting/rate-limiting.module';
import { GatewayModule } from './gateway/gateway.module';
import { AnalyticsModule } from './analytics/analytics.module';

// Guards and Interceptors
import { ApiKeyGuard } from './auth/guards/api-key.guard';
import { RateLimitGuard } from './rate-limiting/guards/rate-limit.guard';
import { LoggingInterceptor } from './gateway/interceptors/logging.interceptor';

// Health check controller
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Configuration (Day 14 - Environment management)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database & Cache (Day 14 - Connection Pooling, Day 19 - Caching)
    PrismaModule,
    RedisModule,

    // Feature Modules
    AuthModule,
    RateLimitingModule,
    GatewayModule,
    AnalyticsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Global Guards (order matters - API key first, then rate limit)
    {
      provide: APP_GUARD,
      useClass: ApiKeyGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    // Global Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
