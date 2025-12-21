import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout, catchError } from 'rxjs';

export interface ProxyResult {
  data: unknown;
  status: number;
  headers: Record<string, string>;
  responseTime: number;
  upstreamUrl: string;
}

/**
 * Gateway Service - Forwards requests to upstream API
 */
@Injectable()
export class GatewayService {
  private readonly upstreamUrl: string;
  private readonly logger = new Logger(GatewayService.name);

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.upstreamUrl = this.configService.get(
      'UPSTREAM_URL',
      'https://jsonplaceholder.typicode.com',
    );
    this.logger.log(`Gateway configured with upstream: ${this.upstreamUrl}`);
  }

  async forwardRequest(
    method: string,
    path: string,
    query: Record<string, unknown>,
    body: unknown,
    headers: Record<string, string>,
  ): Promise<ProxyResult> {
    const startTime = Date.now();
    const url = `${this.upstreamUrl}${path}`;

    // Clean headers (remove hop-by-hop headers)
    const forwardHeaders = this.cleanHeaders(headers);

    this.logger.debug(`Forwarding ${method} ${url}`);

    try {
      const response = await firstValueFrom(
        this.httpService
          .request({
            method,
            url,
            params: query,
            data: body,
            headers: forwardHeaders,
            validateStatus: () => true, // Don't throw on non-2xx
          })
          .pipe(
            timeout(30000),
            catchError((error) => {
              this.logger.error(`Upstream request failed: ${error.message}`);
              throw new HttpException(
                {
                  message: 'Upstream request failed',
                  code: 'UPSTREAM_ERROR',
                  error: error.message,
                },
                HttpStatus.BAD_GATEWAY,
              );
            }),
          ),
      );

      const responseTime = Date.now() - startTime;

      this.logger.debug(
        `Upstream response: ${response.status} in ${responseTime}ms`,
      );

      return {
        data: response.data,
        status: response.status,
        headers: response.headers as Record<string, string>,
        responseTime,
        upstreamUrl: url,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          message: 'Gateway error',
          code: 'GATEWAY_ERROR',
          error: error instanceof Error ? error.message : 'Unknown error',
          responseTime,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private cleanHeaders(
    headers: Record<string, string>,
  ): Record<string, string> {
    const hopByHopHeaders = [
      'connection',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailer',
      'transfer-encoding',
      'upgrade',
      'host',
    ];

    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (!hopByHopHeaders.includes(key.toLowerCase())) {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }
}
