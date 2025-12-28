import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { STATUS_CODES, STRING_LENGTH } from '../../common/constants';

/**
 * Logging Interceptor - Persists all traffic to PostgreSQL
 * Uses the B-Tree indexed timestamp column (Day 16 - Database Indexing)
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        // Fire and forget - don't await
        this.logRequest(request, response.statusCode, startTime, null).catch(
          (err) => this.logger.error('Failed to log request:', err),
        );
      }),
      catchError((error) => {
        // Fire and forget - don't await
        this.logRequest(
          request,
          error.status || STATUS_CODES.DEFAULT_ERROR,
          startTime,
          error,
        ).catch((err) => this.logger.error('Failed to log error:', err));
        return throwError(() => error);
      }),
    );
  }

  private async logRequest(
    request: {
      method: string;
      path: string;
      url: string;
      query: Record<string, unknown>;
      headers: Record<string, string>;
      ip: string;
      apiKey?: { id: string };
      proxyResult?: { responseTime: number; upstreamUrl: string };
    },
    statusCode: number,
    startTime: number,
    error: { message?: string; code?: string } | null,
  ): Promise<void> {
    const responseTime = Date.now() - startTime;
    const apiKey = request.apiKey;

    // Skip logging for unauthenticated requests
    if (!apiKey?.id) return;

    // Sanitize headers (remove sensitive data)
    const sanitizedHeaders = this.sanitizeHeaders(request.headers);

    try {
      await this.prisma.requestLog.create({
        data: {
          apiKeyId: apiKey.id,
          method: request.method,
          path: request.path || request.url,
          queryParams:
            Object.keys(request.query || {}).length > 0
              ? (request.query as Prisma.InputJsonValue)
              : undefined,
          headers: sanitizedHeaders,
          statusCode,
          responseTime,
          clientIp: this.getClientIp(request),
          userAgent: request.headers['user-agent']?.substring(0, STRING_LENGTH.USER_AGENT_MAX),
          upstreamUrl: request.proxyResult?.upstreamUrl,
          upstreamTime: request.proxyResult?.responseTime,
          errorMessage: error?.message,
          errorCode: error?.code,
        },
      });

      this.logger.debug(
        `Logged request: ${request.method} ${request.path} -> ${statusCode} (${responseTime}ms)`,
      );
    } catch (logError) {
      this.logger.error(
        'Failed to log request:',
        logError instanceof Error ? logError.message : 'Unknown error',
      );
    }
  }

  private sanitizeHeaders(
    headers: Record<string, string>,
  ): Record<string, string> {
    const sensitiveHeaders = [
      'authorization',
      'x-api-key',
      'cookie',
      'set-cookie',
    ];
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private getClientIp(request: {
    ip?: string;
    headers: Record<string, string>;
    connection?: { remoteAddress?: string };
  }): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.ip ||
      request.connection?.remoteAddress ||
      'unknown'
    );
  }
}
