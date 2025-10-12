import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NnaRegistryService } from './nna-registry.service';
import { OptimizedNnaRegistryService } from './optimized-nna-registry.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { CachingModule } from '../caching/caching.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000, // 10 second timeout
      maxRedirects: 5,
    }),
    CachingModule, // 🔧 FIX: Always import CachingModule to prevent dependency injection failure
  ],
  providers: [NnaRegistryService, OptimizedNnaRegistryService, CircuitBreakerService],
  exports: [NnaRegistryService, OptimizedNnaRegistryService, CircuitBreakerService],
})
export class NnaIntegrationModule {}
// Force deployment - conditional import fix
