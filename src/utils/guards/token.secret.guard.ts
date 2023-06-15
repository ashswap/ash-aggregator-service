import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ApiConfigService } from 'src/common/api-config/api.config.service';

@Injectable()
export class tokenSecretGuard implements CanActivate {
  constructor(private readonly apiConfigService: ApiConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.apiConfigService.isTokenSecretEnabled()) {
      return true;
    }
    const request = context.switchToHttp().getRequest();

    const authToken = request.headers['authen-token'];
    if (!authToken) {
      return false;
    }

    const tokenSecret = this.apiConfigService.getTokenSecret();
    if (!tokenSecret) {
      return false;
    }

    return tokenSecret === authToken;
  }
}
