import { Injectable } from '@nestjs/common';
import { CustomApiNetworkProvider } from './custom.api.network.provider';

@Injectable()
export class MvxApiService {
  private apiMap: Record<string, CustomApiNetworkProvider> = {};

  getApiProvider(apiUrl: string): CustomApiNetworkProvider {
    const provider =
      this.apiMap[apiUrl] ||
      new CustomApiNetworkProvider(apiUrl, {
        timeout: 10000,
      });
    this.apiMap[apiUrl] = provider;
    return provider;
  }
}
