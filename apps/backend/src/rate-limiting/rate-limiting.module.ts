import { Module } from '@nestjs/common';
import { RedisThrottlerStorage } from './storage/redis-throttler.storage';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Module({
  providers: [RedisThrottlerStorage, RateLimitGuard],
  exports: [RedisThrottlerStorage, RateLimitGuard],
})
export class RateLimitingModule {}
