import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { LoggingModule } from './common/logging/logging.module';
import { EndpointsControllersModule } from './endpoints/endpoints.controllers.module';
import { AggregatorProvider } from './common/aggregator/aggregator.provider';

@Module({
  imports: [LoggingModule, CommonModule, EndpointsControllersModule],
  providers: [AggregatorProvider],
  exports: [AggregatorProvider],
})
export class PublicAppModule {}
