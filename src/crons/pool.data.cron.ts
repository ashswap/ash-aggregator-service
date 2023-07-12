import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';
import { ModelService } from 'src/model/model.service';
import { CronJob } from 'cron';

@Injectable()
export class PoolDataCron {
  private logger: Logger;
  constructor(
    private readonly modelService: ModelService,
    private schedulerRegistry: SchedulerRegistry
  ) {
    this.logger = new Logger(PoolDataCron.name);
    this.addCronJob();
  }

  addCronJob() {
    for (const protocol of this.modelService.getProviderList()) {
      const job = new CronJob(`*/6 * * * * *`, () => {
        protocol.fetchData();
      });
  
      this.schedulerRegistry.addCronJob(protocol.getProtocolName(), job);
      job.start();
      this.logger.log(
        `job ${protocol.getProtocolName()} added!`,
      );
    }
  }
}
