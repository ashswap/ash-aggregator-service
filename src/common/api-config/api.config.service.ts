import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from 'src/utils/store';

@Injectable()
export class ApiConfigService {
  constructor(private readonly configService: ConfigService) {}

  getShards() {
    const shards = this.configService.get<number>('shards');
    if (!shards) {
      throw new Error('No shards present');
    }

    return shards;
  }

  getPublicApiUrl(): string {
    const apiUrl = this.configService.get<string>('urls.api')?.split(',');
    if (!apiUrl?.length) {
      throw new Error('No public API url present');
    }

    return apiUrl[0]; // first idx will be public api
  }

  getPrivateApiUrls(): string[] {
    const apiUrl = this.configService.get<string>('urls.api')?.split(',');
    if (!apiUrl?.length || apiUrl?.length < 2) {
      throw new Error('No private API url present');
    }

    return apiUrl.slice(1); // first idx will be public api
  }

  getStatisticUrl(): string {
    const statisticUrl = this.configService.get<string>('urls.statistic');
    if (!statisticUrl) {
      throw new Error('No statistic url present');
    }
    return statisticUrl;
  }

  getFarmWallets(): string[] {
    const wallets = this.configService.get<string[]>('wallets.farm') || [];
    if (!wallets) {
      throw new Error('No farm wallets present');
    }

    return wallets;
  }

  getPoolWallets(): string[] {
    const wallets = this.configService.get<string[]>('wallets.pool') || [];
    if (!wallets) {
      throw new Error('No pool wallets present');
    }

    return wallets;
  }

  getPoolV2Wallets(): string[] {
    const wallets = this.configService.get<string[]>('wallets.poolV2') || [];
    if (!wallets) {
      throw new Error('No pool v2 wallets present');
    }

    return wallets;
  }

  getVeWallets(): string[] {
    const wallets = this.configService.get<string[]>('wallets.ve');
    if (!wallets) {
      throw new Error('No ve wallets present');
    }

    return wallets;
  }

  getFeeDistributorWallet(): string {
    const wallet =
      this.configService.get<string>('wallets.feeDistributor') || '';
    // if (!wallet) {
    //   throw new Error('No fee distributor wallets present');
    // }

    return wallet;
  }

  getFarmControllerWallet(): string {
    const wallet = this.configService.get<string>('wallets.farmController');
    if (!wallet) {
      throw new Error('No farm controller wallets present');
    }

    return wallet;
  }

  getFarmBribeWallet(): string {
    const wallet = this.configService.get<string>('wallets.farmBribe');
    if (!wallet) {
      throw new Error('No farm bribe wallets present');
    }

    return wallet;
  }

  getRewarderWallet(): string {
    const wallet = this.configService.get<string>('wallets.rewarder');
    if (!wallet) {
      throw new Error('No rewarder wallets present');
    }

    return wallet;
  }

  getAshTokenID(): string {
    const id = this.configService.get<string>('ashTokenID');
    if (!id) {
      throw new Error('No ash token id present');
    }
    return id;
  }

  getAshTotalSupply(): string {
    const supply = this.configService.get<string>('ashTotalSupply');
    if (!supply) {
      throw new Error('No ash total supply present');
    }
    return supply;
  }

  getAshLockedContracts(): string[] {
    const contracts = this.configService.get<string[]>('ashLockedContracts');
    return contracts || [];
  }

  getPublicGatewayUrl(): string {
    const gatewayUrls = this.configService
      .get<string>('urls.gateway')
      ?.split(',');
    if (!gatewayUrls?.length) {
      throw new Error('No public gateway urls present');
    }
    return gatewayUrls[0];
  }

  getPrivateGatewayUrls(): string[] {
    const gatewayUrls = this.configService
      .get<string>('urls.gateway')
      ?.split(',');
    if (!gatewayUrls?.length || gatewayUrls?.length < 2) {
      throw new Error('No private gateway urls present');
    }
    return gatewayUrls.slice(1);
  }

  getGatewayUrls(): string[] {
    const gatewayUrls = this.configService
      .get<string>('urls.gateway')
      ?.split(',');
    if (!gatewayUrls?.length) {
      throw new Error('No gateway urls present');
    }

    return gatewayUrls;
  }

  getGatewayUrl(): string {
    const urls = this.getGatewayUrls();
    const url =
      Storage.getGatewayUrl() || urls[Math.floor(Math.random() * urls.length)];
    if (!url) {
      throw new Error('No gateway url present');
    }
    return url;
  }

  getRedisUrl(): string {
    const redisUrl = this.configService.get<string>('redis.url');
    if (!redisUrl) {
      throw new Error('No redisUrl present');
    }

    return redisUrl;
  }

  getRedisPort(): number {
    const redisPort = this.configService.get<number>('redis.port');
    if (!redisPort) {
      throw new Error('No redisPort present');
    }

    return redisPort;
  }

  getDatabaseHost(): string {
    const databaseHost = this.configService.get<string>('database.host');
    if (!databaseHost) {
      throw new Error('No database.host present');
    }

    return databaseHost;
  }

  getDatabasePort(): number {
    const databasePort = this.configService.get<number>('database.port');
    if (!databasePort) {
      throw new Error('No database.port present');
    }

    return databasePort;
  }

  getDatabaseUsername(): string {
    const databaseUsername =
      this.configService.get<string>('database.username');
    if (!databaseUsername) {
      throw new Error('No database.username present');
    }

    return databaseUsername;
  }

  getDatabasePassword(): string {
    const databasePassword =
      this.configService.get<string>('database.password');
    if (!databasePassword) {
      throw new Error('No database.password present');
    }
    return databasePassword;
  }

