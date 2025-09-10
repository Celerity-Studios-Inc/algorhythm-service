import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScoringService } from './scoring.service';
import { RuleBasedScoringService } from './algorithms/rule-based-scoring.service';
import { FreshnessBoostService } from './algorithms/freshness-boost.service';
import { DiversityService } from './algorithms/diversity.service';
import { CompatibilityScore, CompatibilityScoreSchema } from '../../models/compatibility-score.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CompatibilityScore.name, schema: CompatibilityScoreSchema },
    ]),
  ],
  providers: [
    ScoringService,
    RuleBasedScoringService,
    FreshnessBoostService,
    DiversityService,
  ],
  exports: [ScoringService],
})
export class ScoringModule {}
