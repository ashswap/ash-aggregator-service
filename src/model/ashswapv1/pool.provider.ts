import { BigNumber, PoolTypes, SubgraphPoolBase, SubgraphToken } from "@trancport/aggregator";
import { ProtocolProvider } from "../model.abstract.provider";
import { Injectable } from "@nestjs/common";
import { GraphQlService } from "src/common/graphql/graphql.service";
import { CachingService } from "src/common/caching/caching.service";
import { formatFixed } from "src/utils/bignumber";
import { gql } from "graphql-request";
import { Interaction, SmartContract } from "@multiversx/sdk-core/out";
import { ApiConfigService } from "src/common/api-config/api.config.service";
import { MvxApiService } from "src/common/mvx-communication/mvx.api.service";
import { PoolConfig } from "../model.service";

@Injectable()
export class AshswapV1Provider extends ProtocolProvider {
    
    constructor(
        private readonly graphQLService: GraphQlService,
        protected readonly cacheService: CachingService,
        protected readonly apiConfigService: ApiConfigService,
        protected readonly mvxApiService: MvxApiService,
    ) {
        super(apiConfigService, cacheService, mvxApiService);
    }
    getProtocolName(): string {
        return "ashswap-poolv1";
    }
    
    getDirectoryName(): string {
        return __dirname;
    }
    getSCExecuteInteraction(contract: SmartContract, tokenIn:string, tokenOut: string, minAmountOut: BigNumber): Interaction {
        return contract.methods.exchange([tokenOut, minAmountOut]);
    }
    getPoolType(): string {
        return PoolTypes[PoolTypes.Stable];
    }
    async loadPoolDataInternal(poolConfig: PoolConfig): Promise<SubgraphPoolBase> {
        const config = this.getConfig().tokens;
        const result: SubgraphPoolBase[] = [];

        const response = await this.graphQLService.getData(
            this.apiConfigService.getAshswapServiceUrl(),
            gql`query{
                    pools {
                    address,
                    reserves,
                    tokens {
                    id
                    },
                    totalSupply,
                    swapFeePercent,
                    adminFeePercent,
                    ampFactor,
                    state,
                    underlyingPrices,
                }
            }`,
            {}
        );
        for (const pool of response.pools){
            const tokensList : string[] = [];
            const tokens: SubgraphToken[] = [];
            pool.tokens.forEach((token: { id: string; }, index: number) => {
                const tokenDec = config.get((token.id  as string).toLowerCase())?.decimal as number;
                const data: SubgraphToken = {
                    address: (token.id  as string).toLowerCase(),
                    balance: formatFixed(BigNumber.from(pool.reserves[index]), tokenDec),
                    decimals: tokenDec,
                    priceRate: "1",
                    underlyingPrice: pool.underlyingPrices[index],
                };
                tokens.push(data);
                tokensList.push((token.id as string).toLowerCase());
            });
            const data: SubgraphPoolBase = {
                id: pool.address + ":" + tokens.map((token: { address: string; }) => token.address).join(":"),
                address: pool.address,
                swapFee: ((pool.swapFeePercent as number)/100000).toString(),
                swapEnabled: true,
                tokens: tokens,
                tokensList: tokensList,
                poolType: this.getPoolType(),
                amp: pool.ampFactor,
            };
            result.push(data);
        }
        const resultResponse = result.find((pool) => pool.id === poolConfig.id);
        if (!resultResponse) {
            throw new Error(`Pool ${poolConfig.address} not found`);
        }
        return resultResponse;
    }
}