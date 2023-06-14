import { Provider } from '@nestjs/common';
import { ApiConfigService } from 'src/common/api-config/api.config.service';
import {
  GraphqlInterceptor,
  SentryModuleAsyncOptions,
} from '@ntegral/nestjs-sentry';
import { ApiConfigModule } from 'src/common/api-config/api.config.module';
import { APP_INTERCEPTOR } from '@nestjs/core/constants';

export class DynamicModuleUtils {
  static getSentryModuleAsyncOptions(): SentryModuleAsyncOptions {
    return {
      imports: [ApiConfigModule],
      useFactory: async (apiConfigService: ApiConfigService) => {
        return {
          dsn: apiConfigService.getSentryDsn(),
          debug: true,
          logLevels: ['error', 'warn', 'debug'],
          environment:
            process.env.NODE_ENV !== 'production'
              ? 'development'
              : 'production',
        };
      },
      inject: [ApiConfigService],
    };
  }

  static getSentryService(): Provider {
    return {
      provide: APP_INTERCEPTOR,
      useFactory: () => new GraphqlInterceptor(),
    };
  }
}
