import { BigNumber, PoolTypes, SubgraphPoolBase } from "@trancport/aggregator";
import { PoolNotActiveError, ProtocolProvider } from "../model.abstract.provider";
import { Injectable } from "@nestjs/common";
import { GraphQlService } from "src/common/graphql/graphql.service";
import { CachingService } from "src/common/caching/caching.service";
import { formatFixed } from "src/utils/bignumber";
import { Interaction, SmartContract } from "@multiversx/sdk-core/out";
import { ApiConfigService } from "src/common/api-config/api.config.service";
import { PoolConfig } from "../model.service";
import { formatTokenIdentifier } from "src/utils/token";
import { MvxApiService } from "src/common/mvx-communication/mvx.api.service";

@Injectable()
export class XExchangeProvider extends ProtocolProvider {
    constructor(
        private readonly graphQLService: GraphQlService,
        protected readonly cacheService: CachingService,
        protected readonly apiConfigService: ApiConfigService,
        protected readonly mvxApiService: MvxApiService,
    ) {
        super(apiConfigService, cacheService, mvxApiService);
    }
    getProtocolName(): string {
        return "xexchange";
    }
    
    getDirectoryName(): string {
        return __dirname;
    }

    getSCExecuteInteraction(contract: SmartContract, tokenIn:string, tokenOut: string, minAmountOut: BigNumber): Interaction {
        return contract.methods.swapTokensFixedInput([tokenOut, minAmountOut]);
    }

    getPoolType(): string {
        return PoolTypes[PoolTypes.ProductConstant];
    }

    async loadPoolDataInternal(poolConfig: PoolConfig): Promise<SubgraphPoolBase> {
        const firstTokenConfig = poolConfig.tokens[0];
        const secondTokenConfig = poolConfig.tokens[1];
        const [
            totalFeePercent,
            firstTokenReserve,
            secondTokenReserve,
            state,
            ] = await this.queryContractData(poolConfig.address, [
                'getTotalFeePercent',
                'getReserve',
                'getReserve',
                'getState',
            ], 
            [
                [],
                [
                    formatTokenIdentifier(firstTokenConfig.id),
                ],
                [
                    formatTokenIdentifier(secondTokenConfig.id),
                ],
                [],
            ]
        );
        if (state.name != 'Active') {
            throw new PoolNotActiveError("Pool " + poolConfig.address + " is not active");
        }
        const data: SubgraphPoolBase = {
            id: poolConfig.address + ":" + firstTokenConfig.id + ":" + secondTokenConfig.id,
            address: poolConfig.address,
            swapFee: ((totalFeePercent as number)/100000).toString(), // xexchange use 100_000 as 100%
            swapEnabled: true,
            tokens: [
                {
                    address: firstTokenConfig.id,
                    balance: formatFixed(BigNumber.from(firstTokenReserve), firstTokenConfig.decimal), // scale down to float number
                    decimals: firstTokenConfig.decimal,
                    priceRate: "1",
                },
                {
                    address: secondTokenConfig.id,
                    balance: formatFixed(BigNumber.from(secondTokenReserve), secondTokenConfig.decimal), // scale down to float number
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