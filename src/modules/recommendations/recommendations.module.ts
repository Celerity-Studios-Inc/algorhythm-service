import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { InstantRecommendationsService } from './instant-recommendations.service';
import { ReVizCompleteExperienceService } from './reviz-complete-experience.service';
import { ReVizCompleteExperienceController } from './reviz-complete-experience.controller';
import { ReVizCompleteExperienceProductionService } from './reviz-complete-experience-production.service';
import { ReVizCompleteExperienceProductionController } from './reviz-complete-experience-production.controller';
import { ReVizCompleteExperienceEnhancedService } from './reviz-complete-experience-enhanced.service';
import { ReVizCompleteExperienceEnhancedController } from './reviz-complete-experience-enhanced.controller';
import { CacheWarmingService } from './cache-warming.service';
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
import { Asset, AssetSchema } from '../../models/asset.schema';
import { Composite, CompositeSchema } from '../../models/composite.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CompatibilityScore.name, schema: CompatibilityScoreSchema },
      { name: RecommendationCache.name, schema: RecommendationCacheSchema },
      { name: Asset.name, schema: AssetSchema },
      { name: Composite.name, schema: CompositeSchema },
    ]),
    ScoringModule,
    CachingModule,
    NnaIntegrationModule,
    AnalyticsModule,
  ],
  controllers: [
    RecommendationsController, 
    ReVizCompleteExperienceController,
    ReVizCompleteExperienceProductionController,
    ReVizCompleteExperienceEnhancedController
  ],
  providers: [
    RecommendationsService, 
    InstantRecommendationsService, 
    ReVizCompleteExperienceService,
    ReVizCompleteExperienceProductionService,
    ReVizCompleteExperienceEnhancedService,
    CacheWarmingService
  ],
  exports: [
    RecommendationsService, 
    InstantRecommendationsService, 
    ReVizCompleteExperienceService,
    ReVizCompleteExperienceProductionService,
    ReVizCompleteExperienceEnhancedService,
    CacheWarmingService
  ],
})
export class RecommendationsModule {}
