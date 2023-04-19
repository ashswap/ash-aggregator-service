// import { Locker } from '../utils/locker';
// import { Injectable } from '@nestjs/common';
// import { Cron } from '@nestjs/schedule';
// import { Logger } from '@nestjs/common';
// import { CI_ContractInfoService } from 'src/entities/ci-contract-info/ci-contract-info.service';
// import { ContractService } from '../common/contract/contract.service';
// import { PoolContractService } from '../common/contract/service/pool.contract.service';
// import { PM1_StablePoolMetricService } from 'src/entities/pm1-stable-pool-metric/pm1-stable-pool-metric.service';

// @Injectable()
// export class StablePoolMetricCron {
//   private contractType = 'stable-pool';
//   private logger: Logger;
//   constructor(
//     private readonly ciService: CI_ContractInfoService,
//     private readonly pm1Service: PM1_StablePoolMetricService,
//     private readonly contractService: ContractService,
//   ) {
//     this.logger = new Logger(StablePoolMetricCron.name);
//   }

//   @Cron('*/6 * * * * *')
//   async getStablePoolMetricAgent() {
//     await Locker.lock(
//       'Calculating stable pool metric',
//       async () => {
//         const curTs = Math.floor(Date.now() / 1000);
//         const pools = await this.ciService.get(this.contractType);
//         this.logger.log(
//           `Start agent stable pool metric with ${pools.length} pools to process`,
//         );
//         for (const pool of pools) {
//           this.logger.log(`Start process pool: ${pool.address}`);
//           const contract = await this.contractService.getContract(
//             pool,
//             PoolContractService,
//           );
//           const [priceImpactPerc12, priceImpactPerc13, priceImpactPerc23] =
//             await Promise.all([
//               contract.getPriceImpactPercentage(pool.token_1, pool.token_2),
//               pool.token_3
//                 ? contract.getPriceImpactPercentage(pool.token_1, pool.token_3)
//                 : Promise.resolve(0),
//               pool.token_3
//                 ? contract.getPriceImpactPercentage(pool.token_2, pool.token_3)
//                 : Promise.resolve(0),
//             ]);
//           this.logger.log(
//             `Calculated data: ${priceImpactPerc12} ${priceImpactPerc13} ${priceImpactPerc23}`,
//           );
//           this.pm1Service.insert(
//             pool.address,
//             priceImpactPerc12,
//             priceImpactPerc13,
//             priceImpactPerc23,
//             0, // TODO: token volume
//             0,
//             0,
//             0,
//             0,
//             0,
//             curTs,
//           );
//         }
//       },
//       true,
//     );
//   }

//   @Cron('0 * * * * *')
//   async cleanMetricData() {
//     await Locker.lock(
//       'Clean stable pool metric',
//       async () => {
//         this.pm1Service.clean();
//       },
//       true,
//     );
//   }
// }
