import { Module } from '@nestjs/common';
import { CachingModule } from 'src/common/caching/caching.module';
import { AggregatorService } from './aggregator.service';

@Module({
  imports: [CachingModule],
  providers: [AggregatorService],
  exports: [AggregatorService],
})
export class AggregatorModule {}
