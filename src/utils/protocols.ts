import {
  AbiRegistry,
  Address,
  SmartContract,
  SmartContractAbi,
} from '@multiversx/sdk-core/out';
import ashswapV1Abi from 'src/common/abis/ashswap_pool.abi.json';
import ashswapV2Abi from 'src/common/abis/ashswap_pool_v2.abi.json';
import xexchangeAbi from 'src/common/abis/xexchange_pair.abi.json';
const abiTypes: Record<string, any> = {
  xexchange: xexchangeAbi,
  ['ashswap-poolv1']: ashswapV1Abi,
  ['ashswap-poolv2']: ashswapV2Abi,
};
const cached: Record<string, SmartContract> = {};
export const getPoolContract = (poolAddress: string, poolType: string) => {
  const cachedKey = `${poolType}:${poolAddress}`;
  if (cached[cachedKey]) return cached[cachedKey];
  const abi = abiTypes[poolType];
  if (!abi)
    throw new Error(
      'There is no abi type provided for the pool type ' + poolType,
    );
  const abiRegistry = AbiRegistry.create(abi);
  const contract = new SmartContract({
    address: new Address(poolAddress),
    abi: new SmartContractAbi(abiRegistry),
  });
  cached[cachedKey] = contract;
  return contract;
};
