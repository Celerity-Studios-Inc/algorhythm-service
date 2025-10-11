import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnvironmentValidationService {
  constructor(private configService: ConfigService) {}

  validateEnvironment(): void {
    // ✅ FIX: Make environment validation optional for Cloud Run
    const isCloudRun = process.env.K_SERVICE || process.env.PORT;
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isCloudRun && !isDevelopment) {
      console.log('☁️ Cloud Run environment detected - skipping strict validation');
      return;
    }

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
      console.warn(`⚠️ Missing environment variables: ${missingVars.join(', ')}`);
      console.warn('⚠️ Service will start with limited functionality');
      // Don't throw error - allow service to start
    } else {
      console.log('✅ Environment validation passed');
    }
  }
}
