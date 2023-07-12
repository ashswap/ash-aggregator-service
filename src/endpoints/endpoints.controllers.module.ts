import { Module } from '@nestjs/common';
import { AggregatorController } from './aggregator/aggregator.controller';
import { AggregatorModule } from 'src/common/aggregator/aggregator.module';
import { CachingModule } from 'src/common/caching/caching.module';
import { ModelModule } from 'src/model/model.module';

@Module({
  imports: [AggregatorModule, CachingModule, ModelModule],
  controllers: [AggregatorController],
})
export class EndpointsControllersModule {}
