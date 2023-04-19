import { Injectable } from '@nestjs/common';
import { CachingService } from 'src/common/caching/caching.service';
import { CacheInfo } from 'src/utils/cache.info';

@Injectable()
export class AggregatorService {
  constructor(
    private readonly cachingService: CachingService,
  ) {}

  async getHealthCache(deployment: string): Promise<number | undefined> {
    const cacheInfo = CacheInfo.Healthcheck(deployment);
    return await this.cachingService.getCache(cacheInfo.key);
  }

  async getHealthNodeCache(index: number, shard: number): Promise<boolean> {
    const configCache = CacheInfo.HealthcheckElrondGatewayShard(index, shard);
    return (
      (await this.cachingService.getCache<boolean>(configCache.key)) ?? false
    );
  }

  async getHealthPoolCache(): Promise<boolean> {
    const configCache = CacheInfo.HealthcheckPool();
    return (await this.cachingService.getCache(configCache.key)) ?? false;
  }
}
