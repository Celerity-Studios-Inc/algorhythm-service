import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NnaRegistryService } from './nna-registry.service';
import { OptimizedNnaRegistryService } from './optimized-nna-registry.service';
import { CachingModule } from '../caching/caching.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000, // 10 second timeout
      maxRedirects: 5,
    }),
    // 🔧 FIX: Make CachingModule optional to prevent dependency injection failure
    ...(process.env.REDIS_URL ? [CachingModule] : []),
  ],
  providers: [NnaRegistryService, OptimizedNnaRegistryService],
  exports: [NnaRegistryService, OptimizedNnaRegistryService],
})
export class NnaIntegrationModule {}
