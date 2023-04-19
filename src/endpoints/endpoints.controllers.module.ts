import { Module } from '@nestjs/common';
import { AggregatorController } from './aggregator/aggregator.controller';
import { AggregatorModule } from 'src/common/aggregator/aggregator.module';
import { CachingModule } from 'src/common/caching/caching.module';

@Module({
  imports: [AggregatorModule, CachingModule],
  controllers: [AggregatorController],
})
export class EndpointsControllersModule {}
