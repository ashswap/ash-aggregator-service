import * as yaml from 'js-yaml';
import * as fs from 'fs';
import { join } from 'path';
import { AbiRegistry, Address, ArgSerializer, Interaction, SmartContract, SmartContractAbi } from '@multiversx/sdk-core/out';
import { SubgraphPoolBase } from '@trancport/aggregator';
import { CachingService } from 'src/common/caching/caching.service';
import { CacheInfo } from 'src/utils/cache.info';
import { Locker } from 'src/utils/locker';
import {BigNumber} from "src/utils/bignumber";
import { PoolConfig, ProtocolConfig as ProtocolConfig, TokenConfig } from './model.service';
import { AbiService } from 'src/common/abi/abi.service';
import { ApiConfigService } from 'src/common/api-config/api.config.service';
import { MvxApiService } from 'src/common/mvx-communication/mvx.api.service';
import { CustomApiNetworkProvider } from 'src/common/mvx-communication/custom.api.network.provider';
import * as Sentry from '@sentry/browser';

export class PoolNotActiveError extends Error {
    constructor(msg: string) {
        super(msg);
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, PoolNotActiveError.prototype);
    }
}

export abstract class ProtocolProvider {
    private config: ProtocolConfig;
    private abiService: AbiService;
    private smartContractAbi: SmartContractAbi;
    private cachedContract: Map<string, SmartContract> = new Map();
    private readonly mvxApiNetworkProvider: CustomApiNetworkProvider;
    constructor(
        protected readonly apiConfigService: ApiConfigService,
        protected readonly cacheService: CachingService,
        protected readonly mvxApiService: MvxApiService,
    ) {
        this.abiService = new AbiService(
            this.apiConfigService.getGatewayUrls()
        );
        this.mvxApiNetworkProvider = mvxApiService.getApiProvider(
            this.apiConfigService.getPublicApiUrl(),
        );
    }

    async getAbi(): Promise<SmartContractAbi | undefined> {
        if (this.smartContractAbi) {
            return this.smartContractAbi;
        }
        try {
            const abiUri = join(this.getDirectoryName(), './pool.abi.json');
            // Load from files
            const jsonContent: string = await fs.promises.readFile(abiUri, {
                encoding: 'utf8',
            });
            const json = JSON.parse(jsonContent);
            const abiRegistry = AbiRegistry.create(json);
            this.smartContractAbi = new SmartContractAbi(abiRegistry);
            return this.smartContractAbi;
        } catch (error) {
          // Handle the error if the import fails
            console.log(error);
        }
    }

    protected getSmartContractAbi(): SmartContractAbi {
        return this.smartContractAbi;
    }

    abstract getProtocolName(): string;

    abstract getDirectoryName(): string;
    
    getConfig(): ProtocolConfig {
        if (this.config) {
            return this.config;
        }
        let fileName = "";
        switch (process.env.ENVIRONMENT?.toLowerCase()) {
            case 'staging':
                fileName = "pool.staging.yaml";
                break;
            case 'devnet':
                fileName =  "pool.devnet.yaml";
                break;
            default:
                fileName =  "pool.mainnet.yaml";
        }
        try {
            const yamlData = yaml.load(fs.readFileSync(join(this.getDirectoryName(), fileName), 'utf8')) as any;
            const tokenConfigs: Map<string, TokenConfig> = new Map(yamlData.token.map((token: any) => {
                const tokenConfig = new TokenConfig();
                tokenConfig.id = token.id.toLowerCase();
                tokenConfig.decimal = token.decimal;
                tokenConfig.coingeckoId = token.coingeckoId ?? "";
                return [tokenConfig.id, tokenConfig];
            }));
            const poolConfigs: Map<string, PoolConfig> = new Map(yamlData.pool.map((pool: any) => {
                const poolConfig = new PoolConfig();
                poolConfig.address = pool.address;
                poolConfig.type = this.getProtocolName();
                poolConfig.tokens = pool.tokens.map((id: string) => {
                    return tokenConfigs.get(id.toLowerCase());
                });
                poolConfig.id = pool.address + ":" + poolConfig.tokens.map((token: { id: string; }) => token.id).join(":");
                return [poolConfig.id, poolConfig];
            }));
            return {
                pools: poolConfigs,
                tokens: tokenConfigs,
            };
        } catch (_) {
            return {
                pools: new Map<string, PoolConfig>(),
                tokens: new Map<string, TokenConfig>(),
            };
        }
        
    }

