import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CachingModule } from 'src/common/caching/caching.module';
import { PoolDataCron } from './pool.data.cron';
import { ModelModule } from 'src/model/model.module';
import { AggregatorModule } from 'src/common/aggregator/aggregator.module';
import { SentryModule } from '@ntegral/nestjs-sentry';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CachingModule,
    ModelModule,
    AggregatorModule,
    ModelModule,
    SentryModule.forRootAsync(
      DynamicModuleUtils.getSentryModuleAsyncOptions(),
    ),
  ],
  providers: [PoolDataCron],
})
export class CronModule {}
