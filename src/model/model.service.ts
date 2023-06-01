import { Injectable } from "@nestjs/common";
import { ApiConfigService } from "src/common/api-config/api.config.service";
import { GraphQlService } from "src/common/graphql/graphql.service";
import { SubgraphPoolBase } from "@trancport/aggregator";
import { gql } from "graphql-request";
import { POOL_CONFIGS, PoolTypeConfig } from '../../pool_config/configuration';
import { SubgraphToken } from '@trancport/aggregator';
import { BigNumber, formatFixed } from 'src/utils/bignumber';

@Injectable()
export class ModelService {
    constructor(
        private readonly graphQLService: GraphQlService,
        private readonly apiConfigService: ApiConfigService,
    ) {
    }

    async loadXExchangePoolConfig(): Promise<SubgraphPoolBase[]> {
        const result: SubgraphPoolBase[] = [];

        const response = await this.graphQLService.getData(
            this.apiConfigService.getXExchangeServiceUrl(),
            gql`query{
                pairs(state:"Active", limit: 500) {
                    address,
                    firstToken {
                        identifier,
                        decimals,
                    },
                    secondToken {
                        identifier,
                        decimals,
                    },
                    info {
                        reserves0,
                        reserves1,
                    },
                    totalFeePercent,
                }
            }`,
            {}
        );
        
        const addressPoolResponse : Map<string, any> = new Map<string, any>();
        for (const poolResponse of response.pairs){
            addressPoolResponse.set(poolResponse.address, poolResponse);
        }
        for (const poolConfig of POOL_CONFIGS) {
            if (poolConfig.type == PoolTypeConfig.XEXCHANGE) {
                const pool = addressPoolResponse.get(poolConfig.address);
                const data: SubgraphPoolBase = {
                    id: pool.address,
                    address: pool.address,
                    swapFee: pool.totalFeePercent,
                    swapEnabled: true,
                    tokens: [
                        {
                            address: (pool.firstToken.identifier as string).toLowerCase(),
                            balance: formatFixed(BigNumber.from(pool.info.reserves0), pool.firstToken.decimals as number),
                            decimals: pool.firstToken.decimals,
                            priceRate: "1",
                        },
                        {
                            address: (pool.secondToken.identifier as string).toLowerCase(),
                            balance: formatFixed(BigNumber.from(pool.info.reserves1), pool.secondToken.decimals as number),
                            decimals: pool.secondToken.decimals,
                            priceRate: "1",
                        },
                    ],
                    tokensList: [
                        (pool.firstToken.identifier as string).toLowerCase(),
                        (pool.secondToken.identifier as string).toLowerCase(),
                    ],
                    poolType: "ProductConstant",
                };
                result.push(data);
            }
        }
        return result;
    }

    async loadAshswapV1PoolConfig(): Promise<SubgraphPoolBase[]> {
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

        const addressPoolResponse : Map<string, any> = new Map<string, any>();
        for (const poolResponse of response.pools){
            addressPoolResponse.set(poolResponse.address, poolResponse);
        }
        for (const poolConfig of POOL_CONFIGS) {
            if (poolConfig.type == PoolTypeConfig.ASHSWAP_V1) {
                const pool = addressPoolResponse.get(poolConfig.address);
                const tokensList : string[] = [];
                const tokens: SubgraphToken[] = [];
                pool.tokens.forEach((token: { id: string; }, index: number) => {
                    const data: SubgraphToken = {
                        address: (token.id  as string).toLowerCase(),
                        balance: formatFixed(BigNumber.from(pool.reserves[index]), poolConfig.tokens[index].decimal as number),
                        decimals: poolConfig.tokens[index].decimal,
                        priceRate: "1",
                        underlyingPrice: pool.underlyingPrices[index],
                    };
                    tokens.push(data);
                    tokensList.push((token.id as string).toLowerCase());
                });
                const data: SubgraphPoolBase = {
                    id: pool.address,
                    address: pool.address,
                    swapFee: ((pool.swapFeePercent as number)/100000).toString(),
                    swapEnabled: true,
                    tokens: tokens,
                    tokensList: tokensList,
                    poolType: "Stable",
                    amp: pool.ampFactor,
                };
                result.push(data);
            }
        }
        return result;
    }

    async loadAshswapV2PoolConfig(): Promise<SubgraphPoolBase[]> {
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
        const addressPoolResponse : Map<string, any> = new Map<string, any>();
        for (const poolResponse of response.poolsV2){
            addressPoolResponse.set(poolResponse.address, poolResponse);
        }
        for (const poolConfig of POOL_CONFIGS) {
            if (poolConfig.type == PoolTypeConfig.ASHSWAP_V2 ) {
                const pool = addressPoolResponse.get(poolConfig.address);
                if (!pool.state) continue;
                const tokensList : string[] = [];
                const tokens: SubgraphToken[] = [];
                pool.tokens.forEach((token: { id: string; }, index: number) => {
                    const data: SubgraphToken = {
                        address: (token.id  as string).toLowerCase(),
                        balance: formatFixed(BigNumber.from(pool.reserves[index]), poolConfig.tokens[index].decimal as number),
                        decimals: poolConfig.tokens[index].decimal,
                        priceRate: "1",
                        realBalance: formatFixed(BigNumber.from(pool.realReserves[index]), poolConfig.tokens[index].decimal as number),
                    };
                    tokens.push(data);
                    tokensList.push((token.id as string).toLowerCase());
                });
                const data: SubgraphPoolBase = {
                    id: pool.address,
                    address: pool.address,
                    swapEnabled: true,
                    tokens: tokens,
                    tokensList: tokensList,
                    poolType: "AshswapV2",
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
        }
        return result;
    }
}