import { Module } from '@nestjs/common';
import { SeedingService } from './seeding.service';
import { ScoringModule } from '../scoring/scoring.module';
import { NnaIntegrationModule } from '../nna-integration/nna-integration.module';

@Module({
  imports: [ScoringModule, NnaIntegrationModule],
  providers: [SeedingService],
  exports: [SeedingService],
})
export class SeedingModule {}
