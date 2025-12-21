import { Controller, Get, Query, Param, ParseUUIDPipe } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get dashboard overview statistics
   */
  @Get('overview')
  async getOverview(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getOverview(query);
  }

  /**
   * Get paginated request logs
   */
  @Get('requests')
  async getRequestLogs(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getRequestLogs(query);
  }

  /**
   * Get statistics for a specific API key
   */
  @Get('keys/:keyId/stats')
  async getKeyStats(
    @Param('keyId', ParseUUIDPipe) keyId: string,
    @Query() query: AnalyticsQueryDto,
  ) {
    return this.analyticsService.getKeyStats(keyId, query);
  }

  /**
   * Get endpoint usage statistics
   */
  @Get('endpoints')
  async getEndpointStats(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getEndpointStats(query);
  }
}
