import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { REDIS_KEYS } from '../../common/constants/redis-keys.constants';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  jti?: string; // JWT ID for blacklisting
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Check if token is blacklisted (logged out)
    if (payload.jti) {
      const isBlacklisted = await this.redis.exists(
        REDIS_KEYS.JWT_BLACKLIST(payload.jti),
      );
      if (isBlacklisted) {
        throw new UnauthorizedException({
          message: 'Token has been revoked',
          code: 'TOKEN_REVOKED',
        });
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException({
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    return user;
  }
}
