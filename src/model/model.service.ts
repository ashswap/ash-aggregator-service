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
}