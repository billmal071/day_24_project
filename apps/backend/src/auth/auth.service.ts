import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  REDIS_KEYS,
  REDIS_TTL,
} from '../common/constants/redis-keys.constants';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

interface CachedApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  rateLimit: number;
  ratePeriod: number;
  isActive: boolean;
  expiresAt: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Generate a new API key
   * The raw key is only returned once - it cannot be retrieved later!
   */
  async generateApiKey(
    dto: CreateApiKeyDto,
  ): Promise<{ key: string; id: string; prefix: string }> {
    // Generate a random 32-byte key and encode as base64url
    const rawKey = randomBytes(32).toString('base64url');
    const keyPrefix = rawKey.substring(0, 8);
    const keyHash = this.hashKey(rawKey);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        key: keyHash,
        keyPrefix,
        name: dto.name,
        description: dto.description,
        rateLimit: dto.rateLimit || 10,
        ratePeriod: dto.ratePeriod || 60000,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    this.logger.log(`API key created: ${keyPrefix}*** (${dto.name})`);

    return {
      key: rawKey, // Only returned once!
      id: apiKey.id,
      prefix: keyPrefix,
    };
  }

  /**
   * Validate an API key with Redis caching (Day 19 - Performance)
   * 1. Check Redis cache first
   * 2. If miss, query PostgreSQL
   * 3. Cache result for 5 minutes
   */
  async validateApiKey(rawKey: string): Promise<CachedApiKey | null> {
    const keyHash = this.hashKey(rawKey);
    const cacheKey = REDIS_KEYS.API_KEY_CACHE(keyHash);

    // Check Redis cache first (Day 19 - Caching)
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed === null) return null; // Cached "not found"
      this.logger.debug(`API key cache HIT: ${parsed.keyPrefix}***`);
      return parsed as CachedApiKey;
    }

    this.logger.debug('API key cache MISS - querying database');

    // Query database (Day 14 - Connection Pooling handled by Prisma)
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { key: keyHash },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        rateLimit: true,
        ratePeriod: true,
        isActive: true,
        expiresAt: true,
      },
    });

    // Validate status
    if (!apiKey || !apiKey.isActive) {
      await this.redis.set(cacheKey, 'null', REDIS_TTL.API_KEY_CACHE);
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      await this.redis.set(cacheKey, 'null', REDIS_TTL.API_KEY_CACHE);
      return null;
    }

    // Cache valid key
    const cacheValue: CachedApiKey = {
      ...apiKey,
      expiresAt: apiKey.expiresAt?.toISOString() || null,
    };
    await this.redis.set(
      cacheKey,
      JSON.stringify(cacheValue),
      REDIS_TTL.API_KEY_CACHE,
    );

    // Update last used (async, non-blocking - fire and forget)
    this.prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {
        // Ignore errors - this is best-effort
      });

    return cacheValue;
  }

  /**
   * List all API keys for management dashboard
   */
  async listApiKeys() {
    return this.prisma.apiKey.findMany({
      select: {
        id: true,
        keyPrefix: true,
        name: true,
        description: true,
        rateLimit: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single API key by ID
   */
  async getApiKey(id: string) {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { id },
      select: {
        id: true,
        keyPrefix: true,
        name: true,
        description: true,
        rateLimit: true,
        ratePeriod: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
        _count: {
          select: { requestLogs: true },
        },
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return apiKey;
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(id: string): Promise<void> {
    const apiKey = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    // Invalidate cache
    const cacheKey = REDIS_KEYS.API_KEY_CACHE(apiKey.key);
    await this.redis.del(cacheKey);

    this.logger.log(`API key revoked: ${apiKey.keyPrefix}*** (${apiKey.name})`);
  }

  /**
   * Hash a raw API key using SHA-256
   */
  private hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }
}
