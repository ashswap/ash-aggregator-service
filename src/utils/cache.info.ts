import moment from 'moment';
import { Constants, VE_WEEK } from './constants';
export type ContractType =
  | 'farm'
  | 'pool'
  | 'farm_controller'
  | 'voting_escrow'
  | 'fee_distributor'
  | 'farm_bribe';
export class CacheInfo {
  key: string = '';
  ttl: number = Constants.oneSecond() * 6;

  static TransactionProcessorShardNonce(shard: number): CacheInfo {
    return {
      key: `shardNonce:${shard}`,
      ttl: Number.MAX_SAFE_INTEGER,
    };
  }

  static LastProcessedEventTimestamp(type: ContractType): CacheInfo {
    return {
      key: `${type}:lastProcessedEventTimestamp`,
      ttl: Number.MAX_SAFE_INTEGER,
    };
  }

  static FarmContract(contract: string): CacheInfo {
    return {
      key: `farm:${contract}`,
      ttl: Constants.oneDay(),
    };
  }

  static FarmAddress(contract: string, address: string): CacheInfo {
    return {
      key: `farm:${contract}:${address}`,
      ttl: Constants.oneMinute() * 10,
    };
  }

  static PoolContract(contract: string): CacheInfo {
    return {
      key: `pool:${contract}`,
      ttl: Constants.oneDay(),
    };
  }

  static VeContract(contract: string): CacheInfo {
    return {
      key: `ve:${contract}`,
      ttl: Constants.oneDay(),
    };
  }

  static VeAddress(contract: string, address: string): CacheInfo {
    return {
      key: `ve:${contract}:${address}`,
      ttl: Constants.oneMinute() * 10,
    };
  }

  static FdContract(contract: string): CacheInfo {
    return {
      key: `fd:${contract}`,
      ttl: Constants.oneDay(),
    };
  }

  static FdAddress(contract: string, address: string): CacheInfo {
    return {
      key: `fd:${contract}:${address}`,
      ttl: Constants.oneMinute() * 10,
    };
  }

  static FdReceiveFeeTimestamp(contract: string): CacheInfo {
    return {
      key: `fd:${contract}:receiveFeeTimestamp`,
      ttl: Constants.oneMonth(),
    };
  }

  static FcContract(contract: string): CacheInfo {
    return {
      key: `fc:${contract}`,
      ttl: Constants.oneDay(),
    };
  }

  static FcAddress(contract: string, address: string): CacheInfo {
    const nextTime = Math.floor(moment().unix() / VE_WEEK) * VE_WEEK + VE_WEEK;
    return {
      key: `fc:${contract}:${address}`,
      ttl: Math.min(nextTime - moment().unix(), Constants.oneDay()),
    };
  }

  static FcAddressFarm(
    contract: string,
    address: string,
    farmAddress: string,
  ): CacheInfo {
    const nextTime = Math.floor(moment().unix() / VE_WEEK) * VE_WEEK + VE_WEEK;
    return {
      key: `fc:${contract}:${address}:${farmAddress}`,
      ttl: Math.min(nextTime - moment().unix(), Constants.oneDay()),
    };
  }

  static FbContract(contract: string): CacheInfo {
    return {
      key: `fb:${contract}`,
      ttl: Constants.oneDay(),
    };
  }

  static FbAddress(contract: string, address: string): CacheInfo {
    const nextTime = Math.floor(moment().unix() / VE_WEEK) * VE_WEEK + VE_WEEK;
    return {
      key: `fb:${contract}:${address}`,
      ttl: Math.min(nextTime - moment().unix(), Constants.oneDay()),
    };
  }

  static RwContract(contract: string): CacheInfo {
    return {
      key: `rw:${contract}`,
      ttl: Constants.oneDay(),
    };
  }

  static BlockShardMap(): CacheInfo {
    return {
      key: `blockchain:shard`,
      ttl: Constants.oneMinute(),
    };
  }

  static ContractShardMap(): CacheInfo {
    return {
      key: `contract:shard:map`,
      ttl: Constants.oneWeek(),
    };
  }

  static AshSupply(): CacheInfo {
    return {
      key: `stats:ashSupply`,
      ttl: Constants.oneMinute(),
    };
  }

  static RabbitTimeout(): CacheInfo {
    return {
      key: `rabbit:timeout`,
      ttl: Constants.oneMonth(),
    };
  }

  static RabbitRecoverMap(): CacheInfo {
    return {
      key: `rabbit:timeout:map`,
      ttl: Constants.oneDay(),
    };
  }

  static PoolData(): CacheInfo {
    return {
      key: `aggregator:pool`,
      ttl: Constants.oneMinute(),
    };
  }
}
