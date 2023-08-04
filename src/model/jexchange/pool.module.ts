import { Module } from '@nestjs/common';
import { GraphQlModule } from 'src/common/graphql/graphql.module';
import { JexchangeProvider } from './pool.provider';
import { CachingModule } from 'src/common/caching/caching.module';
import { MvxCommunicationModule } from 'src/common/mvx-communication/mvx.communication.module';

@Module({
    imports: [
        GraphQlModule,
        CachingModule,
        MvxCommunicationModule,
    ],
    providers: [
        JexchangeProvider,
    ],
    exports: [
        JexchangeProvider,
    ],
})
export class JexchangeModule {}
