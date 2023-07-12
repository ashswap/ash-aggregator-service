import { Module } from '@nestjs/common';
import { ApiConfigModule } from '../api-config/api.config.module';
import { MvxApiService as MvxApiService } from './mvx.api.service';

@Module({
  imports: [ApiConfigModule],
  providers: [MvxApiService],
  exports: [MvxApiService],
})
export class MvxCommunicationModule {}
