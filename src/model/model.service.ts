import { Injectable } from "@nestjs/common";
import { ApiConfigService } from "src/common/api-config/api.config.service";
import { GraphQlService } from "src/common/graphql/graphql.service";
import { SubgraphPoolBase } from "@trancport/aggregator"
import { gql } from "graphql-request";
import { POOL_CONFIGS, PoolTypeConfig } from '../../pool_config/configuration';
import { SubgraphToken } from '../../../ash-aggregator-sdk/dist/src/types';

@Injectable()
export class ModelService {
    constructor(
        private readonly graphQLService: GraphQlService,
        private readonly apiConfigService: ApiConfigService,
    ) {
    }

    async loadXExchangePoolConfig(): Promise<SubgraphPoolBase[]> {
        let result: SubgraphPoolBase[] = [];

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
        
        let addressPoolResponse : Map<string, any> = new Map<string, any>();
        for (const poolResponse of response.pairs){
            addressPoolResponse.set(poolResponse.address, poolResponse);
        }

        for (const poolConfig of POOL_CONFIGS) {
            if (poolConfig.type == PoolTypeConfig.XEXCHANGE) {
                const pool = addressPoolResponse.get(poolConfig.address);
                let data: SubgraphPoolBase = {
                    id: pool.address,
                    address: pool.address,
                    swapFee: pool.totalFeePercent,
                    swapEnabled: true,
                    tokens: [
                        {
                            address: pool.firstToken.identifier,
                            balance: pool.info.reserves0,
                            decimals: pool.firstToken.decimals,
                            weight: null,
                            priceRate: "1"
                        },
                        {
                            address: pool.secondToken.identifier,
                            balance: pool.info.reserves1,
                            decimals: pool.secondToken.decimals,
                            weight: null,
                            priceRate: "1"
                        }
                    ],
                    tokensList: [
                        pool.firstToken.identifier,
                        pool.secondToken.identifier,
                    ],
                    totalShares: "10",
                    poolType: "ProductConst",
                };
                result.push(data);
            }
        }

        return result;
    }

    async loadAshswapV1PoolConfig(): Promise<SubgraphPoolBase[]> {
        let result: SubgraphPoolBase[] = [];

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
        
        let addressPoolResponse : Map<string, any> = new Map<string, any>();
        for (const poolResponse of response.pools){
            addressPoolResponse.set(poolResponse.address, poolResponse);
        }

        for (const poolConfig of POOL_CONFIGS) {
            if (poolConfig.type == PoolTypeConfig.ASHSWAP_V1) {
                const pool = addressPoolResponse.get(poolConfig.address);
                let tokensList : string[] = [];
                let tokens: SubgraphToken[] = [];
                pool.tokens.forEach((token: { id: string; }, index: number) => {
                    let data: SubgraphToken = {
                        address: token.id,
                        balance: pool.reserves[index],
                        decimals: poolConfig.tokens[index].decimal,
                        weight: null,
                        priceRate: "1",
                    };
                    tokens.push(data);
                    tokensList.push(token.id);
                });
                let data: SubgraphPoolBase = {
                    id: pool.address,
                    address: pool.address,
                    swapFee: ((pool.swapFeePercent as number)/100000).toString(),
                    swapEnabled: true,
                    tokens: tokens,
                    tokensList: tokensList,
                    totalShares: "10",
                    poolType: "Stable",
                };
                result.push(data);
            }
        }

        return result;
    }
}