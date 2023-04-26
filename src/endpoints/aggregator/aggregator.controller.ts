import { Response } from 'express';
import {
  Controller,
  Get,
  HttpStatus,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { AggregatorProvider } from 'src/common/aggregator/aggregator.provider';
import { SubgraphPoolBase, SubgraphToken, SwapTypes, bnum } from '@trancport/aggregator';
import { CachingService } from 'src/common/caching/caching.service';
import { CacheInfo } from 'src/utils/cache.info';
import { AggregatorResponseDto, Hop, Route, TokenId } from './aggregator.dto';
import { formatFixed } from 'src/utils/bignumber';
import { POOL_CONFIGS } from 'pool_config/configuration';

@Controller()
export class AggregatorController {
  constructor(
    private readonly aggregatorProvider: AggregatorProvider,
    private readonly cachingService: CachingService,
  ) {}

  private findTokenDecimal(dataToken: [SubgraphToken], tokenId: string): number {
    return dataToken.find(token => token.address == tokenId)?.decimals ?? 0;
  }

  @Get('/aggregate')
  @ApiOperation({
    summary: 'Aggregate',
    description: "Returns paths",
  })
  async aggregate(
    @Query('from') sourceToken: string,
    @Query('to') destToken: string,
    @Query('amount') amount: number,
    @Res() response: Response,
  ) {
    if (!sourceToken || !destToken || !amount) {
      return response.status(HttpStatus.BAD_REQUEST).json();
    }

    const dataPool = await this.cachingService.getCache<SubgraphPoolBase[]>(CacheInfo.AggregatorPoolData().key);
    if (!dataPool){
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json("Data is not set");
    }

    const dataToken = await this.cachingService.getCache<[SubgraphToken]>(CacheInfo.AggregatorTokenData().key);
    if (!dataToken){
      return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json("Data is not set");
    }

    const sor = await this.aggregatorProvider.getSOR();
    sor.setPools(dataPool);
    const swapInfo: AggregatorResponseDto = await sor.getSwaps(
      sourceToken,
      destToken,
      SwapTypes.SwapExactIn,
      amount,
    );
    // build routes
    const routes : Route[] = [];
    let route : Route = {
      hops: [{poolId: ""}],
      share: 0,
    };
    let hop: Hop;
    for (const [index, swap] of swapInfo.swaps.entries()) {
      const new_route = swap.amount == "0" ? false : true;
      const swapAmount = formatFixed(
        swap.amount,
        this.findTokenDecimal(dataToken, swapInfo.tokenIn),
      );
      const returnAmount = formatFixed(
        swap.returnAmount ?? 0,
        this.findTokenDecimal(dataToken, swapInfo.tokenOut),
      );
      const poolConfig = POOL_CONFIGS.find((poolConfig) => poolConfig.address == swap.poolId);

      if (new_route) {
        if (index != 0) {
          route.tokenOut = swap.assetOut;
          route.tokenOutAmount = returnAmount;
          routes.push(route);
        }
        hop = {
          poolId: swap.poolId,
          pool: {
            allTokens: poolConfig?.tokens.map<TokenId>((tokenConfig) => {
              return {
                address: tokenConfig.id,
                decimal: tokenConfig.decimal,
              };
            }),
            type: poolConfig?.type,
          },
          tokenInAmount: swapAmount,
          tokenOutAmount: returnAmount,
          tokenIn: swap.assetIn,
          tokenOut: swap.assetOut,
        };
        route = {
          hops: [hop],
          share: 0,
          tokenIn: swap.assetIn,
          tokenInAmount: swapAmount,
          tokenOut: "", // setup when finish
          tokenOutAmount: "",
        };
      } else {
        hop = {
          poolId: swap.poolId,
          pool: {
            allTokens: poolConfig?.tokens.map<TokenId>((tokenConfig) => {
              return {
                address: tokenConfig.id,
                decimal: tokenConfig.decimal,
              };
            }),
            type: poolConfig?.type,
          },
          tokenInAmount: route.hops.at(-1)?.tokenOutAmount,
          tokenOutAmount: returnAmount,
          tokenIn: swap.assetIn,
          tokenOut: swap.assetOut,
        };
        route.hops.push(hop);
      }
      if (index == swapInfo.swaps.length - 1) {
        route.tokenOut = swap.assetOut;
        route.tokenOutAmount = returnAmount;
        routes.push(route);
      }
    }
    swapInfo.routes = routes;
    
    const swapAmount = formatFixed(
      swapInfo.swapAmount,
      this.findTokenDecimal(dataToken, swapInfo.tokenIn),
    );
    const returnAmount = formatFixed(
        swapInfo.returnAmount,
        this.findTokenDecimal(dataToken, swapInfo.tokenOut),
    );

    const effectivePrice = bnum(swapAmount).div(returnAmount);
    const effectivePriceReversed = bnum(returnAmount).div(swapAmount);
    const priceImpact = effectivePrice.div(swapInfo.marketSp).minus(1);

    swapInfo.swapAmount = swapAmount;
    swapInfo.returnAmount = returnAmount;
    swapInfo.effectivePrice = effectivePrice.toNumber();
    swapInfo.effectivePriceReversed = effectivePriceReversed.toNumber();
    swapInfo.priceImpact = priceImpact.toNumber();

    return response.status(HttpStatus.OK).json(swapInfo);
  }
}
