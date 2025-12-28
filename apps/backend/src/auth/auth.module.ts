import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthThrottleGuard } from './guards/auth-throttle.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AUTH_THROTTLE } from '../common/constants';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRY', '15m') as any,
        },
      }),
    }),
    // Throttler for auth endpoints to prevent brute force attacks
    ThrottlerModule.forRoot([
      {
        name: 'auth',
        ttl: AUTH_THROTTLE.WINDOW_MS,
        limit: AUTH_THROTTLE.DEFAULT_LIMIT,
      },
      {
        name: 'auth-strict',
        ttl: AUTH_THROTTLE.STRICT_WINDOW_MS,
        limit: AUTH_THROTTLE.STRICT_LIMIT,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, ApiKeyGuard, JwtAuthGuard, AuthThrottleGuard, JwtStrategy],
  exports: [AuthService, ApiKeyGuard, JwtAuthGuard, AuthThrottleGuard],
})
export class AuthModule {}
