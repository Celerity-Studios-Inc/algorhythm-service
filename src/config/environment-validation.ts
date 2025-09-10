import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnvironmentValidationService {
  constructor(private configService: ConfigService) {}

  validateEnvironment(): void {
    const requiredVars = [
      'MONGODB_URI',
      'REDIS_URL',
      'JWT_SECRET',
      'NNA_REGISTRY_BASE_URL',
      'NODE_ENV',
    ];

    const missingVars = requiredVars.filter(
      varName => !this.configService.get(varName)
    );

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}`
      );
    }

    console.log('✅ Environment validation passed');
  }
}
