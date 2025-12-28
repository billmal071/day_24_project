import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { createHash } from 'crypto';
import { RedisService } from '../../redis/redis.service';
import { REDIS_KEYS, REDIS_TTL, CACHE_CONFIG } from '../../common/constants';

/**
 * Caching Interceptor - Caches GET responses in Redis (Day 19 - Performance)
 */
@Injectable()
export class CachingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CachingInterceptor.name);

  constructor(private redis: RedisService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const cacheKey = this.generateCacheKey(request);

    // Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT: ${cacheKey}`);
      response.setHeader('X-Cache', 'HIT');

      try {
        return of(JSON.parse(cached));
      } catch {
        // Invalid cached data, continue to fetch
        this.logger.warn(`Invalid cached data for ${cacheKey}`);
      }
    }

    this.logger.debug(`Cache MISS: ${cacheKey}`);
    response.setHeader('X-Cache', 'MISS');

    return next.handle().pipe(
      tap(async (data) => {
        // Cache the response
        try {
          await this.redis.set(
            cacheKey,
            JSON.stringify(data),
            REDIS_TTL.RESPONSE_CACHE,
          );
          this.logger.debug(`Cached response: ${cacheKey}`);
        } catch (error) {
          this.logger.error(
            `Failed to cache response: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }),
    );
  }

  private generateCacheKey(request: {
    method: string;
    path: string;
    query: Record<string, unknown>;
  }): string {
    const queryHash = createHash('md5')
      .update(JSON.stringify(request.query || {}))
      .digest('hex')
      .substring(0, CACHE_CONFIG.QUERY_HASH_LENGTH);

    return REDIS_KEYS.CACHE_RESPONSE(request.method, request.path, queryHash);
  }
}
