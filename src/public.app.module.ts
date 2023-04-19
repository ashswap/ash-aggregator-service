import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { LoggingModule } from './common/logging/logging.module';
import { EndpointsControllersModule } from './endpoints/endpoints.controllers.module';

@Module({
  imports: [LoggingModule, CommonModule, EndpointsControllersModule],
})
export class PublicAppModule {}
