import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { STATUS_CODES, ANALYTICS_QUERY, ANALYTICS_TIME_RANGE } from '../common/constants';

/**
 * Analytics Service - Provides usage statistics and request logs
 * Queries use B-Tree indexed timestamp column (Day 16 - Database Indexing)
 * All queries are scoped to user's API keys
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get dashboard overview statistics (scoped to user's API keys)
   */
  async getOverview(query: AnalyticsQueryDto, apiKeyIds: string[]) {
    const { startDate, endDate } = this.getDateRange(query);

    // If user has no API keys, return empty stats
    if (apiKeyIds.length === 0) {
      return {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        stats: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          errorRate: 0,
          avgResponseTime: 0,
          activeKeys: 0,
        },
        requestsByHour: [],
      };
    }

    const [
      totalRequests,
      successfulRequests,
      failedRequests,
      avgResponseTime,
      activeKeys,
      requestsByHour,
    ] = await Promise.all([
      // Total requests
      this.prisma.requestLog.count({
        where: {
          timestamp: { gte: startDate, lte: endDate },
          apiKeyId: { in: apiKeyIds },
        },
      }),

      // Successful requests (2xx)
      this.prisma.requestLog.count({
        where: {
          timestamp: { gte: startDate, lte: endDate },
          apiKeyId: { in: apiKeyIds },
          statusCode: { gte: STATUS_CODES.SUCCESS_MIN, lt: STATUS_CODES.SUCCESS_MAX + 1 },
        },
      }),

      // Failed requests (4xx, 5xx)
      this.prisma.requestLog.count({
        where: {
          timestamp: { gte: startDate, lte: endDate },
          apiKeyId: { in: apiKeyIds },
          statusCode: { gte: STATUS_CODES.CLIENT_ERROR_MIN },
        },
      }),

      // Average response time
      this.prisma.requestLog.aggregate({
        where: {
          timestamp: { gte: startDate, lte: endDate },
          apiKeyId: { in: apiKeyIds },
        },
        _avg: { responseTime: true },
      }),

      // Active API keys count (user's keys only)
      this.prisma.apiKey.count({
        where: {
          id: { in: apiKeyIds },
          isActive: true,
        },
      }),

      // Requests by hour (last 24 hours)
      this.getRequestsByHour(startDate, endDate, apiKeyIds),
    ]);

    const errorRate =
      totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;

    return {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      stats: {
        totalRequests,
        successfulRequests,
        failedRequests,
        errorRate: Math.round(errorRate * 100) / 100,
        avgResponseTime: Math.round(avgResponseTime._avg.responseTime || 0),
        activeKeys,
      },
      requestsByHour,
    };
  }

  /**
   * Get paginated request logs (scoped to user's API keys)
   */
  async getRequestLogs(query: AnalyticsQueryDto, apiKeyIds: string[]) {
    const { startDate, endDate } = this.getDateRange(query);
    const { limit = ANALYTICS_QUERY.DEFAULT_LIMIT, offset = ANALYTICS_QUERY.DEFAULT_OFFSET, apiKeyId } = query;

    // If user has no API keys, return empty logs
    if (apiKeyIds.length === 0) {
      return {
        logs: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false,
        },
      };
    }

    // Scope to user's keys, optionally filter to specific key
    const scopedApiKeyId = apiKeyId && apiKeyIds.includes(apiKeyId) ? apiKeyId : undefined;

    const where = {
      timestamp: { gte: startDate, lte: endDate },
      apiKeyId: scopedApiKeyId ? scopedApiKeyId : { in: apiKeyIds },
    };

    const [logs, total] = await Promise.all([
      this.prisma.requestLog.findMany({
        where,
        select: {
          id: true,
          method: true,
          path: true,
          statusCode: true,
          responseTime: true,
          clientIp: true,
          timestamp: true,
          errorMessage: true,
          apiKey: {
            select: {
              keyPrefix: true,
              name: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' }, // Uses B-Tree index
        take: limit,
        skip: offset,
      }),
      this.prisma.requestLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
    };
  }

  /**
   * Get statistics for a specific API key (must be user's key)
   */
  async getKeyStats(keyId: string, query: AnalyticsQueryDto, apiKeyIds: string[]) {
    // Verify user owns this key
    if (!apiKeyIds.includes(keyId)) {
      return null;
    }

    const { startDate, endDate } = this.getDateRange(query);

    const [keyInfo, stats, recentLogs, topEndpoints] = await Promise.all([
      // API key info
      this.prisma.apiKey.findUnique({
        where: { id: keyId },
        select: {
          id: true,
          keyPrefix: true,
          name: true,
          rateLimit: true,
          isActive: true,
          lastUsedAt: true,
          createdAt: true,
        },
      }),

      // Request stats
      this.prisma.requestLog.aggregate({
        where: {
          apiKeyId: keyId,
          timestamp: { gte: startDate, lte: endDate },
        },
        _count: true,
        _avg: { responseTime: true },
      }),

      // Recent requests
      this.prisma.requestLog.findMany({
        where: {
          apiKeyId: keyId,
          timestamp: { gte: startDate, lte: endDate },
        },
        select: {
          method: true,
          path: true,
          statusCode: true,
          responseTime: true,
          timestamp: true,
        },
        orderBy: { timestamp: 'desc' },
        take: ANALYTICS_QUERY.RECENT_LOGS_LIMIT,
      }),

      // Top endpoints (uses composite index)
      this.prisma.requestLog.groupBy({
        by: ['method', 'path'],
        where: {
          apiKeyId: keyId,
          timestamp: { gte: startDate, lte: endDate },
        },
        _count: true,
        orderBy: { _count: { path: 'desc' } },
        take: ANALYTICS_QUERY.TOP_ENDPOINTS_LIMIT,
      }),
    ]);

    return {
      key: keyInfo,
      stats: {
        totalRequests: stats._count,
        avgResponseTime: Math.round(stats._avg.responseTime || 0),
      },
      recentLogs,
      topEndpoints: topEndpoints.map((e) => ({
        method: e.method,
        path: e.path,
        count: e._count,
      })),
    };
  }

  /**
   * Get endpoint usage statistics (scoped to user's API keys)
   */
  async getEndpointStats(query: AnalyticsQueryDto, apiKeyIds: string[]) {
    const { startDate, endDate } = this.getDateRange(query);
    const { limit = ANALYTICS_QUERY.ENDPOINT_STATS_LIMIT } = query;

    if (apiKeyIds.length === 0) {
      return { endpoints: [] };
    }

    const endpoints = await this.prisma.requestLog.groupBy({
      by: ['method', 'path'],
      where: {
        timestamp: { gte: startDate, lte: endDate },
        apiKeyId: { in: apiKeyIds },
      },
      _count: true,
      _avg: { responseTime: true },
      orderBy: { _count: { path: 'desc' } },
      take: limit,
    });

    return {
      endpoints: endpoints.map((e) => ({
        method: e.method,
        path: e.path,
        requestCount: e._count,
        avgResponseTime: Math.round(e._avg.responseTime || 0),
      })),
    };
  }

  private getDateRange(query: AnalyticsQueryDto): {
    startDate: Date;
    endDate: Date;
  } {
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getTime() - ANALYTICS_TIME_RANGE.DEFAULT_RANGE_MS);

    return { startDate, endDate };
  }

  private async getRequestsByHour(startDate: Date, endDate: Date, apiKeyIds: string[]) {
    // Get hourly counts for the period
    const logs = await this.prisma.requestLog.findMany({
      where: {
        timestamp: { gte: startDate, lte: endDate },
        apiKeyId: { in: apiKeyIds },
      },
      select: {
        timestamp: true,
        statusCode: true,
      },
    });

    // Group by hour
    const hourlyData: Record<string, { requests: number; errors: number }> = {};

    for (const log of logs) {
      const hour = new Date(log.timestamp).toISOString().substring(0, 13);
      if (!hourlyData[hour]) {
        hourlyData[hour] = { requests: 0, errors: 0 };
      }
      hourlyData[hour].requests++;
      if (log.statusCode >= STATUS_CODES.CLIENT_ERROR_MIN) {
        hourlyData[hour].errors++;
      }
    }

    return Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour,
        ...data,
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }
}
