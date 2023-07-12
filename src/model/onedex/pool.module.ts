import { Module } from '@nestjs/common';
import { GraphQlModule } from 'src/common/graphql/graphql.module';
import { OneDexProvider } from './pool.provider';
import { CachingModule } from 'src/common/caching/caching.module';
import { MvxCommunicationModule } from 'src/common/mvx-communication/mvx.communication.module';

@Module({
    imports: [
        GraphQlModule,
        CachingModule,
        MvxCommunicationModule,
    ],
    providers: [
        OneDexProvider,
    ],
    exports: [
        OneDexProvider,
    ],
})
export class OneDexModule {}
