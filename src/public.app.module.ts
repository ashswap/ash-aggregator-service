import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { LoggingModule } from './common/logging/logging.module';
import { EndpointsControllersModule } from './endpoints/endpoints.controllers.module';
import { AggregatorProvider } from './common/aggregator/aggregator.provider';
import { SentryModule } from '@ntegral/nestjs-sentry';
import { DynamicModuleUtils } from './utils/dynamic.module.utils';

@Module({
  imports: [
    LoggingModule, 
    CommonModule, 
    EndpointsControllersModule, 
    SentryModule.forRootAsync(DynamicModuleUtils.getSentryModuleAsyncOptions()),
  ],
  providers: [
    AggregatorProvider, 
    DynamicModuleUtils.getSentryService(),
  ],
  exports: [AggregatorProvider],
})
export class PublicAppModule {}
