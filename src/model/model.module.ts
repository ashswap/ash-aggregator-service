import { Module } from '@nestjs/common';
import { ModelService } from './model.service';
import { GraphQlModule } from 'src/common/graphql/graphql.module';
import { ApiConfigModule } from 'src/common/api-config/api.config.module';

@Module({
  imports: [
    GraphQlModule,
    ApiConfigModule,
  ],
  providers: [ModelService],
  exports: [ModelService],
})
export class ModelModule {}
