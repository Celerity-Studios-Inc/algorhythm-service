import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { NnaIntegrationModule } from '../nna-integration/nna-integration.module';
import { CachingModule } from '../caching/caching.module';

@Module({
  imports: [NnaIntegrationModule, CachingModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
