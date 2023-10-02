import { Injectable } from "@nestjs/common";
import { XExchangeProvider } from "./xexchange/pool.provider";
import { ProtocolProvider } from "./model.abstract.provider";
import { AshswapV1Provider } from "./ashswapv1/pool.provider";
import { AshswapV2Provider } from "./ashswapv2/pool.provider";
import { JexchangeProvider } from "./jexchange/pool.provider";
import { JexchangeStableProvider } from "./jexchange_stable/pool.provider";
import { OneDexProvider } from "./onedex/pool.provider";

export class TokenConfig {
    id: string;
    decimal: number;
    coingeckoId: string;
}

export class PoolConfig {
    id: string;
    address: string;
    type: string;
    tokens: TokenConfig[];
}

export class ProtocolConfig {
    pools: Map<string, PoolConfig>;
    tokens: Map<string, TokenConfig>;
}
@Injectable()
export class ModelService {
    private providerMapper = new Map<string, ProtocolProvider>();
    private tokenConfig = new Map<string, TokenConfig>();
    private poolConfig = new Map<string, PoolConfig>();
    constructor(
        private readonly xExchangeProvider: XExchangeProvider,
        private readonly ashswapV1Provider: AshswapV1Provider,
        private readonly ashswapV2Provider: AshswapV2Provider,
        private readonly onedexProvider: OneDexProvider,
        private readonly jexchangeProvider: JexchangeProvider,
        private readonly jexchangeStableProvider: JexchangeStableProvider,
    ) {
        this.providerMapper.set(xExchangeProvider.getProtocolName(), xExchangeProvider);
        this.providerMapper.set(ashswapV1Provider.getProtocolName(), ashswapV1Provider);
        this.providerMapper.set(ashswapV2Provider.getProtocolName(), ashswapV2Provider);
        this.providerMapper.set(onedexProvider.getProtocolName(), onedexProvider);
        this.providerMapper.set(jexchangeProvider.getProtocolName(), jexchangeProvider);
        this.providerMapper.set(jexchangeStableProvider.getProtocolName(), jexchangeStableProvider);

        this.initConfig();
    }

    getProviderList(): ProtocolProvider[] {
        return Array.from(this.providerMapper.values());
    }

    getProvider(protocol: string): ProtocolProvider | undefined {
        return this.providerMapper.get(protocol);
    }

    initConfig() {
        const configPoolList = [];
        const configTokenList = [];
        for (const provider of this.providerMapper.values()) {
            const config = provider.getConfig();
            configPoolList.push(...config.pools);
            configTokenList.push(...config.tokens);
        }
        this.poolConfig = new Map(configPoolList);
        this.tokenConfig = new Map(configTokenList);
    }

    getPoolConfigs(): PoolConfig[] {
        return Array.from(this.poolConfig.values());
    }

    getPoolConfigByID(poolID: string): PoolConfig | undefined {
        return this.poolConfig.get(poolID);
    }

    getTokenConfigs(): TokenConfig[] {
        return Array.from(this.tokenConfig.values());
    }

    getTokenConfigByID(tokenID: string): TokenConfig | undefined {
        return this.tokenConfig.get(tokenID);
    }

    async getProviderFromAddress(poolAddress: string): Promise<ProtocolProvider | undefined> {
        for (const provider of this.providerMapper.values()) {
            if (await provider.getPoolContract(poolAddress)) return provider;
        }
        return undefined;
    }
}