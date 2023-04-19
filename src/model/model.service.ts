import { Injectable } from "@nestjs/common";
import { ApiConfigService } from "src/common/api-config/api.config.service";
import { GraphQlService } from "src/common/graphql/graphql.service";
import { SubgraphPoolBase, SubgraphToken } from "@trancport/aggregator"
import { gql } from "graphql-request";

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

        for (const pool of response.pairs) {
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

        return result;
    }

}