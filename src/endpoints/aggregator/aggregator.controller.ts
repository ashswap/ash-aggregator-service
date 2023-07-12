import { Response } from 'express';
import { Controller, Get, HttpStatus, Query, Res, UseGuards } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { AggregatorProvider } from 'src/common/aggregator/aggregator.provider';
import {
  PoolFilter,
  SubgraphPoolBase,
  SwapTypes,
  SwapV2,
  bnum,
} from '@trancport/aggregator';
import { CachingService } from 'src/common/caching/caching.service';
import { CacheInfo } from 'src/utils/cache.info';
import { AggregatorResponseDto, Hop, Route, TokenId } from './aggregator.dto';
import { BigNumber, formatFixed } from 'src/utils/bignumber';
import { formatTokenIdentifier } from 'src/utils/token';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { tokenSecretGuard } from 'src/utils/guards/token.secret.guard';
import { ModelService } from 'src/model/model.service';

@Controller()
export class AggregatorController {
  constructor(
    private readonly aggregatorProvider: AggregatorProvider,
    private readonly cachingService: CachingService,
    private readonly modelService: ModelService,
    @InjectSentry() private readonly sentryService: SentryService
  ) {}

  private async getExchangeConfig(s: SwapV2): Promise<SwapV2 & { functionName: string; arguments: string[]; }> {
    const exchangeProtocol = await this.modelService.getProviderFromAddress(
      s.poolId
    );
    if (!exchangeProtocol) {
      this.sentryService.error('Exchange protocol is not set');
      throw new Error('Exchange protocol is not set');
    }
    const assetIn = formatTokenIdentifier(s.assetIn || '');
    const assetOut = formatTokenIdentifier(s.assetOut || '');
    const exchangeConfig = await exchangeProtocol.getExecutionInput(s.poolId, assetIn, assetOut);
    if (!exchangeConfig) {
      this.sentryService.error('Exchange config is not set');
      throw new Error('Exchange config is not set');
    }
    return {
      ...s,
      assetIn: assetIn,
      assetOut: assetOut,
      ...exchangeConfig,
    };
  }

  private async getPoolData() {
    const keyStr = CacheInfo.AggregatorPoolData().key;
    const keys = await this.cachingService.getKeys(keyStr);
    const dataPools = [];
    if (keys.length > 0) {
      for (const key of keys) {
        const dataPool = await this.cachingService.getCache<SubgraphPoolBase[]>(
          key,
        );
        if (dataPool)
          dataPools.push(...dataPool);
      }
    }
    return dataPools;
  }

