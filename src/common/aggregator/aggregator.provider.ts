import { Injectable } from '@nestjs/common';
import { SOR } from '@trancport/aggregator';

@Injectable()
export class AggregatorProvider {
  private sor: SOR;

  constructor() {
    this.sor = new SOR();
  }

  getSOR(): SOR {
    return this.sor;
  }
}