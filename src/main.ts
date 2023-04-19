import { Logger } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import * as bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ApiConfigService } from './common/api-config/api.config.service';
// import { CronModule } from './crons/cache.warmer.module';
import { PublicAppModule } from './public.app.module';

async function bootstrap() {
  const publicApp = await NestFactory.create(PublicAppModule);
  publicApp.use(bodyParser.json({ limit: '1mb' }));
  publicApp.enableCors();
  publicApp.useLogger(publicApp.get(WINSTON_MODULE_NEST_PROVIDER));
  publicApp.use(cookieParser());

  const apiConfigService = publicApp.get<ApiConfigService>(ApiConfigService);
  const httpAdapterHostService =
    publicApp.get<HttpAdapterHost>(HttpAdapterHost);

  const httpServer = httpAdapterHostService.httpAdapter.getHttpServer();
  httpServer.keepAliveTimeout = apiConfigService.getServerTimeout();
  httpServer.headersTimeout = apiConfigService.getHeadersTimeout(); //`keepAliveTimeout + server's expected response time`

  if (apiConfigService.getIsPublicApiFeatureActive()) {
    await publicApp.listen(apiConfigService.getPublicApiFeaturePort());
  }

  if (apiConfigService.getIsCronFeatureActive()) {
    // const cacheWarmerApp = await NestFactory.create(CronModule);
    // await cacheWarmerApp.listen(apiConfigService.getMonitorFeaturePort());
  }

  const logger = new Logger('Bootstrapper');
  logger.log(
    `Public API active: ${apiConfigService.getIsPublicApiFeatureActive()}`,
  );
  logger.log(`Monitor active: ${apiConfigService.getIsCronFeatureActive()}`);
}

bootstrap();
