import { BigNumber, PoolTypes, SubgraphPoolBase } from "@trancport/aggregator";
import { PoolNotActiveError, ProtocolProvider } from "../model.abstract.provider";
import { Injectable } from "@nestjs/common";
import { CachingService } from "src/common/caching/caching.service";
import { formatFixed } from "src/utils/bignumber";
import { Interaction, SmartContract } from "@multiversx/sdk-core/out";
import { ApiConfigService } from "src/common/api-config/api.config.service";
import { PoolConfig } from "../model.service";
import { MvxApiService } from "src/common/mvx-communication/mvx.api.service";

@Injectable()
export class OneDexProvider extends ProtocolProvider {
    constructor(
        protected readonly cacheService: CachingService,
        protected readonly apiConfigService: ApiConfigService,
        protected readonly mvxApiService: MvxApiService,
    ) {
        super(apiConfigService, cacheService, mvxApiService);
    }
    getProtocolName(): string {
        return "onedex";
    }
    
    getDirectoryName(): string {
        return __dirname;
    }

    getSCExecuteInteraction(contract: SmartContract, tokenIn:string, tokenOut: string, minAmountOut: BigNumber): Interaction {
        return contract.methods.swapMultiTokensFixedInput([minAmountOut, BigNumber.from(0), tokenIn, tokenOut]);
    }

    getPoolType(): string {
        return PoolTypes[PoolTypes.ProductConstant];
    }

    async loadPoolDataInternal(poolConfig: PoolConfig): Promise<SubgraphPoolBase> {
        const firstTokenConfig = poolConfig.tokens[0];
        const secondTokenConfig = poolConfig.tokens[1];
        const [
            totalFeePercent,
            pairs,
            ] = await this.queryContractData(poolConfig.address, [
                'getTotalFeePercent',
                'viewPairs',
            ], 
            [
                [],
                [],
            ]
        );
        for (const pair of pairs) {
            if (
                (pair.token_id_0 as string).toLowerCase() == firstTokenConfig.id 
                && (pair.token_id_1 as string).toLowerCase() == secondTokenConfig.id
                ) {
                if (pair.status != 1) {
                    throw new PoolNotActiveError("Pair " + poolConfig.address + " not active");
                }
                const data: SubgraphPoolBase = {
                    id: poolConfig.address + ":" + firstTokenConfig.id + ":" + secondTokenConfig.id,
                    address: poolConfig.address,
                    swapFee: ((totalFeePercent as number)/10000).toString(),
                    swapEnabled: true,
                    tokens: [
                        {
                            address: firstTokenConfig.id,
                            balance: formatFixed(pair.reserve_0, firstTokenConfig.decimal),
                            decimals: firstTokenConfig.decimal,
                            priceRate: "1",
                        },
                        {
                            address: secondTokenConfig.id,
                            balance: formatFixed(pair.reserve_1, secondTokenConfig.decimal),
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
        throw new Error("Pair not found");
    }
}