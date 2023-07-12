import {
  ContractQueryResponse,
  ProxyNetworkProvider,
} from '@multiversx/sdk-network-providers';
import {
  AbiRegistry,
  Address,
  Query,
  SmartContract,
  SmartContractAbi,
} from '@multiversx/sdk-core/out';
import { PerformanceProfiler } from '../performance.profiler';

export class SmartContractProfiler extends SmartContract {
  abiRegistry: AbiRegistry;
  constructor(
    { address, abi }: { address: Address; abi: SmartContractAbi },
    abiRegistry: AbiRegistry,
  ) {
    super({ address, abi });
    this.abiRegistry = abiRegistry;
  }
  async runQuery(
    provider: ProxyNetworkProvider,
    query: Query,
  ): Promise<ContractQueryResponse> {
    const profiler = new PerformanceProfiler();

    const response = await provider.queryContract(query);

    profiler.stop();

    return response;
  }

  getAbiType(typeName: string) {
    const type = this.abiRegistry.customTypes.find(
      (t) => t.getName() === typeName,
    );
    if (!type) throw new Error('invalid custom type');
    return type;
  }
}
