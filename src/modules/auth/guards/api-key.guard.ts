import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKeyFromHeader(request);
    
    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }

    // Get the expected API key from environment
    const expectedApiKey = this.configService.get<string>('REVIZ_API_KEY');
    
    if (!expectedApiKey) {
      throw new UnauthorizedException('API key not configured');
    }

    if (apiKey !== expectedApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Add user context for the request
    request.user = {
      userId: 'api-user',
      role: 'api',
      authMethod: 'api-key'
    };

    return true;
  }

  private extractApiKeyFromHeader(request: any): string | undefined {
    // Check for API key in various header formats
    const apiKey = request.headers['x-api-key'] || 
                   request.headers['api-key'] || 
                   request.headers['authorization']?.replace('Bearer ', '');
    
    return apiKey;
  }
}
