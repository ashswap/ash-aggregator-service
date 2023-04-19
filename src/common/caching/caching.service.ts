import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import Redis from 'ioredis';
import { CacheInfo } from 'src/utils/cache.info';
import { Constants } from '../../utils/constants';
import { ApiConfigService } from '../api-config/api.config.service';
import { ApiService } from '../network/api.service';
import * as Sentry from '@sentry/browser';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { promisify } = require('util');

@Injectable()
export class CachingService {
  private client = new Redis(
    this.apiConfigService.getRedisPort(),
    this.apiConfigService.getRedisUrl(),
  );
  private asyncSet = promisify(this.client.set).bind(this.client);
  private asyncGet = promisify(this.client.get).bind(this.client);
  private asyncMGet = promisify(this.client.mget).bind(this.client);
  private asyncIncr = promisify(this.client.incr).bind(this.client);
  private asyncHGet = promisify(this.client.hget).bind(this.client);
  private asyncHGetAll = promisify(this.client.hgetall).bind(this.client);
  private asyncHSet = promisify(this.client.hset).bind(this.client);

  private asyncDel = promisify(this.client.del).bind(this.client);
  private asyncKeys = promisify(this.client.keys).bind(this.client);

  private asyncExpire = promisify(this.client.expire).bind(this.client);

  private static cache: Cache;

  constructor(
    private readonly apiConfigService: ApiConfigService,
    @Inject(CACHE_MANAGER)
    cache: Cache,
    private readonly apiService: ApiService,
  ) {
    CachingService.cache = cache;
  }

  async setCacheRemote<T>(key: string, value: T, ttl: number): Promise<T> {
    await this.asyncSet(key, JSON.stringify(value), 'EX', ttl);
    return value;
  }

  async getCacheRemote<T>(key: string): Promise<T | undefined> {
    const response = await this.asyncGet(key);
    if (response === undefined || response === null) return undefined;
    try {
      return JSON.parse(response);
    } catch (error) {
      Sentry.captureException(error, {
        extra: {
          key: key,
          response: response,
        },
      });
    }
    return undefined;
  }

  async setHCacheRemote<T extends Record<string, any>>(
    key: string,
    value: Partial<T>,
    ttl?: number,
  ): Promise<Partial<T>> {
    if (Object.keys(value).length === 0) return value;
    await this.asyncHSet(
      key,
      Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, JSON.stringify(v)]),
      ),
    );
    if (ttl) {
      await this.asyncExpire(key, ttl);
    }
    return value;
  }

  async getHCacheRemote<T extends Record<string, any>>(
    key: string,
    field: keyof T,
  ): Promise<T[keyof T] | undefined> {
    const response = await this.asyncHGet(key, field);
    if (response === undefined || response === null) return undefined;
    try {
      return JSON.parse(response);
    } catch (error) {
      Sentry.captureException(error, {
        extra: {
          key: key,
          field: field,
          response: response,
        },
      });
    }
    return undefined;
  }

  async getAllHCacheRemote<T extends Record<string, any>>(
    key: string,
  ): Promise<T | undefined> {
    const response = await this.asyncHGetAll(key);
    if (response === undefined || response === null) return undefined;
    try {
      const entries = Object.entries(response).map(([k, v]) => [
        k,
        JSON.parse(v as string),
      ]);
      if (entries.length === 0) return undefined;
      return Object.fromEntries(entries) as T;
    } catch (error) {
      Sentry.captureException(error, {
        extra: {
          key: key,
          response: response,
        },
      });
    }
    return undefined;
  }

  async incrementRemote(key: string): Promise<number> {
    return await this.asyncIncr(key);
  }

  async setCacheLocal<T>(key: string, value: T, ttl: number): Promise<T> {
    await CachingService.cache.set(key, value, ttl);
    return value;
  }

  async getCacheLocal<T>(key: string): Promise<T | undefined> {
    return await CachingService.cache.get<T>(key);
  }

  public async getCache<T>(key: string): Promise<T | undefined> {
    const value = await this.getCacheLocal<T>(key);
    if (value) {
      return value;
    }

    return await this.getCacheRemote<T>(key);
  }

  async setCache<T>(key: string, value: T, ttl: number): Promise<T> {
    await this.setCacheLocal<T>(key, value, ttl);
    await this.setCacheRemote<T>(key, value, ttl);
    return value;
  }

  async getOrSetCache<T>(
    key: string,
    promise: () => Promise<T>,
    remoteTtl: number,
  ): Promise<T> {
    const cachedValue = await this.getCacheLocal<T>(key);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    const cached = await this.getCacheRemote<T>(key);
    if (cached !== undefined && cached !== null) {
      // we only set ttl to half because we don't know what the real ttl of the item is and we want it to work good in most scenarios
      await this.setCacheLocal<T>(key, cached, remoteTtl / 2);
      return cached;
    }

    const value = await promise();

    if (remoteTtl > 0) {
      await this.setCacheLocal<T>(key, value, remoteTtl);
      await this.setCacheRemote<T>(key, value, remoteTtl);
    }
    return value;
  }

  async refreshCacheLocal<T>(
    key: string,
    ttl: number = Constants.oneSecond() * 6,
  ): Promise<T | undefined> {
    const value = await this.getCacheRemote<T>(key);
    if (value) {
      await this.setCacheLocal<T>(key, value, ttl);
    }

    return value;
  }

  async deleteInCacheLocal(key: string) {
    await CachingService.cache.del(key);
  }

  async deleteInCache(key: string): Promise<string[]> {
    const invalidatedKeys = [];

    if (key.includes('*')) {
      const allKeys = await this.asyncKeys(key);
      for (const key of allKeys) {
        await CachingService.cache.del(key);
        await this.asyncDel(key);
        invalidatedKeys.push(key);
      }
    } else {
      await CachingService.cache.del(key);
      await this.asyncDel(key);
      invalidatedKeys.push(key);
    }

    return invalidatedKeys;
  }

  async delCache(key: string): Promise<void> {
    await this.asyncDel(key);
  }

  public async getKeys(key: string | undefined) {
    if (key) {
      return await this.asyncKeys(key);
    }
  }

  async getShouldRevalidateAccData(key: string) {
    if (this.apiConfigService.getIsEventNotifierFeatureActive() === false)
      return false;
    const isRabbitTimeout =
      (await this.getCache(CacheInfo.RabbitTimeout().key)) === 'true';
    const cacheRabbitRecoverMap = CacheInfo.RabbitRecoverMap();
    const isRevalidated =
      (await this.getHCacheRemote(cacheRabbitRecoverMap.key, key)) === 'true';
    const result = isRabbitTimeout || !isRevalidated;
    if (result) {
      await this.setHCacheRemote(
        cacheRabbitRecoverMap.key,
        { [key]: '' + true },
        cacheRabbitRecoverMap.ttl,
      );
    }
    return result;
  }
}
