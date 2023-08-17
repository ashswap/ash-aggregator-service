import { BigNumber, PoolTypes, SubgraphPoolBase } from "@trancport/aggregator";
import { PoolNotActiveError, ProtocolProvider } from "../model.abstract.provider";
import { Injectable } from "@nestjs/common";
import { CachingService } from "src/common/caching/caching.service";
import { formatFixed } from "src/utils/bignumber";
import { Interaction, SmartContract } from "@multiversx/sdk-core/out";
import { ApiConfigService } from "src/common/api-config/api.config.service";
import { MvxApiService } from "src/common/mvx-communication/mvx.api.service";
import { PoolConfig } from "../model.service";

@Injectable()
export class JexchangeProvider extends ProtocolProvider {
    
    constructor(
        protected readonly cacheService: CachingService,
        protected readonly apiConfigService: ApiConfigService,
        protected readonly mvxApiService: MvxApiService,
    ) {
        super(apiConfigService, cacheService, mvxApiService);
    }

    getProtocolName(): string {
        return "jexchange";
    }
    
    getDirectoryName(): string {
        return __dirname;
    }

    getSCExecuteInteraction(contract: SmartContract, tokenIn: string, tokenOut: string, minAmountOut: BigNumber): Interaction {
        return contract.methods.swapTokensFixedInput([minAmountOut]);
    }

    getPoolType(): string {
        return PoolTypes[PoolTypes.ProductConstant];
    }

    async loadPoolDataInternal(poolConfig: PoolConfig): Promise<SubgraphPoolBase> {
        const firstTokenConfig = poolConfig.tokens[0];
        const secondTokenConfig = poolConfig.tokens[1];
        const [poolStatus] = await this.queryContractData(
          poolConfig.address,
          ['getStatus'],
          [[]],
        );

        const totalFeePercent = parseFloat(poolStatus.lp_fees) + parseFloat(poolStatus.platform_fees);

        if (poolStatus.paused != 0) {
            throw new PoolNotActiveError("Pair " + poolConfig.address + " not active");
        }

        const data: SubgraphPoolBase = {
            id: poolConfig.address + ":" + firstTokenConfig.id + ":" + secondTokenConfig.id,
            address: poolConfig.address,
            swapFee: ((totalFeePercent as number) / 10000).toString(),
            swapEnabled: true,
            tokens: [
                {
                    address: firstTokenConfig.id,
                    balance: formatFixed(poolStatus.first_token_reserve, firstTokenConfig.decimal),
                    decimals: firstTokenConfig.decimal,
                    priceRate: "1",
                },
                {
                    address: secondTokenConfig.id,
                    balance: formatFixed(poolStatus.second_token_reserve, secondTokenConfig.decimal),
                    decimals: secondTokenConfig.decimal,
                    priceRate: "1",
                },
            ],
            tokensList: [
                firstTokenConfig.id,
                secondTokenConfig.id,
            ],
            poolType: this.getPoolType(),
        };
        
        return data;
    }
}