  @UseGuards(tokenSecretGuard)
  @Get('/aggregate')
  @ApiOperation({
    summary: 'Aggregate',
    description: 'Returns paths',
  })
  async aggregate(
    @Query('from') sourceToken: string,
    @Query('to') destToken: string,
    @Query('amount') amount: number,
    @Res() response: Response,
  ) {
    if (!sourceToken || !destToken || !amount || sourceToken === destToken) {
      return response.status(HttpStatus.BAD_REQUEST).json();
    }

    const dataPool = await this.getPoolData();
    if (!dataPool) {
      this.sentryService.error('Pool data is not set');
      return response
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json('Data is not set');
    }

    const sor = this.aggregatorProvider.getSOR();
    sor.setPools(dataPool);
    const swapInfo = await sor.getSwaps(
      sourceToken,
      destToken,
      SwapTypes.SwapExactIn,
      amount,
      {
        gasPrice: BigNumber.from(0),
        swapGas: BigNumber.from(0),
        poolTypeFilter: PoolFilter.All,
        maxPools: 5,
        timestamp: Math.floor(Date.now() / 1000),
        forceRefresh: true,
      },
    );
    // build routes
    const routes: Route[] = [];
    let route: Route = {
      hops: [{ poolId: '' }],
      share: 0,
    };
    let hop: Hop;
    for (const [index, swap] of swapInfo.swaps.entries()) {
      const poolConfig = this.modelService.getPoolConfigByID(swap.poolId);
      const new_route = swap.amount == '0' ? false : true;
      const swapAmount = formatFixed(
        swap.amount,
        this.modelService.getTokenConfigByID(swap.assetIn ?? '')?.decimal ?? 0,
      );
      const returnAmount = formatFixed(
        swap.returnAmount ?? 0,
        this.modelService.getTokenConfigByID(swap.assetOut ?? '')?.decimal ?? 0,
      );
      swap.poolId = poolConfig?.address ?? "";
      hop = {
        poolId: swap.poolId,
        pool: {
          allTokens: poolConfig?.tokens.map<TokenId>((tokenConfig) => {
            return {
              address: formatTokenIdentifier(tokenConfig.id),
              decimal: tokenConfig.decimal,
            };
          }),
          type: poolConfig?.type,
        },
        tokenInAmount: swapAmount,
        tokenOutAmount: returnAmount,
        tokenIn: formatTokenIdentifier(swap.assetIn || ''),
        tokenOut: formatTokenIdentifier(swap.assetOut || ''),
      };

      if (new_route) {
        if (index != 0) {
          route.tokenOut = formatTokenIdentifier(
            route.hops.at(-1)?.tokenOut || '',
          );
          route.tokenOutAmount = route.hops.at(-1)?.tokenOutAmount;
          routes.push(route);
        }
        route = {
          hops: [hop],
          share: 0,
          tokenIn: formatTokenIdentifier(swap.assetIn || ''),
          tokenInAmount: swapAmount,
          tokenOut: '', // setup when finish
          tokenOutAmount: '',
        };
      } else {
        hop.tokenInAmount = route.hops.at(-1)?.tokenOutAmount;
        route.hops.push(hop);
      }
      if (index == swapInfo.swaps.length - 1) {
        route.tokenOut = formatTokenIdentifier(
          route.hops.at(-1)?.tokenOut || '',
        );
        route.tokenOutAmount = route.hops.at(-1)?.tokenOutAmount;
        routes.push(route);
      }
    }

    const swapAmount = formatFixed(
      swapInfo.swapAmount,
      this.modelService.getTokenConfigByID(swapInfo.tokenIn ?? '')?.decimal ?? 0,
    );
    const returnAmount = formatFixed(
      swapInfo.returnAmount,
      this.modelService.getTokenConfigByID(swapInfo.tokenOut ?? '')?.decimal ?? 0,
    );
    const returnAmountWithoutFee = formatFixed(
      swapInfo.returnAmountWithoutSwapFees,
      this.modelService.getTokenConfigByID(swapInfo.tokenOut ?? '')?.decimal ?? 0,
    );

    const ONE = BigNumber.from(1);
    const effectivePrice = bnum(swapAmount).div(returnAmount);
    const effectivePriceReversed = bnum(returnAmount).div(swapAmount);
    const priceImpact = BigNumber.max(ONE.sub(bnum(swapInfo.marketSp).div(effectivePrice)),0);

    swapInfo.swapAmount = swapAmount;
    swapInfo.returnAmount = returnAmount;
    swapInfo.returnAmountWithoutSwapFees = returnAmountWithoutFee;
    swapInfo.tokenAddresses = swapInfo.tokenAddresses.map((token) => formatTokenIdentifier(token));
    
    const swaps = [];

    for (const swap of swapInfo.swaps) {
      const swapInfo = await this.getExchangeConfig(swap);
      swaps.push(swapInfo);
    }

    const agResponse: AggregatorResponseDto = {
      ...swapInfo,
      effectivePrice: effectivePrice.toNumber(),
      effectivePriceReversed: effectivePriceReversed.toNumber(),
      priceImpact: priceImpact.toNumber(),
      routes,
      tokenIn: formatTokenIdentifier(swapInfo.tokenIn),
      tokenOut: formatTokenIdentifier(swapInfo.tokenOut),
      swaps: [
        ...swaps,
      ],
    };
    if (priceImpact.lte(0)) {
      this.sentryService.debug('Context data', JSON.stringify(
        {
          sourceToken: sourceToken,
          destToken: destToken,
          amount: amount,
          swapInfo: agResponse,
          pools: dataPool,
        }
      ), true);
      this.sentryService.error('Price impact is negative');
    }
    return response.status(HttpStatus.OK).json(agResponse);
  }

  @UseGuards(tokenSecretGuard)
  @Get('/pools')
  @ApiOperation({
    summary: 'Pool',
    description: 'Returns supporting pool',
  })
  async supportPool(
    @Res() response: Response,
  ) {
    const dataPool = await this.getPoolData();
    if (!dataPool) {
      return response
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json('Data is not set');
    }
    return response.status(HttpStatus.OK).json(dataPool);
  }

  @UseGuards(tokenSecretGuard)
  @Get('/tokens')
  @ApiOperation({
    summary: 'Token',
    description: 'Returns supporting tokens',
  })
  async supportToken(
    @Res() response: Response,
  ) {
    const tokenConfig = this.modelService.getTokenConfigs();
    for (const token of tokenConfig) {
      token.id = formatTokenIdentifier(token.id);
    }
    return response.status(HttpStatus.OK).json(tokenConfig);
  }
}
