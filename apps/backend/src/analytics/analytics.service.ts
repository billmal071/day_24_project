import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

/**
 * Analytics Service - Provides usage statistics and request logs
 * Queries use B-Tree indexed timestamp column (Day 16 - Database Indexing)
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get dashboard overview statistics
   */
  async getOverview(query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);

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
        },
      }),

      // Successful requests (2xx)
      this.prisma.requestLog.count({
        where: {
          timestamp: { gte: startDate, lte: endDate },
          statusCode: { gte: 200, lt: 300 },
        },
      }),

      // Failed requests (4xx, 5xx)
      this.prisma.requestLog.count({
        where: {
          timestamp: { gte: startDate, lte: endDate },
          statusCode: { gte: 400 },
        },
      }),

      // Average response time
      this.prisma.requestLog.aggregate({
        where: {
          timestamp: { gte: startDate, lte: endDate },
        },
        _avg: { responseTime: true },
      }),

      // Active API keys count
      this.prisma.apiKey.count({
        where: { isActive: true },
      }),

      // Requests by hour (last 24 hours)
      this.getRequestsByHour(startDate, endDate),
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
   * Get paginated request logs (uses B-Tree index on timestamp)
   */
  async getRequestLogs(query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);
    const { limit = 50, offset = 0, apiKeyId } = query;

    const where = {
      timestamp: { gte: startDate, lte: endDate },
      ...(apiKeyId && { apiKeyId }),
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
   * Get statistics for a specific API key
   */
  async getKeyStats(keyId: string, query: AnalyticsQueryDto) {
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
        take: 10,
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
        take: 5,
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
   * Get endpoint usage statistics
   */
  async getEndpointStats(query: AnalyticsQueryDto) {
    const { startDate, endDate } = this.getDateRange(query);
    const { limit = 20 } = query;

    const endpoints = await this.prisma.requestLog.groupBy({
      by: ['method', 'path'],
      where: {
        timestamp: { gte: startDate, lte: endDate },
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
      : new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Default: last 24 hours

    return { startDate, endDate };
  }

  private async getRequestsByHour(startDate: Date, endDate: Date) {
    // Get hourly counts for the period
    const logs = await this.prisma.requestLog.findMany({
      where: {
        timestamp: { gte: startDate, lte: endDate },
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
      if (log.statusCode >= 400) {
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
