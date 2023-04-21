import { Locker } from '../utils/locker';
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';
import { ModelService } from 'src/model/model.service';
import { CachingService } from 'src/common/caching/caching.service';
import { CacheInfo } from 'src/utils/cache.info';

@Injectable()
export class PoolDataCron {
  private logger: Logger;
  constructor(
    private readonly modelService: ModelService,
    private readonly cacheService: CachingService,
  ) {
    this.logger = new Logger(PoolDataCron.name);
  }

  @Cron('*/6 * * * * *')
  async getPoolDataAgent() {
    await Locker.lock(
      'Fetching pool data',
      async () => {
        const [xExchangePools, ashswapV1Pools] = await Promise.all([
          this.modelService.loadXExchangePoolConfig(),
          this.modelService.loadAshswapV1PoolConfig(),
        ]);
        let result = [
          ...xExchangePools,
          ...ashswapV1Pools,
        ]
        this.cacheService.setCache(
          CacheInfo.PoolData().key,
          result,
          CacheInfo.PoolData().ttl,
        );
        this.logger.log("Load data successfully");
      },
      true,
    );
  }
}
