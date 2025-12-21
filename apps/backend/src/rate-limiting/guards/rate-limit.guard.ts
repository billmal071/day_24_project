import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisThrottlerStorage } from '../storage/redis-throttler.storage';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

/**
 * Rate Limit Guard (Day 17 - The Guard)
 * Enforces 10 requests/minute per API key using Redis
 * Returns 429 Too Many Requests when limit is exceeded
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly throttlerStorage: RedisThrottlerStorage,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip rate limiting for public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const apiKey = request.apiKey;

    // No API key means the ApiKeyGuard hasn't run or route is public
    if (!apiKey?.id) {
      return true;
    }

    // Get custom rate limit from API key or use defaults (10 req/min)
    const limit = apiKey.rateLimit || 10;
    const ttlMs = apiKey.ratePeriod || 60000;
    const ttlSeconds = Math.ceil(ttlMs / 1000);

    // Check and increment rate limit
    const result = await this.throttlerStorage.increment(
      apiKey.id,
      limit,
      ttlSeconds,
    );

    // Add rate limit headers to response (standard headers)
    response.header('X-RateLimit-Limit', limit.toString());
    response.header(
      'X-RateLimit-Remaining',
      Math.max(0, limit - result.totalHits).toString(),
    );
    response.header('X-RateLimit-Reset', result.timeToExpire.toString());

    // If blocked, return 429 (Day 17 - Return 429 if they exceed 10 requests/minute)
    if (result.isBlocked) {
      response.header('Retry-After', result.timeToBlockExpire.toString());

      this.logger.warn(
        `Rate limit exceeded for API key ${apiKey.keyPrefix}***: ${result.totalHits}/${limit}`,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Rate limit exceeded. Try again in ${result.timeToBlockExpire} seconds.`,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: result.timeToBlockExpire,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
