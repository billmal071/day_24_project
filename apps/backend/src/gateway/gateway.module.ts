import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { CachingInterceptor } from './interceptors/caching.interceptor';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [GatewayController],
  providers: [GatewayService, LoggingInterceptor, CachingInterceptor],
  exports: [GatewayService],
})
export class GatewayModule {}
