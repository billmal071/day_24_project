import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { CachingInterceptor } from './interceptors/caching.interceptor';
import { HTTP_TIMEOUTS, HTTP_CONFIG } from '../common/constants';

@Module({
  imports: [
    HttpModule.register({
      timeout: HTTP_TIMEOUTS.REQUEST_TIMEOUT,
      maxRedirects: HTTP_CONFIG.MAX_REDIRECTS,
    }),
  ],
  controllers: [GatewayController],
  providers: [GatewayService, LoggingInterceptor, CachingInterceptor],
  exports: [GatewayService],
})
export class GatewayModule {}
