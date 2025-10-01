import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { DaemonService } from './daemon.service';
import { DaemonController } from './daemon.controller';
import { IndexBuilderService } from './index-builder.service';
import { ScoreComputationService } from './score-computation.service';
import { NnaIntegrationModule } from '../nna-integration/nna-integration.module';
import { CachingModule } from '../caching/caching.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ScoringModule } from '../scoring/scoring.module';
import { CompatibilityScoreSchema } from '../../models/compatibility-score.schema';
import { RecommendationCacheSchema } from '../../models/recommendation-cache.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: 'CompatibilityScore', schema: CompatibilityScoreSchema },
      { name: 'RecommendationCache', schema: RecommendationCacheSchema },
    ]),
    NnaIntegrationModule,
    CachingModule,
    AnalyticsModule,
    ScoringModule,
  ],
  controllers: [DaemonController],
  providers: [
    DaemonService,
    IndexBuilderService,
    ScoreComputationService,
  ],
  exports: [DaemonService],
})
export class DaemonModule {}
