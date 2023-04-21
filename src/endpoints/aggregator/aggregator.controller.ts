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
    const swapInfo = await sor.getSwaps(
      sourceToken,
      destToken,
      SwapTypes.SwapExactIn,
      amount,
    )
    return response.status(HttpStatus.OK).json(swapInfo);
  }
}
