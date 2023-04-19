import { Module } from '@nestjs/common';
import { AggregatorController } from './aggregator/aggregator.controller';
import { AggregatorModule } from './aggregator/aggregator.module';

@Module({
  imports: [AggregatorModule],
  controllers: [AggregatorController],
})
export class EndpointsControllersModule {}
