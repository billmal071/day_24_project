import {
  Injectable,
  NotFoundException,
  Logger,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  REDIS_KEYS,
  REDIS_TTL,
  PASSWORD_HASHING,
  KEY_GENERATION,
  API_KEY_DEFAULTS,
} from '../common/constants';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

interface CachedApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  rateLimit: number;
  ratePeriod: number;
  isActive: boolean;
  expiresAt: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends TokenPair {
  user: {
    id: string;
    email: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  // ==================== User Authentication ====================

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException({
        message: 'Email already registered',
        code: 'EMAIL_EXISTS',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_HASHING.BCRYPT_SALT_ROUNDS);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
      },
      select: { id: true, email: true },
    });

    this.logger.log(`User registered: ${user.email}`);

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      ...tokens,
      user,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user) {
      throw new UnauthorizedException({
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    this.logger.log(`User logged in: ${user.email}`);

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      ...tokens,
      user: { id: user.id, email: user.email },
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      // Verify the refresh token
      const payload = this.jwtService.verify<JwtPayload & { tokenId: string }>(
        refreshToken,
        { secret: this.configService.get<string>('JWT_SECRET') },
      );

      // Check if refresh token exists in Redis
      const cacheKey = REDIS_KEYS.REFRESH_TOKEN(payload.sub, payload.tokenId);
      const exists = await this.redis.exists(cacheKey);

      if (!exists) {
        throw new UnauthorizedException({
          message: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN',
        });
      }

      // Delete old refresh token
      await this.redis.del(cacheKey);

      // Generate new tokens
      return this.generateTokens(payload.sub, payload.email);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException({
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }
  }

  async logout(
    userId: string,
    refreshToken: string,
    accessToken?: string,
  ): Promise<void> {
    try {
      const payload = this.jwtService.verify<JwtPayload & { tokenId: string }>(
        refreshToken,
        { secret: this.configService.get<string>('JWT_SECRET') },
      );

      // Delete refresh token from Redis
      const cacheKey = REDIS_KEYS.REFRESH_TOKEN(userId, payload.tokenId);
      await this.redis.del(cacheKey);

      // Blacklist the access token if provided
      if (accessToken) {
        try {
          const accessPayload = this.jwtService.verify<JwtPayload>(
            accessToken,
            { secret: this.configService.get<string>('JWT_SECRET') },
          );
          if (accessPayload.jti) {
            await this.redis.set(
              REDIS_KEYS.JWT_BLACKLIST(accessPayload.jti),
              '1',
              REDIS_TTL.JWT_BLACKLIST,
            );
          }
        } catch {
          // Access token might be expired, that's fine
        }
      }

      this.logger.log(`User logged out: ${userId}`);
    } catch {
      // Ignore errors - token might already be invalid
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, createdAt: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async generateTokens(userId: string, email: string): Promise<TokenPair> {
    const tokenId = randomBytes(KEY_GENERATION.TOKEN_ID_BYTES).toString('hex');
    const jti = randomBytes(KEY_GENERATION.JWT_ID_BYTES).toString('hex');

    const payload: JwtPayload = { sub: userId, email, jti };

    const accessToken = this.jwtService.sign(payload as any, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRY', '15m') as any,
    });

    const refreshToken = this.jwtService.sign(
      { ...payload, tokenId } as any,
      { expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRY', '7d') as any },
    );

    // Store refresh token in Redis
    const cacheKey = REDIS_KEYS.REFRESH_TOKEN(userId, tokenId);
    await this.redis.set(cacheKey, '1', REDIS_TTL.REFRESH_TOKEN);

    return { accessToken, refreshToken };
  }

  // ==================== API Key Management ====================

  /**
   * Generate a new API key for a user
   * The raw key is only returned once - it cannot be retrieved later!
   */
  async generateApiKey(
    dto: CreateApiKeyDto,
    userId: string,
  ): Promise<{ key: string; id: string; prefix: string }> {
    // Generate a random key and encode as base64url
    const rawKey = randomBytes(KEY_GENERATION.API_KEY_BYTES).toString('base64url');
    const keyPrefix = rawKey.substring(0, KEY_GENERATION.API_KEY_PREFIX_LENGTH);
    const keyHash = this.hashKey(rawKey);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        key: keyHash,
        keyPrefix,
        name: dto.name,
        description: dto.description,
        rateLimit: dto.rateLimit || API_KEY_DEFAULTS.RATE_LIMIT,
        ratePeriod: dto.ratePeriod || API_KEY_DEFAULTS.RATE_PERIOD_MS,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        userId,
      },
    });

    this.logger.log(`API key created: ${keyPrefix}*** (${dto.name}) for user ${userId}`);

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
   * List all API keys for a user
   */
  async listApiKeys(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
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
   * Get a single API key by ID (scoped to user)
   */
  async getApiKey(id: string, userId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, userId },
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
   * Revoke an API key (scoped to user)
   */
  async revokeApiKey(id: string, userId: string): Promise<void> {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, userId },
    });

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
   * Get all API key IDs for a user (used for analytics filtering)
   */
  async getUserApiKeyIds(userId: string): Promise<string[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId },
      select: { id: true },
    });
    return keys.map((k) => k.id);
  }

  /**
   * Hash a raw API key using SHA-256
   */
  private hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }
}
