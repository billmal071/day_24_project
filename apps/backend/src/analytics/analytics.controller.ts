import {
  Controller,
  Get,
  Query,
  Param,
  ParseUUIDPipe,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UseJwtAuth } from '../common/decorators/jwt-auth.decorator';
import { type AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AuthService } from '../auth/auth.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
@UseJwtAuth()
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Get dashboard overview statistics (scoped to user's API keys)
   */
  @Get('overview')
  async getOverview(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const apiKeyIds = await this.authService.getUserApiKeyIds(user.id);
    return this.analyticsService.getOverview(query, apiKeyIds);
  }

  /**
   * Get paginated request logs (scoped to user's API keys)
   */
  @Get('requests')
  async getRequestLogs(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const apiKeyIds = await this.authService.getUserApiKeyIds(user.id);
    return this.analyticsService.getRequestLogs(query, apiKeyIds);
  }

  /**
   * Get statistics for a specific API key (must be user's key)
   */
  @Get('keys/:keyId/stats')
  async getKeyStats(
    @Param('keyId', ParseUUIDPipe) keyId: string,
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const apiKeyIds = await this.authService.getUserApiKeyIds(user.id);
    const stats = await this.analyticsService.getKeyStats(keyId, query, apiKeyIds);

    if (!stats) {
      throw new NotFoundException('API key not found');
    }

    return stats;
  }

  /**
   * Get endpoint usage statistics (scoped to user's API keys)
   */
  @Get('endpoints')
  async getEndpointStats(
    @Query() query: AnalyticsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const apiKeyIds = await this.authService.getUserApiKeyIds(user.id);
    return this.analyticsService.getEndpointStats(query, apiKeyIds);
  }
}
