import {
  ContractQueryResponse,
  ProxyNetworkProvider,
} from '@multiversx/sdk-network-providers/out';
import {
  Interaction,
  ResultsParser,
  SmartContract,
  TypedOutcomeBundle,
} from '@multiversx/sdk-core/out';
import { SentryService } from '@ntegral/nestjs-sentry';

export class AbiService {
  private readonly proxies: Record<string, ProxyNetworkProvider> = {};
  private readonly gatewayUrls: string[];
  private readonly parser: ResultsParser = new ResultsParser();

  constructor(
    gatewayUrls: string[],
  ) {
    this.gatewayUrls = gatewayUrls;
  }

  getGatewayUrl() {
    const url = this.gatewayUrls[0];
    if (!url) {
      throw new Error('No gateway url present');
    }
    return url;
  }

  get proxy(): ProxyNetworkProvider {
    const url = this.getGatewayUrl();
    const proxy =
      this.proxies[url] || new ProxyNetworkProvider(url, { timeout: 10_000 });
    this.proxies[url] = proxy;
    return proxy;
  }

  async runQuery(
    contract: SmartContract,
    interaction: Interaction,
  ): Promise<TypedOutcomeBundle> {
    try {
      const queryResponse: ContractQueryResponse = await this.proxy.queryContract(
        interaction.buildQuery(),
      );

      return this.parser.parseQueryResponse(
        queryResponse,
        interaction.getEndpoint(),
      );
    } catch (error) {
      SentryService.SentryServiceInstance()
        .instance()
        .captureException(error, {
          extra: {
            function: interaction.buildQuery().func,
            address: contract.getAddress().bech32(),
          },
        });
      throw error;
    }
  }
}