  getDatabaseName(): string {
    const databaseName = this.configService.get<string>('database.name');
    if (!databaseName) {
      throw new Error('No database.name present');
    }

    return databaseName;
  }

  getDatabaseConnection(): string {
    return `postgresql://${this.getDatabaseUsername()}:${this.getDatabasePassword()}@${this.getDatabaseHost()}:${this.getDatabasePort()}/${this.getDatabaseName()}`;
  }

  getIsPublicApiFeatureActive(): boolean {
    const isApiActive = this.configService.get<boolean>(
      'features.publicApi.enabled',
    );
    if (isApiActive === undefined) {
      throw new Error('No public api feature flag present');
    }

    return isApiActive;
  }

  getPublicApiFeaturePort(): number {
    const featurePort = this.configService.get<number>(
      'features.publicApi.port',
    );
    if (featurePort === undefined) {
      throw new Error('No public api port present');
    }

    return featurePort;
  }

  getIsPrivateApiFeatureActive(): boolean {
    const isApiActive = this.configService.get<boolean>(
      'features.privateApi.enabled',
    );
    if (isApiActive === undefined) {
      throw new Error('No private api feature flag present');
    }

    return isApiActive;
  }

  getPrivateApiFeaturePort(): number {
    const featurePort = this.configService.get<number>(
      'features.privateApi.port',
    );
    if (featurePort === undefined) {
      throw new Error('No private api port present');
    }

    return featurePort;
  }

  getIsCronFeatureActive(): boolean {
    const isCacheWarmerActive = this.configService.get<boolean>(
      'features.cron.enabled',
    );
    if (isCacheWarmerActive === undefined) {
      throw new Error('No cache warmer feature flag present');
    }

    return isCacheWarmerActive;
  }

  getCronFeaturePort(): number {
    const featurePort = this.configService.get<number>('features.cron.port');
    if (featurePort === undefined) {
      throw new Error('No cache warmer port present');
    }

    return featurePort;
  }

  getIsTransactionProcessorFeatureActive(): boolean {
    const isTransactionProcessorActive = this.configService.get<boolean>(
      'features.transactionProcessor.enabled',
    );
    if (isTransactionProcessorActive === undefined) {
      throw new Error('No transaction processor feature flag present');
    }

    return isTransactionProcessorActive;
  }

  getTransactionProcessorFeaturePort(): number {
    const featurePort = this.configService.get<number>(
      'features.transactionProcessor.port',
    );
    if (featurePort === undefined) {
      throw new Error('No transaction processor port present');
    }

    return featurePort;
  }

  getTransactionProcessorMaxLookBehind(): number {
    const maxLookBehind = this.configService.get<number>(
      'features.transactionProcessor.maxLookBehind',
    );
    if (maxLookBehind === undefined) {
      throw new Error('No transaction processor max look behind present');
    }

    return maxLookBehind;
  }

  getIsNetworkProcessorFeatureActive(): boolean {
    const isNetworkProcessorActive = this.configService.get<boolean>(
      'features.networkProcessor.enabled',
    );
    if (isNetworkProcessorActive === undefined) {
      throw new Error('No network processor feature flag present');
    }

    return isNetworkProcessorActive;
  }

  getNetworkProcessorFeaturePort(): number {
    const featurePort = this.configService.get<number>(
      'features.networkProcessor.port',
    );
    if (featurePort === undefined) {
      throw new Error('No network processor port present');
    }

    return featurePort;
  }

  getJwtSecret(): string {
    const jwtSecret = this.configService.get<string>('security.jwtSecret');
    if (!jwtSecret) {
      throw new Error('No jwtSecret present');
    }

    return jwtSecret;
  }

  getSecurityAdmins(): string[] {
    const admins = this.configService.get<string[]>('security.admins');
    if (admins === undefined) {
      throw new Error('No security admins value present');
    }

    return admins;
  }

  getRateLimiterSecret(): string | undefined {
    return this.configService.get<string>('rateLimiterSecret');
  }

  getAxiosTimeout(): number {
    return (
      this.configService.get<number>('keepAliveTimeout.downstream') ?? 61000
    );
  }

  getIsKeepAliveAgentFeatureActive(): boolean {
    return this.configService.get<boolean>('keepAliveAgent.enabled') ?? true;
  }

  getServerTimeout(): number {
    return this.configService.get<number>('keepAliveTimeout.upstream') ?? 60000;
  }

  getHeadersTimeout(): number {
    return this.getServerTimeout() + 1000;
  }

  getUseCachingInterceptor(): boolean {
    return this.configService.get<boolean>('useCachingInterceptor') ?? false;
  }

  getIsEventNotifierFeatureActive(): boolean {
    return this.configService.get<boolean>('features.notifier.enabled') ?? true;
  }

  getEventNotifierURI() {
    const uri = this.configService.get<string>('features.notifier.rabbitMQURI');
    if (!uri) {
      throw new Error('No notifier uri present');
    }
    return uri;
  }

  getEventNotifierPort() {
    const port = this.configService.get<number>('features.notifier.port');
    if (!port) {
      throw new Error('No event notifier port present');
    }
    return port;
  }

  getIsPubSubFeatureActive(): boolean {
    const isApiActive = this.configService.get<boolean>(
      'features.pubsub.enabled',
    );
    if (isApiActive === undefined) {
      throw new Error('No pubsub feature flag present');
    }

    return isApiActive;
  }

  getSentryDsn() {
    return this.configService.get<string>('sentryDsn');
  }
}
