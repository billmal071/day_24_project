import {
  Controller,
  All,
  Req,
  Res,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { GatewayService } from './gateway.service';
import { CachingInterceptor } from './interceptors/caching.interceptor';

interface ExtendedRequest extends Request {
  apiKey?: { id: string; keyPrefix: string };
  proxyResult?: { responseTime: number; upstreamUrl: string };
}

/**
 * Gateway Controller - Proxies all requests to upstream API
 */
@Controller('proxy')
export class GatewayController {
  private readonly logger = new Logger(GatewayController.name);

  constructor(private gatewayService: GatewayService) {}

  @All('*path')
  @UseInterceptors(CachingInterceptor)
  async proxyRequest(
    @Req() req: ExtendedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<unknown> {
    // Extract path after /api/v1/proxy
    const fullPath = req.path;
    const path = fullPath.replace(/^\/api\/v1\/proxy/, '') || '/';

    const query = req.query as Record<string, unknown>;
    const body = req.body;
    const headers = req.headers as Record<string, string>;

    this.logger.log(
      `Proxying ${req.method} ${path} (API key: ${req.apiKey?.keyPrefix || 'unknown'}***)`,
    );

    const result = await this.gatewayService.forwardRequest(
      req.method,
      path,
      query,
      body,
      headers,
    );

    // Store result for logging interceptor
    req.proxyResult = {
      responseTime: result.responseTime,
      upstreamUrl: result.upstreamUrl,
    };

    // Forward selected headers from upstream
    const forwardableHeaders = ['content-type', 'cache-control', 'etag'];
    for (const header of forwardableHeaders) {
      if (result.headers[header]) {
        res.setHeader(header, result.headers[header]);
      }
    }

    // Add custom headers
    res.setHeader('X-Response-Time', `${result.responseTime}ms`);
    res.setHeader('X-Proxied-By', 'api-gateway');
    res.setHeader('X-Upstream-Status', result.status.toString());

    // Set status code and return data (passthrough allows interceptors to work)
    res.status(result.status);
    return result.data;
  }
}
