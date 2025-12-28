import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { REDIS_KEYS, REDIS_TTL, API_KEY_DEFAULTS } from '../../common/constants';

export interface ThrottlerRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * Redis-backed rate limiting storage (Day 17 - The Guard)
 * Implements sliding window rate limiting with Redis
 */
@Injectable()
export class RedisThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);

  constructor(private readonly redisService: RedisService) {}

  /**
   * Increment the request count for a given API key
   * Returns the current state including whether the request is blocked
   */
  async increment(
    apiKeyId: string,
    limit: number = API_KEY_DEFAULTS.RATE_LIMIT,
    ttlSeconds: number = REDIS_TTL.RATE_LIMIT_WINDOW,
  ): Promise<ThrottlerRecord> {
    const redis = this.redisService.getClient();
    const key = REDIS_KEYS.RATE_LIMIT(apiKeyId);
    const blockKey = REDIS_KEYS.RATE_LIMIT_BLOCKED(apiKeyId);

    // Check if currently blocked
    const isBlocked = await redis.exists(blockKey);
    if (isBlocked) {
      const timeToBlockExpire = await redis.ttl(blockKey);
      const totalHits = parseInt((await redis.get(key)) || '0');

      this.logger.debug(
        `Rate limit BLOCKED for ${apiKeyId}: ${totalHits}/${limit}, expires in ${timeToBlockExpire}s`,
      );

      return {
        totalHits,
        timeToExpire: ttlSeconds,
        isBlocked: true,
        timeToBlockExpire: timeToBlockExpire > 0 ? timeToBlockExpire : 0,
      };
    }

    // Increment counter using MULTI for atomicity
    const pipeline = redis.multi();
    pipeline.incr(key);
    pipeline.ttl(key);
    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Redis pipeline failed');
    }

    const totalHits = results[0][1] as number;
    let timeToExpire = results[1][1] as number;

    // Set expiration on first hit
    if (totalHits === 1) {
      await redis.expire(key, ttlSeconds);
      timeToExpire = ttlSeconds;
    }

    // Block if limit exceeded (Day 17 - Return 429)
    if (totalHits > limit) {
      const blockSeconds = REDIS_TTL.RATE_LIMIT_BLOCK;
      await redis.setex(blockKey, blockSeconds, '1');

      this.logger.warn(
        `Rate limit EXCEEDED for ${apiKeyId}: ${totalHits}/${limit}, blocking for ${blockSeconds}s`,
      );

      return {
        totalHits,
        timeToExpire: timeToExpire > 0 ? timeToExpire : ttlSeconds,
        isBlocked: true,
        timeToBlockExpire: blockSeconds,
      };
    }

    this.logger.debug(
      `Rate limit OK for ${apiKeyId}: ${totalHits}/${limit}`,
    );

    return {
      totalHits,
      timeToExpire: timeToExpire > 0 ? timeToExpire : ttlSeconds,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }

  /**
   * Get the current rate limit state without incrementing
   */
  async getState(apiKeyId: string): Promise<ThrottlerRecord | null> {
    const redis = this.redisService.getClient();
    const key = REDIS_KEYS.RATE_LIMIT(apiKeyId);
    const blockKey = REDIS_KEYS.RATE_LIMIT_BLOCKED(apiKeyId);

    const [hits, ttl, blocked, blockTtl] = await Promise.all([
      redis.get(key),
      redis.ttl(key),
      redis.exists(blockKey),
      redis.ttl(blockKey),
    ]);

    if (!hits) return null;

    return {
      totalHits: parseInt(hits),
      timeToExpire: ttl > 0 ? ttl : 0,
      isBlocked: blocked === 1,
      timeToBlockExpire: blockTtl > 0 ? blockTtl : 0,
    };
  }

  /**
   * Reset rate limit for an API key (for testing/admin purposes)
   */
  async reset(apiKeyId: string): Promise<void> {
    const redis = this.redisService.getClient();
    const key = REDIS_KEYS.RATE_LIMIT(apiKeyId);
    const blockKey = REDIS_KEYS.RATE_LIMIT_BLOCKED(apiKeyId);

    await Promise.all([redis.del(key), redis.del(blockKey)]);

    this.logger.log(`Rate limit reset for ${apiKeyId}`);
  }
}
