import { BigNumber, PoolTypes, SubgraphPoolBase, SubgraphToken } from "@trancport/aggregator";
import { PoolNotActiveError, ProtocolProvider } from "../model.abstract.provider";
import { Injectable } from "@nestjs/common";
import { CachingService } from "src/common/caching/caching.service";
import { formatFixed } from "src/utils/bignumber";
import { Interaction, SmartContract } from "@multiversx/sdk-core/out";
import { ApiConfigService } from "src/common/api-config/api.config.service";
import { MvxApiService } from "src/common/mvx-communication/mvx.api.service";
import { PoolConfig } from "../model.service";

@Injectable()
export class JexchangeStableProvider extends ProtocolProvider {
    
    constructor(
        protected readonly cacheService: CachingService,
        protected readonly apiConfigService: ApiConfigService,
        protected readonly mvxApiService: MvxApiService,
    ) {
        super(apiConfigService, cacheService, mvxApiService);
    }

    getProtocolName(): string {
        return "jexchange-stable";
    }
    
    getDirectoryName(): string {
        return __dirname;
    }

    getSCExecuteInteraction(contract: SmartContract, tokenIn: string, tokenOut: string, minAmountOut: BigNumber): Interaction {
        return contract.methods.swap([tokenOut, minAmountOut]);
    }

    getPoolType(): string {
        return PoolTypes[PoolTypes.Stable];
    }

    async loadPoolDataInternal(poolConfig: PoolConfig): Promise<SubgraphPoolBase> {
        const [poolStatus] = await this.queryContractData(
          poolConfig.address,
          ['getStatus'],
          [[]],
        );

        const totalFeePercent = parseFloat(poolStatus.swap_fee);

        if (poolStatus.paused != 0) {
            throw new PoolNotActiveError("Pair " + poolConfig.address + " not active");
        }

        const tokens: SubgraphToken[] = poolConfig.tokens.map((token, i) => ({
            address: token.id,
            balance: formatFixed(BigNumber.from(poolStatus.reserves[i]), token.decimal),
            decimals: token.decimal,
            priceRate: "1",
            underlyingPrice: BigNumber.from(0).pow(18).toString(),
        }));

        const tokenIds = poolConfig.tokens.map((token) => token.id);

        const data: SubgraphPoolBase = {
            id: poolConfig.address + ":" + tokenIds.join(":"),
            address: poolConfig.address,
            swapFee: (totalFeePercent / 1_000_000).toString(),
            swapEnabled: true,
            tokens,
            tokensList: tokenIds,
            poolType: this.getPoolType(),
            amp: poolStatus.ampFactor,
        };
        
        return data;
    }
}
