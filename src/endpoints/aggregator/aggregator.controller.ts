import { Response } from 'express';
import {
  Controller,
  Get,
  HttpStatus,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { AggregatorService } from './aggregator.service';

@Controller()
export class AggregatorController {
  constructor(private readonly healthCheckService: AggregatorService) {}

  @Get('/healthcheck')
  @ApiOperation({
    summary: 'Health check',
    description: "Returns 'hello', used for performing health checks",
  })
  async getHealthCheck(
    @Query('deployment') deployment: string,
    @Res() response: Response,
  ) {
    if (!deployment) {
      return response.status(HttpStatus.OK).json();
    }

    let statusCode = await this.healthCheckService.getHealthCache(deployment);
    if (!statusCode) {
      statusCode = HttpStatus.NOT_FOUND;
    }

    return response.status(statusCode).json();
  }
}
