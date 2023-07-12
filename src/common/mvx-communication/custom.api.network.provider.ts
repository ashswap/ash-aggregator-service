import {
  ApiNetworkProvider,
  TransactionOnNetwork,
} from '@multiversx/sdk-network-providers/out';
import { buildUrlParams } from 'src/utils/url';
import { TransactionListQuery } from './entities/Query';
import * as Sentry from '@sentry/browser';

export class CustomApiNetworkProvider extends ApiNetworkProvider {
  async getTokenBalance(wallet: string, tokenId: string) {
    return await this.doGetGeneric(`accounts/${wallet}/tokens/${tokenId}`)
      .then((res: { balance: string }) => res?.balance || '0')
      .catch((err) => {
        Sentry.captureException(err, {
          extra: {
            wallet: wallet,
            tokenId: tokenId,
          },
        });
        return '0';
      });
  }

  async getLatestTimestampOfWallet(wallet: string): Promise<number> {
    // const a = await this.doGetGeneric(`accounts/${wallet}/transfers?size=1`);
    // console.log(a);
    // console.log(a[0].timestamp);
    // return a[0].timestamp;
    return await this.doGetGeneric(`accounts/${wallet}/transfers?size=1`)
      .then((res: { timestamp: number }[]) => res[0]?.timestamp || -1)
      .catch((err) => {
        Sentry.captureException(err, {
          extra: {
            wallet: wallet,
          },
        });
        return -1;
      });
  }

  async getAccountData(wallet: string): Promise<{ shard: string }> {
    return await this.doGetGeneric(`accounts/${wallet}`);
  }

  async getTransactions(
    filter?: TransactionListQuery,
  ): Promise<TransactionOnNetwork[]> {
    return await this.doGetGeneric(
      `transactions/${buildUrlParams(filter || {})}`,
    )
      .then((txs) =>
        txs.map((tx: any) =>
          TransactionOnNetwork.fromApiHttpResponse(tx.txHash, tx),
        ),
      )
      .catch((err) => {
        Sentry.captureException(err, {
          extra: {
            filter: filter,
          },
        });
        return [];
      });
  }

  async getTransactionsRaw(filter?: TransactionListQuery): Promise<any[]> {
    return await this.doGetGeneric(
      `transactions/${buildUrlParams(filter || {})}`,
    ).catch((err) => {
      Sentry.captureException(err, {
        extra: {
          filter: filter,
        },
      });
      return [];
    });
  }
}
