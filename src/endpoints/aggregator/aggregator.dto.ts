import { SwapInfo } from "@trancport/aggregator";

export interface TokenId {
    address: string,
}

export interface PoolInfo {
    allTokens: TokenId[],
    type: string,
}

export interface Hop {
    poolId: string,
    pool?: PoolInfo,
    tokenIn?: string,
    tokenInAmount?: string,
    tokenOut?: string,
    tokenOutAmount?: string,
}

export interface Route {
    hops: Hop[],
    share: number,
    tokenIn?: string,
    tokenInAmount?: string,
    tokenOut?: string,
    tokenOutAmount?: string,
}

export interface AggregatorResponseDto extends SwapInfo {
    routes?: Route[],
    effectivePrice?: number,
    effectivePriceReversed?: number,
    priceImpact?: number,
}