    async getPoolContract(poolAddress: string): Promise<SmartContract | undefined> {
        const config = this.getConfig();
        // TODO: check using pool id instead of address
        const poolConfig = Array.from(config.pools.values()).find((pool: PoolConfig) => pool.address.toLowerCase() === poolAddress.toLowerCase());
        if (!poolConfig) {
            return undefined;
        }
        const cachedKey = `${poolAddress}`;
        let result = this.cachedContract.get(cachedKey);
        if (result) return result;
        const abi = await this.getAbi();
        if (!abi)
            throw new Error(
            'There is no abi type provided for the pool type ' + this.getProtocolName(),
            );
        result = new SmartContract({
            address: new Address(poolAddress),
            abi: abi,
        });
        this.cachedContract.set(cachedKey, result);
        return result;
    }

    abstract getSCExecuteInteraction(contract: SmartContract, tokenIn: string, tokenOut: string, minAmountOut: BigNumber): Interaction;

    async getExecutionInput(poolAddress: string, tokenIn: string, tokenOut: string, minAmountOut = new BigNumber(1)) {
        const minAmt = BigNumber.max(minAmountOut, 1);
        const argSerializer = new ArgSerializer();
        const contract = await this.getPoolContract(poolAddress);
        if (!contract) 
            throw new Error(
                'There is no abi type provided for the pool type ' + this.getProtocolName(),
            );
        const interaction = this.getSCExecuteInteraction(contract, tokenIn, tokenOut, minAmt);
        return {
            functionName: interaction.getFunction().name,
            arguments: argSerializer.valuesToBuffers(interaction.getArguments()).map(arg => arg.toString("base64")),
        };
    }

    abstract getPoolType(): string;

    abstract loadPoolDataInternal(config: PoolConfig): Promise<SubgraphPoolBase>;

    async fetchData(){
        await Locker.lock(
            `Fetching aggregator pool protocol ${this.getProtocolName()}`,
            async () => {
                console.log("Start loading pool protocol " + this.getProtocolName());
                // load config from yaml file
                const poolConfig = this.getConfig();
                // get previous data from cache
                const cacheInfo = CacheInfo.AggregatorPoolData(this.getProtocolName());
                const previousPools = await this.cacheService.getCache<(SubgraphPoolBase & {lastTimestamp: number;})[]>(cacheInfo.key);
                // load previous pool into map
                const resultMap: Map<string, SubgraphPoolBase & {lastTimestamp: number;}> = new Map();
                if (previousPools) {
                    for (const previousPool of previousPools) {
                        resultMap.set(previousPool.id, previousPool);
                    }
                }
                // promise all the loading pool process
                await Promise.all(Array.from(poolConfig.pools.values()).map(async (poolToLoad) => {
                    try {
                        //fetch current latest timestamp of smartcontract from blockchain
                        const latestTimestamp = await this.mvxApiNetworkProvider.getLatestTimestampOfWallet(poolToLoad.address);
                        // if the pool is already in cache and the timestamp is the same, skip loading
                        if (resultMap.has(poolToLoad.id) && latestTimestamp != -1 && resultMap.get(poolToLoad.id)?.lastTimestamp === latestTimestamp) {
                            return;
                        }
                        // load pool data
                        const poolData = await this.loadPoolDataInternal(poolToLoad);
                        // add latest timestamp to pool data
                        const poolDataWithTimestamp = poolData as SubgraphPoolBase & {lastTimestamp: number;};
                        poolDataWithTimestamp.lastTimestamp = latestTimestamp;
                        // add pool data to map
                        resultMap.set(poolToLoad.id, poolDataWithTimestamp);
                    } catch (error) {
                        if (error instanceof PoolNotActiveError) {
                            return;
                        }
                        console.log(error);
                        Sentry.captureException(error, {
                            extra: {
                                address: poolToLoad.id,
                            },
                        });
                        return;
                    }
                    
                }
                ));

                // convert map to array
                const result = Array.from(resultMap.values());
                // save to cache
                this.cacheService.setCache(
                    cacheInfo.key,
                    result,
                    cacheInfo.ttl,
                    );
                console.log("Finish loading pool protocol " + this.getProtocolName());
                },
                true,
            );
    }

    async queryContractData(
        wallet: string,
        methods: string[],
        args: any[][],
    ) {
        if (methods.length != args.length) {
            throw new Error('The number of methods and args must be the same');
        }
        const contract = await this.getPoolContract(wallet);
        if (!contract) {
            throw new Error(
                'There is no abi type provided for the pool type ' + this.getProtocolName(),
            );
        }
        return await Promise.all(
            methods
            .map((method, index) =>
                this.abiService
                .runQuery(contract, contract.methods[method](args[index]))
                .then(({ firstValue }) => firstValue?.valueOf()),
            ),
        );
    }
}