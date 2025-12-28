import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UseJwtAuth } from '../common/decorators/jwt-auth.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthThrottleGuard } from './guards/auth-throttle.guard';
import { type AuthenticatedUser } from './strategies/jwt.strategy';
import { AUTH_THROTTLE } from '../common/constants';

@Controller('auth')
@UseGuards(JwtAuthGuard)
@UseJwtAuth()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ==================== User Authentication ====================

  @Public()
  @Post('register')
  @UseGuards(AuthThrottleGuard)
  @Throttle({ auth: { limit: AUTH_THROTTLE.REGISTER_LIMIT, ttl: AUTH_THROTTLE.WINDOW_MS } })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthThrottleGuard)
  @Throttle({ auth: { limit: AUTH_THROTTLE.LOGIN_LIMIT, ttl: AUTH_THROTTLE.WINDOW_MS } })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthThrottleGuard)
  @Throttle({ auth: { limit: AUTH_THROTTLE.REFRESH_LIMIT, ttl: AUTH_THROTTLE.WINDOW_MS } })
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body('refreshToken') refreshToken: string,
    @Body('accessToken') accessToken?: string,
  ) {
    await this.authService.logout(user.id, refreshToken, accessToken);
  }

  @Get('me')
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }

  // ==================== API Key Management ====================

  /**
   * Generate a new API key for the authenticated user
   * Note: The raw key is only returned once - save it securely!
   */
  @Post('keys')
  async createApiKey(
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.authService.generateApiKey(dto, user.id);

    return {
      id: result.id,
      key: result.key,
      keyPrefix: result.prefix,
      name: dto.name,
      message: 'Save this API key securely - it will not be shown again!',
    };
  }

  /**
   * List all API keys for the authenticated user
   */
  @Get('keys')
  async listApiKeys(@CurrentUser() user: AuthenticatedUser) {
    const keys = await this.authService.listApiKeys(user.id);
    return { keys };
  }

  /**
   * Get a single API key by ID (scoped to user)
   */
  @Get('keys/:id')
  async getApiKey(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.authService.getApiKey(id, user.id);
  }

  /**
   * Revoke an API key (scoped to user)
   */
  @Delete('keys/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeApiKey(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.authService.revokeApiKey(id, user.id);
  }
}
