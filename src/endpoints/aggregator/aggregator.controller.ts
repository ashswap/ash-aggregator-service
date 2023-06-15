import { Response } from 'express';
import { Controller, Get, HttpStatus, Query, Res } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { AggregatorProvider } from 'src/common/aggregator/aggregator.provider';
import {
  PoolFilter,
  SubgraphPoolBase,
  SubgraphToken,
  SwapTypes,
  bnum,
} from '@trancport/aggregator';
import { CachingService } from 'src/common/caching/caching.service';
import { CacheInfo } from 'src/utils/cache.info';
import { AggregatorResponseDto, Hop, Route, TokenId } from './aggregator.dto';
import { BigNumber, formatFixed } from 'src/utils/bignumber';
import { POOL_CONFIGS, TOKEN_CONFIG, TokenConfig } from 'pool_config/configuration';
import { formatTokenIdentifier } from 'src/utils/token';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';

@Controller()
export class AggregatorController {
  constructor(
    private readonly aggregatorProvider: AggregatorProvider,
    private readonly cachingService: CachingService,
    @InjectSentry() private readonly sentryService: SentryService
  ) {}

  private findTokenDecimal(
    dataToken: [SubgraphToken],
    tokenId: string,
  ): number {
    return dataToken.find((token) => token.address == tokenId)?.decimals ?? 0;
  }

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

    const dataPool = await this.cachingService.getCache<SubgraphPoolBase[]>(
      CacheInfo.AggregatorPoolData().key,
    );
    if (!dataPool) {
      this.sentryService.error('Pool data is not set');
      return response
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json('Data is not set');
    }

    const sor = await this.aggregatorProvider.getSOR();
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
        maxPools: 4,
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
      const new_route = swap.amount == '0' ? false : true;
      const swapAmount = formatFixed(
        swap.amount,
        TOKEN_CONFIG.get(swap.assetIn ?? '')?.decimal ?? 0,
      );
      const returnAmount = formatFixed(
        swap.returnAmount ?? 0,
        TOKEN_CONFIG.get(swap.assetOut ?? '')?.decimal ?? 0,
      );

      const poolConfig = POOL_CONFIGS.find(
        (poolConfig) => poolConfig.address == swap.poolId,
      );

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
      TOKEN_CONFIG.get(swapInfo.tokenIn ?? '')?.decimal ?? 0,
    );
    const returnAmount = formatFixed(
      swapInfo.returnAmount,
      TOKEN_CONFIG.get(swapInfo.tokenOut ?? '')?.decimal ?? 0,
    );
    const returnAmountWithoutFee = formatFixed(
      swapInfo.returnAmountWithoutSwapFees,
      TOKEN_CONFIG.get(swapInfo.tokenOut ?? '')?.decimal ?? 0,
    );

    const ONE = BigNumber.from(1);
    const effectivePrice = bnum(swapAmount).div(returnAmount);
    const effectivePriceReversed = bnum(returnAmount).div(swapAmount);
    const priceImpact = BigNumber.max(ONE.sub(bnum(swapInfo.marketSp).div(effectivePrice)),0);

    swapInfo.swapAmount = swapAmount;
    swapInfo.returnAmount = returnAmount;
    swapInfo.returnAmountWithoutSwapFees = returnAmountWithoutFee;
    swapInfo.tokenAddresses = swapInfo.tokenAddresses.map((token) => formatTokenIdentifier(token));
    const agResponse: AggregatorResponseDto = {
      ...swapInfo,
      effectivePrice: effectivePrice.toNumber(),
      effectivePriceReversed: effectivePriceReversed.toNumber(),
      priceImpact: priceImpact.toNumber(),
      routes,
      tokenIn: formatTokenIdentifier(swapInfo.tokenIn),
      tokenOut: formatTokenIdentifier(swapInfo.tokenOut),
      swaps: [
        ...swapInfo.swaps.map((s) => {
          const exchangeConfig = this.aggregatorProvider.getExchangeConfig(
            s.poolId,
            formatTokenIdentifier(s.assetOut || ''),
          );
          return {
            ...s,
            assetIn: formatTokenIdentifier(s.assetIn || ''),
            assetOut: formatTokenIdentifier(s.assetOut || ''),
            ...exchangeConfig,
          };
        }),
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

  @Get('/pools')
  @ApiOperation({
    summary: 'Pool',
    description: 'Returns supporting pool',
  })
  async supportPool(
    @Res() response: Response,
  ) {
    const dataPool = await this.cachingService.getCache<SubgraphPoolBase[]>(
      CacheInfo.AggregatorPoolData().key,
    );
    if (!dataPool) {
      return response
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json('Data is not set');
    }
    return response.status(HttpStatus.OK).json(dataPool);
  }

  @Get('/tokens')
  @ApiOperation({
    summary: 'Token',
    description: 'Returns supporting tokens',
  })
  async supportToken(
    @Res() response: Response,
  ) {
    let tokenConfig = await this.cachingService.getCache<TokenConfig[]>(
      CacheInfo.AggregatorTokenData().key,
    );
    tokenConfig = [...TOKEN_CONFIG.values()];
    for (const token of tokenConfig) {
      token.id = formatTokenIdentifier(token.id);
    }
    this.cachingService.setCache<TokenConfig[]>(
      CacheInfo.AggregatorTokenData().key,
      tokenConfig,
      CacheInfo.AggregatorTokenData().ttl,
    );
    return response.status(HttpStatus.OK).json(tokenConfig);
  }
}
