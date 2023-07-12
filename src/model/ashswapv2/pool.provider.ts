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
export class AshswapV2Provider extends ProtocolProvider {
    
    constructor(
        private readonly graphQLService: GraphQlService,
        protected readonly cacheService: CachingService,
        protected readonly apiConfigService: ApiConfigService,
        protected readonly mvxApiService: MvxApiService,
    ) {
        super(apiConfigService, cacheService, mvxApiService);
    }
    getProtocolName(): string {
        return "ashswap-poolv2";
    }
    
    getDirectoryName(): string {
        return __dirname;
    }
    getSCExecuteInteraction(contract: SmartContract, tokenIn:string, tokenOut: string, minAmountOut: BigNumber): Interaction {
        return contract.methods.exchange([minAmountOut]);
    }
    getPoolType(): string {
        return PoolTypes[PoolTypes.AshswapV2];
    }

    async loadPoolDataInternal(poolConfig: PoolConfig): Promise<SubgraphPoolBase> {
        const config = this.getConfig().tokens;
        const result: SubgraphPoolBase[] = [];

        const response = await this.graphQLService.getData(
            this.apiConfigService.getAshswapServiceUrl(),
                gql`query{
                    poolsV2 {
                        address,
                        totalSupply,
                        lpPrice,
                        reserves,
                        realReserves,
                        tokens {
                            id
                        }
                        ampFactor,
                        gamma,
                        fee,
                        virtualPrice,
                        priceOracle,
                        priceScale,
                        xp,
                        futureAGammaTime,
                        d,
                        midFee,
                        outFee,
                        feeGamma,
                        state,
                        allowedExtraProfit,
                        adjustmentStep,
                        adminFee,
                        lastPrices,
                        lastPriceTs,
                        maHalfTime,
                        xcpProfit,
                        xcpProfitA,
                        isNotAdjusted,
                        initialAGammaTime,
                }
            }`,
            {}
        );
        for (const pool of response.poolsV2){
            if (!pool.state) continue;
            const tokensList : string[] = [];
            const tokens: SubgraphToken[] = [];
            pool.tokens.forEach((token: { id: string; }, index: number) => {
                const tokenDec = config.get((token.id  as string).toLowerCase())?.decimal as number;
                const data: SubgraphToken = {
                    address: (token.id  as string).toLowerCase(),
                    balance: formatFixed(BigNumber.from(pool.reserves[index]), tokenDec),
                    decimals: tokenDec,
                    priceRate: "1",
                    realBalance: formatFixed(BigNumber.from(pool.realReserves[index]), tokenDec),
                };
                tokens.push(data);
                tokensList.push((token.id as string).toLowerCase());
            });
            const data: SubgraphPoolBase = {
                id: pool.address + ":" + tokens.map((token: { address: string; }) => token.address).join(":"),
                address: pool.address,
                swapEnabled: true,
                tokens: tokens,
                tokensList: tokensList,
                poolType: this.getPoolType(),
                amp: pool.ampFactor,
                gamma: pool.gamma,
                midFee: pool.midFee,
                outFee: pool.outFee,
                feeGamma: pool.feeGamma,
                allowedExtraProfit: pool.allowedExtraProfit,
                adjustmentStep: pool.adjustmentStep,
                adminFee: pool.adminFee,
                maHalfTime: pool.maHalfTime,
                d: pool.d,
                priceScale: pool.priceScale,
                priceOracle: pool.priceOracle,
                lastPrice: pool.lastPrices,
                lastPriceTs: pool.lastPriceTs,
                xcpProfit: pool.xcpProfit,
                xcpProfitA: pool.xcpProfitA,
                virtualPrice: pool.virtualPrice,
                isNotAdjusted: pool.isNotAdjusted,
                initialAGammaTime: pool.initialAGammaTime,
                futureAGammaTime: pool.futureAGammaTime,
                totalSupply: pool.totalSupply,
            };
            result.push(data);
        }
        const resultResponse = result.find((pool) => (pool.id === poolConfig.id));
        if (!resultResponse) {
            throw new Error(`Pool ${poolConfig.address} not found`);
        }
        return resultResponse;
    }
}