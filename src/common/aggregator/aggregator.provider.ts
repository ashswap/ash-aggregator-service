import { Injectable } from '@nestjs/common';
import { SOR } from '@trancport/aggregator';
import { getPoolContract } from 'src/utils/protocols';
import {BigNumber} from "src/utils/bignumber";
import { ApiConfigService } from '../api-config/api.config.service';
import { POOL_CONFIGS } from 'pool_config/configuration';
import { ArgSerializer, Interaction } from '@multiversx/sdk-core/out';

@Injectable()
export class AggregatorProvider {
  private sor: SOR;

  constructor() {
    this.sor = new SOR();
  }

  getSOR(): SOR {
    return this.sor;
  }

  getExchangeConfig(poolAddress: string, tokenOut: string, minAmountOut = new BigNumber(1)): {functionName: string, arguments: string[]} {
    const config = POOL_CONFIGS.find(p => p.address === poolAddress);
    if(!config) throw new Error(`Missiong configuration for pool ${poolAddress}`);
    const contract = getPoolContract(poolAddress, config.type);
    const minAmt = BigNumber.max(minAmountOut, 1);
    const argSerializer = new ArgSerializer();
    let interaction: Interaction;
    switch(config.type){
        case "xexchange":
            interaction = contract.methods.swapTokensFixedInput([tokenOut, minAmt]);
            break;
        case "ashswap-poolv1":
          interaction = contract.methods.exchange([tokenOut, minAmt]);
          break;
        case "ashswap-poolv2":
          interaction = contract.methods.exchange([minAmt]);
          break;
        default: throw new Error(`Unknown pool type ${config.type}`);
    }
    return {
      functionName: interaction.getFunction().name,
      arguments: argSerializer.valuesToBuffers(interaction.getArguments()).map(arg => arg.toString("base64"))
    }
}
}