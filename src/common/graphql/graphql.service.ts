import { Injectable, Logger } from "@nestjs/common";
import { GraphQLClient } from 'graphql-request';

@Injectable()
export class GraphQlService {
  private readonly logger = new Logger(GraphQlService.name);

  constructor() { }

  async getData(url: string, query: string, variables: any): Promise<any> {
    const graphqlClient = new GraphQLClient(url);

    try {
      const data = await graphqlClient.request(query, variables);

      if (!data) {
        return null;
      }

      return data;
    } catch (error) {
      this.logger.log(`Unexpected error when running graphql query`);
      this.logger.error(error);

      return null;
    }
  }
}
