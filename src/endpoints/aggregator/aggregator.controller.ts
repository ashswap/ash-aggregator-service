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
import { SubgraphPoolBase, SwapTypes } from '@trancport/aggregator';
import { CachingService } from 'src/common/caching/caching.service';
import { CacheInfo } from 'src/utils/cache.info';
import { AggregatorResponseDto, Hop, Route } from './aggregator.dto';

@Controller()
export class AggregatorController {
  constructor(
    private readonly aggregatorProvider: AggregatorProvider,
    private readonly cachingService: CachingService,
  ) {}

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

    const dataPool = await this.cachingService.getCache<SubgraphPoolBase[]>(CacheInfo.PoolData().key);
    if (!dataPool){
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
      if (new_route) {
        if (index != 0) {
          route.tokenOut = swap.assetOut;
          route.tokenOutAmount = swap.returnAmount;
          routes.push(route);
        }
        hop = {
          poolId: swap.poolId,
          tokenInAmount: swap.amount,
          tokenOutAmount: swap.returnAmount,
          tokenIn: swap.assetIn,
          tokenOut: swap.assetOut,
        };
        route = {
          hops: [hop],
          share: 0,
          tokenIn: swap.assetIn,
          tokenInAmount: swap.amount,
          tokenOut: "", // setup when finish
          tokenOutAmount: "",
        };
      } else {
        hop = {
          poolId: swap.poolId,
          tokenInAmount: route.hops.at(-1)?.tokenOutAmount,
          tokenOutAmount: swap.returnAmount,
          tokenIn: swap.assetIn,
          tokenOut: swap.assetOut,
        };
        route.hops.push(hop);
      }
      if (index == swapInfo.swaps.length - 1) {
        route.tokenOut = swap.assetOut;
        route.tokenOutAmount = swap.returnAmount;
        routes.push(route);
      }
    }
    swapInfo.routes = routes;
    return response.status(HttpStatus.OK).json(swapInfo);
  }
}
