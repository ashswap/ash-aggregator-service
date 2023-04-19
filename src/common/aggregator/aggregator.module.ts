import { Module } from '@nestjs/common';
import { AggregatorProvider } from './aggregator.provider';

@Module({
  providers: [AggregatorProvider],
  exports: [AggregatorProvider]
})
export class AggregatorModule {}
