import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { ScoringModule } from '../scoring/scoring.module';
import { CachingModule } from '../caching/caching.module';
import { NnaIntegrationModule } from '../nna-integration/nna-integration.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { 
  CompatibilityScore, 
  CompatibilityScoreSchema 
} from '../../models/compatibility-score.schema';
import { 
  RecommendationCache, 
  RecommendationCacheSchema 
} from '../../models/recommendation-cache.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CompatibilityScore.name, schema: CompatibilityScoreSchema },
      { name: RecommendationCache.name, schema: RecommendationCacheSchema },
    ]),
    ScoringModule,
    CachingModule,
    NnaIntegrationModule,
    AnalyticsModule,
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
